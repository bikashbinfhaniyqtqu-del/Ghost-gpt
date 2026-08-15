const env = require('../config/env');
const {
  User,
  Message,
  Usage,
  Setting,
  Log,
  Ban,
  Conversation,
} = require('../database/models');
const {
  adminMenuKeyboard,
  systemPromptKeyboard,
  confirmKeyboard,
  broadcastConfirmKeyboard,
  maintenanceKeyboard,
} = require('../keyboards/adminKeyboard');
const logger = require('../utils/logger');
const { deleteAllMemories } = require('../memory/memoryService');

const adminPending = new Map();

function sendAdminMenu(ctx) {
  return ctx.reply('👑 Ghost GPT Admin', { reply_markup: adminMenuKeyboard });
}

async function getMaintenanceMode() {
  const setting = await Setting.findOne({ key: 'maintenance' });
  return Boolean(setting?.value);
}

async function setMaintenanceMode(enabled) {
  await Setting.updateOne(
    { key: 'maintenance' },
    { value: enabled, updatedAt: new Date(), updatedBy: 'admin' },
    { upsert: true }
  );
}

async function getSystemPrompt() {
  const setting = await Setting.findOne({ key: 'systemPrompt' });
  return setting?.value || '';
}

async function setSystemPrompt(prompt, updatedBy) {
  await Setting.updateOne(
    { key: 'systemPrompt' },
    { value: prompt, updatedAt: new Date(), updatedBy },
    { upsert: true }
  );
}

async function showUserProfile(ctx, user) {
  const banButton = user.banned
    ? { text: '🟢 Unban', callback_data: `user_action:${user.telegramId}:unban` }
    : { text: '🔴 Ban', callback_data: `user_action:${user.telegramId}:ban` };

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🧠 Clear Memory', callback_data: `user_action:${user.telegramId}:clearmemory` },
        { text: '🗑️ Reset Conversation', callback_data: `user_action:${user.telegramId}:resetconversation` },
      ],
      [banButton],
      [{ text: '📊 Usage Stats', callback_data: `user_action:${user.telegramId}:usage` }],
      [{ text: '🔙 Back', callback_data: 'admin_users' }],
    ],
  };

  const text = `👤 User Profile\n\n` +
    `ID: ${user.telegramId}\n` +
    `Name: ${user.firstName || ''} ${user.lastName || ''}\n` +
    `Username: @${user.username || 'N/A'}\n` +
    `Banned: ${user.banned ? 'Yes' : 'No'}\n` +
    `Total Messages: ${user.stats.totalMessages || 0}\n` +
    `AI Requests: ${user.stats.aiRequests || 0}\n` +
    `Web Searches: ${user.stats.webSearches || 0}\n` +
    `News Searches: ${user.stats.newsSearches || 0}\n` +
    `Memory Ops: ${user.stats.memoryOps || 0}\n` +
    `Errors: ${user.stats.errors || 0}\n` +
    `Joined: ${user.createdAt ? new Date(user.createdAt).toISOString() : 'N/A'}\n` +
    `Last Active: ${user.lastActive ? new Date(user.lastActive).toISOString() : 'N/A'}`;

  return ctx.reply(text, { reply_markup: keyboard });
}

async function findUser(query) {
  const trimmed = query.trim().replace('@', '');

  const user = await User.findOne({
    $or: [
      { telegramId: trimmed },
      { username: trimmed },
      { firstName: trimmed },
      { lastName: trimmed },
    ],
  });

  return user;
}

function setupAdminBot(bot, userBot) {
  bot.use(async (ctx, next) => {
    const telegramId = String(ctx.from?.id || '');

    if (!telegramId || !env.ADMIN_IDS.includes(telegramId)) {
      if (ctx.updateType === 'callback_query') {
        await ctx.answerCbQuery('Unauthorized access.', true);
      } else {
        await ctx.reply('Unauthorized access.');
      }
      return;
    }

    return next();
  });

  bot.start(async (ctx) => {
    return sendAdminMenu(ctx);
  });

  bot.on('text', async (ctx) => {
    const telegramId = String(ctx.from.id);
    const pending = adminPending.get(telegramId);

    if (pending?.type === 'system_prompt') {
      adminPending.set(telegramId, {
        type: 'system_prompt_confirm',
        value: ctx.message.text,
      });
      return ctx.reply('Activate this system prompt?', {
        reply_markup: confirmKeyboard,
      });
    }

    if (pending?.type === 'broadcast') {
      adminPending.set(telegramId, {
        type: 'broadcast_confirm',
        value: ctx.message.text,
      });
      return ctx.reply('Broadcast this message?', {
        reply_markup: broadcastConfirmKeyboard,
      });
    }

    if (pending?.type === 'ai_model') {
      const model = ctx.message.text.trim();
      adminPending.delete(telegramId);
      await Setting.updateOne(
        { key: 'aiModel' },
        {
          value: model,
          updatedAt: new Date(),
          updatedBy: telegramId,
        },
        { upsert: true }
      );
      return ctx.reply(`✅ AI model updated to ${model}`);
    }

    if (pending?.type === 'user_search') {
      adminPending.delete(telegramId);
      const user = await findUser(ctx.message.text);
      if (!user) {
        return ctx.reply('User not found.');
      }
      return showUserProfile(ctx, user);
    }

    // Default admin menu
    return sendAdminMenu(ctx);
  });

  bot.action('admin_menu', async (ctx) => {
    await ctx.answerCbQuery();
    return sendAdminMenu(ctx);
  });

  bot.action('admin_prompt', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.reply('🧠 System Prompt', {
      reply_markup: systemPromptKeyboard,
    });
  });

  bot.action('admin_broadcast', async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = String(ctx.from.id);
    adminPending.set(telegramId, { type: 'broadcast' });
    return ctx.reply('Send the broadcast message:');
  });

  bot.action(/^broadcast_(confirm|cancel)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = String(ctx.from.id);
    const action = ctx.match[1];

    if (action === 'cancel') {
      adminPending.delete(telegramId);
      return ctx.reply('Broadcast cancelled.');
    }

    const pending = adminPending.get(telegramId);
    if (!pending?.value) {
      return ctx.reply('No broadcast message found.');
    }

    adminPending.delete(telegramId);

    const users = await User.find({ banned: false });
    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await userBot.telegram.sendMessage(user.telegramId, pending.value);
        sent += 1;
      } catch (err) {
        failed += 1;
        logger.warn('Broadcast send failed', { telegramId: user.telegramId });
      }
    }

    return ctx.reply(`📢 Broadcast sent: ${sent} OK, ${failed} failed.`);
  });

  bot.action('admin_logs', async (ctx) => {
    await ctx.answerCbQuery();
    const logs = await Log.find().sort({ timestamp: -1 }).limit(10);

    if (logs.length === 0) {
      return ctx.reply('No logs yet.');
    }

    const text = logs
      .map(
        (log) =>
          `[${new Date(log.timestamp).toISOString()}] ${log.level.toUpperCase()} ${log.message}`
      )
      .join('\n');

    return ctx.reply(`📜 Recent Logs\n\n${text}`);
  });

  bot.action('admin_settings', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.reply('⚙️ Settings', { reply_markup: maintenanceKeyboard });
  });

  bot.action('admin_user_management', async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = String(ctx.from.id);
    adminPending.set(telegramId, { type: 'user_search' });
    return ctx.reply('Send user ID, username, or name to search:');
  });

  bot.action(/^user_action:(.+):(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const targetId = ctx.match[1];
    const action = ctx.match[2];

    const target = await User.findOne({ telegramId: targetId });
    if (!target) {
      return ctx.reply('User not found.');
    }

    if (action === 'ban') {
      target.banned = true;
      target.banReason = 'Admin ban';
      await target.save();
      await Ban.updateOne(
        { telegramId: targetId },
        { telegramId: targetId, reason: 'Admin ban', bannedAt: new Date() },
        { upsert: true }
      );
      return ctx.reply(`✅ Banned ${target.firstName || targetId}`);
    }

    if (action === 'unban') {
      target.banned = false;
      target.banReason = '';
      await target.save();
      await Ban.deleteOne({ telegramId: targetId });
      return ctx.reply(`✅ Unbanned ${target.firstName || targetId}`);
    }

    if (action === 'clearmemory') {
      await deleteAllMemories(`telegram:${targetId}`);
      return ctx.reply(`✅ Memory cleared for ${target.firstName || targetId}`);
    }

    if (action === 'resetconversation') {
      await Conversation.deleteOne({ userId: targetId });
      return ctx.reply(`✅ Conversation reset for ${target.firstName || targetId}`);
    }

    if (action === 'usage') {
      const today = new Date().toISOString().slice(0, 10);
      const usage = await Usage.findOne({ userId: targetId, date: today });
      const text = `📊 Usage for ${target.firstName || targetId}\n\n` +
        `Today (${today}):\n` +
        `AI: ${usage?.aiRequests || 0}\n` +
        `Web: ${usage?.webSearches || 0}\n` +
        `News: ${usage?.newsSearches || 0}\n` +
        `Memory: ${usage?.memoryOps || 0}`;
      return ctx.reply(text);
    }

    return ctx.reply('Unknown action.');
  });

  bot.action('admin_ai_settings', async (ctx) => {
    await ctx.answerCbQuery();
    const setting = await Setting.findOne({ key: 'aiModel' });
    const model = setting?.value || env.AI_MODEL;

    const keyboard = {
      inline_keyboard: [
        [{ text: '✏️ Set Model', callback_data: 'ai_set_model' }],
        [{ text: '🔙 Back', callback_data: 'admin_menu' }],
      ],
    };

    return ctx.reply(`🤖 AI Settings\n\nCurrent model: ${model}`, {
      reply_markup: keyboard,
    });
  });

  bot.action('ai_set_model', async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = String(ctx.from.id);
    adminPending.set(telegramId, { type: 'ai_model' });
    return ctx.reply('Send the new AI model name:');
  });

  bot.action('admin_service_status', async (ctx) => {
    await ctx.answerCbQuery();
    const { getStatuses } = require('../utils/serviceStatus');
    const statuses = getStatuses();

    const text = `🔌 Service Status\n\n` +
      `Database: ${statuses.database}\n` +
      `AI: ${statuses.ai}\n` +
      `Memory: ${statuses.memory}\n` +
      `Web Search: ${statuses.webSearch}\n` +
      `News Search: ${statuses.newsSearch}\n` +
      `Telegram: ${statuses.telegram}`;

    return ctx.reply(text, { reply_markup: adminMenuKeyboard });
  });

  bot.action('admin_stats', async (ctx) => {
    await ctx.answerCbQuery();

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    const totalMessages = await Message.countDocuments();

    const usageAgg = await Usage.aggregate([
      {
        $group: {
          _id: null,
          aiRequests: { $sum: '$aiRequests' },
          webSearches: { $sum: '$webSearches' },
          newsSearches: { $sum: '$newsSearches' },
          memoryOps: { $sum: '$memoryOps' },
        },
      },
    ]);

    const usage = usageAgg[0] || {
      aiRequests: 0,
      webSearches: 0,
      newsSearches: 0,
      memoryOps: 0,
    };

    const errorAgg = await User.aggregate([
      {
        $group: {
          _id: null,
          errors: { $sum: '$stats.errors' },
        },
      },
    ]);

    const errors = errorAgg[0]?.errors || 0;

    const text = `📊 Statistics\n\n` +
      `👥 Total Users: ${totalUsers}\n` +
      `🟢 Active Users (24h): ${activeUsers}\n` +
      `💬 Total Messages: ${totalMessages}\n` +
      `🤖 AI Requests: ${usage.aiRequests}\n` +
      `🌐 Web Searches: ${usage.webSearches}\n` +
      `📰 News Searches: ${usage.newsSearches}\n` +
      `🧠 Memory Operations: ${usage.memoryOps}\n` +
      `⚠️ Errors: ${errors}`;

    return ctx.reply(text, { reply_markup: adminMenuKeyboard });
  });
}

module.exports = {
  setupAdminBot,
  adminPending,
  sendAdminMenu,
  getMaintenanceMode,
  setMaintenanceMode,
  getSystemPrompt,
  setSystemPrompt,
};
