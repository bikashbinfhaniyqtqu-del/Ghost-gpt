const env = require('../config/env');

function webhookAuth(req, res, next) {
  const token = req.headers['x-telegram-bot-api-secret-token'];

  if (!token || token !== env.TELEGRAM_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

module.exports = { webhookAuth };
