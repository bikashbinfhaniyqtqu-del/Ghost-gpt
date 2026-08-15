const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');
const { setStatus } = require('../utils/serviceStatus');

const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 10;

async function connectWithRetry(retries = MAX_RETRIES) {
  try {
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    logger.info('MongoDB connected');
    setStatus('database', 'online');
  } catch (err) {
    setStatus('database', 'degraded');
    const attempt = MAX_RETRIES - retries + 1;
    logger.error('MongoDB connection failed', {
      error: err.message,
      attempt,
    });

    if (retries <= 0) {
      throw err;
    }

    const delay = RETRY_DELAY_MS * attempt;
    logger.warn(`Retrying MongoDB connection in ${delay}ms`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return connectWithRetry(retries - 1);
  }
}

module.exports = { connectWithRetry };
