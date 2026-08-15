const env = require('../config/env');

const userRequests = new Map();
const WINDOW_MS = 60 * 1000;
const ADMIN_MULTIPLIER = 3;

async function telegramRateLimit(ctx, next) {
  const telegramId = String(ctx.from?.id || '');

  if (!telegramId) {
    return next();
  }

  const isAdmin = env.ADMIN_IDS.includes(telegramId);
  const limit = env.RATE_LIMIT * (isAdmin ? ADMIN_MULTIPLIER : 1);
  const now = Date.now();

  const timestamps = (userRequests.get(telegramId) || []).filter(
    (timestamp) => now - timestamp < WINDOW_MS
  );

  if (timestamps.length >= limit) {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery('⚠️ Rate limit exceeded. Please wait.', true);
    } else {
      await ctx.reply('⚠️ Too many requests. Please wait a minute.');
    }
    return;
  }

  timestamps.push(now);
  userRequests.set(telegramId, timestamps);

  return next();
}

module.exports = { telegramRateLimit };
