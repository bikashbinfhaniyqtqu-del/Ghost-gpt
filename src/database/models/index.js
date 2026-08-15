const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    telegramId: { type: String, required: true, unique: true, index: true },
    username: String,
    firstName: String,
    lastName: String,
    isAdmin: { type: Boolean, default: false },
    banned: { type: Boolean, default: false },
    banReason: { type: String, default: '' },
    settings: { type: Schema.Types.Mixed, default: {} },
    stats: {
      totalMessages: { type: Number, default: 0 },
      aiRequests: { type: Number, default: 0 },
      webSearches: { type: Number, default: 0 },
      newsSearches: { type: Number, default: 0 },
      memoryOps: { type: Number, default: 0 },
      errors: { type: Number, default: 0 },
    },
    lastActive: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const messageSchema = new Schema({
  userId: { type: String, required: true, index: true },
  chatId: String,
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  services: {
    useMemory: Boolean,
    useWeb: Boolean,
    useNews: Boolean,
    useAI: Boolean,
  },
  timestamp: { type: Date, default: Date.now },
});

const conversationSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    chatId: String,
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant', 'system'] },
        content: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const settingSchema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: Schema.Types.Mixed, default: '' },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: String,
});

const usageSchema = new Schema({
  userId: { type: String, required: true, index: true },
  date: { type: String, required: true },
  aiRequests: { type: Number, default: 0 },
  webSearches: { type: Number, default: 0 },
  newsSearches: { type: Number, default: 0 },
  memoryOps: { type: Number, default: 0 },
});

usageSchema.index({ userId: 1, date: 1 }, { unique: true });

const banSchema = new Schema({
  telegramId: { type: String, required: true, unique: true, index: true },
  reason: String,
  bannedAt: { type: Date, default: Date.now },
});

const logSchema = new Schema({
  level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
  message: { type: String, required: true },
  meta: Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
});

module.exports = {
  User: mongoose.model('User', userSchema),
  Message: mongoose.model('Message', messageSchema),
  Conversation: mongoose.model('Conversation', conversationSchema),
  Setting: mongoose.model('Setting', settingSchema),
  Usage: mongoose.model('Usage', usageSchema),
  Ban: mongoose.model('Ban', banSchema),
  Log: mongoose.model('Log', logSchema),
};
