require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Telegraf } = require('telegraf');

const env = require('./config/env');
const { connectWithRetry } = require('./database/mongodb');
const { setupUserBot } = require('./handlers/userHandlers');
const { setupAdminBot } = require('./handlers/adminHandlers');
const {
  registerUserCallbacks,
  registerAdminCallbacks,
} = require('./handlers/callbackHandlers');
const { webhookAuth } = require('./middleware/webhookAuth');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { setStatus } = require('./utils/serviceStatus');
const { Log } = require('./database/models');

const app = express();
const PORT = env.PORT;
const HOST = '0.0.0.0';

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.send('Ghost GPT');
});

const userBot = new Telegraf(env.USER_BOT_TOKEN);
const adminBot = new Telegraf(env.ADMIN_BOT_TOKEN);

setupUserBot(userBot);
setupAdminBot(adminBot, userBot);

registerUserCallbacks(userBot);
registerAdminCallbacks(adminBot, userBot);

app.post(
  '/telegram/webhook/user',
  webhookAuth,
  userBot.webhookCallback('/telegram/webhook/user')
);

app.post(
  '/telegram/webhook/admin',
  webhookAuth,
  adminBot.webhookCallback('/telegram/webhook/admin')
);

app.use(errorHandler);

async function setWebhooks() {
  try {
    await userBot.telegram.setWebhook(
      `${env.BASE_URL}/telegram/webhook/user`,
      {
        secret_token: env.TELEGRAM_WEBHOOK_SECRET,
        drop_pending_updates: true,
      }
    );
    await adminBot.telegram.setWebhook(
      `${env.BASE_URL}/telegram/webhook/admin`,
      {
        secret_token: env.TELEGRAM_WEBHOOK_SECRET,
        drop_pending_updates: true,
      }
    );
    setStatus('telegram', 'online');
    logger.info('Telegram webhooks configured');
  } catch (err) {
    setStatus('telegram', 'degraded');
    logger.error('Telegram webhook setup failed', { error: err.message });
  }
}

async function start() {
  try {
    await connectWithRetry();

    logger.setLogWriter(async (entry) => {
      try {
        await Log.create(entry);
      } catch (_) {
        // Ignore DB logging errors
      }
    });

    const server = app.listen(PORT, HOST, () => {
      logger.info(`Ghost GPT listening on ${HOST}:${PORT}`);
    });

    await setWebhooks();

    let shuttingDown = false;

    async function gracefulShutdown(signal) {
      if (shuttingDown) return;
      shuttingDown = true;
      logger.info(`${signal} received, shutting down gracefully`);

      server.close(async () => {
        try {
          await userBot.telegram.deleteWebhook();
          await adminBot.telegram.deleteWebhook();
        } catch (_) {
          // Ignore webhook deletion errors
        }

        const mongoose = require('mongoose');
        await mongoose.disconnect();
        logger.info('Shutdown complete');
        process.exit(0);
      });

      setTimeout(() => {
        logger.warn('Forced shutdown after timeout');
        process.exit(1);
      }, 15000).unref();
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start application', { error: err.message });
    process.exit(1);
  }
}

start();
