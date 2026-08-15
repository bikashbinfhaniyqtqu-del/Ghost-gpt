const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function parseAdminIds(str) {
  if (!str) return [];
  return str.split(',').map((s) => s.trim()).filter(Boolean);
}

const required = [
  'USER_BOT_TOKEN',
  'ADMIN_BOT_TOKEN',
  'TELEGRAM_WEBHOOK_SECRET',
  'ADMIN_IDS',
  'MONGO_URI',
  'AI_API_KEY',
  'BASE_URL',
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Required configuration is missing: ${missing.join(', ')}`);
  process.exit(1);
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: process.env.PORT || 10000,
  BASE_URL: process.env.BASE_URL.replace(/\/$/, ''),
  USER_BOT_TOKEN: process.env.USER_BOT_TOKEN,
  ADMIN_BOT_TOKEN: process.env.ADMIN_BOT_TOKEN,
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
  ADMIN_IDS: parseAdminIds(process.env.ADMIN_IDS),
  MONGO_URI: process.env.MONGO_URI,
  MEM0_API_KEY: process.env.MEM0_API_KEY || '',
  AI_API_KEY: process.env.AI_API_KEY,
  AI_MODEL: process.env.AI_MODEL || 'gpt-4o-mini',
  AI_BASE_URL: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
  TAVILY_API_KEY: process.env.TAVILY_API_KEY || '',
  NEWSDATA_API_KEY: process.env.NEWSDATA_API_KEY || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',
  MAX_HISTORY_MESSAGES: parseInt(process.env.MAX_HISTORY_MESSAGES || '12', 10),
  RATE_LIMIT: parseInt(process.env.RATE_LIMIT || '20', 10),
};
