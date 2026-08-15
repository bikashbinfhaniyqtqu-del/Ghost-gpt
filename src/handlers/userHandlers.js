const env = require('../config/env');
const {
  User,
  Message,
  Conversation,
  Setting,
  Usage,
} = require('../database/models');
const { analyzeIntent } = require('../ai/router');
const { generateResponse } = require('../ai/aiService');
const { buildSystemPrompt } = require('../ai/promptBuilder');
const {
  searchMemory,
  addMemory,
  isMemoryConfigured,
} = require('../memory/memoryService');
const { webSearch } = require('../search/webSearch');
const { newsSearch } = require('../search/newsSearch');
const { splitMessage } = require('../utils/messageSplitter');
const logger = require('../utils/logger');
const {
  welcomeKeyboard,
  chatKeyboard,
  settingsKeyboard,
} = require('../keyboards/userKeyboard');
const { telegramRateLimit } = require('../middleware/rateLimit');

const DEFAULT_HELP = `
👻 Ghost GPT

I'm a single intelligent assistant. Just ask me anything. I automatically use the right tools when needed.

Commands:
/start - Welcome
/help - Show this help
/reset - Clear chat history
/settings - Chat settings
`;

function sendWelcome(ctx) {
  return ctx.reply(
    `👻 Ghost GPT\n\nHey! I'm Ghost GPT. Ask me anything.`,
    { reply_markup: welcomeKeyboard }
  );
}

function sendHelp(ctx) {
  return ctx.reply(DEFAULT_HELP, { reply_markup: settingsKeyboard });
}

function sendSettings(ctx) {
  return ctx.reply('⚙️ Settings', { reply_markup: settingsKeyboard });
}

async function getConversation(userId) {
  const conversation = await Conversation.findOne({ userId });
  if (!conversation) return [];

  const max = env.MAX_HISTORY_MESSAGES;
  return conversation.messages.slice(-max);
}

async function addConversationMessage(userId, chatId, role, content) {
  const conversation = await Conversation.findOneAndUpdate(
    { userId },
    {
      $set: { chatId, updatedAt: new Date() },
      $push: {
        messages: {
          role,
          content,
          timestamp: new Date(),
        },
      },
    },
    { upsert: true, new: true }
  );

  if (conversation.messages.length > env.MAX_HISTORY_MESSAGES) {
    conversation.messages = conversation.messages.slice(
      -env.MAX_HISTORY_MESSAGES
    );
    await conversation.save();
  }

  return conversation;
}

async function clearConversation(userId) {
  await Conversation.deleteOne({ userId });
}

function shouldSaveMemory(text) {
  return (
    /remember/i.test(text) ||
    /my name is/i.test(text) ||
    /my project/i.test(text) ||
    /i told you/i.test(text) ||
    /my preference/i.test(text) ||
    /i like/i.test(text) ||
    /i dislike/i.test(text) ||
    /my startup/i.test(text) ||
    /my company/i.test(text) ||
    /my goal/i.test(text) ||
    /my plan/i.test(text)
  );
}

function formatMemoryResults(results) {
  if (!results || results.length === 0) return '';
  return results
    .map((item) => {
      const text =
        item.memory || item.text || item.content || item.message || '';
      return `- ${text}`;
    })
    .join('\n');
}

function formatWebResults(results) {
  if (!results || results.length === 0) return '';
  return results
    .map((item) => {
      return `Title: ${item.title}\nURL: ${item.url}\nContent: ${item.content}`;
    })
    .join('\n\n');
}

function formatNewsResults(results) {
  if (!results || results.length === 0) return '';
  return results
    .map((item) => {
      return `Title: ${item.title}\nSource: ${item.source || 'Unknown'}\nURL: ${
        item.url
      }\nContent: ${item.content}`;
    })
    .join('\n\n');
}

async function getSystemPrompt() {
  const setting = await Setting.findOne({ key: 'systemPrompt' });
  return setting?.value || '';
}

async function getMaintenanceMode() {
  const setting = await Setting.findOne({ key: 'maintenance' });
  return Boolean(setting?.value);
}

async function incrementUsage(telegramId, field) {
  const today = new Date().toISOString().slice(0, 10);
  await Usage.updateOne(
    { userId: telegramId, date: today },
    { $inc: { [field]: 1 } },
    { upsert: true }
  );
}

async function incrementUserStats(telegramId, updates = {}) {
  await User.updateOne(
    { telegramId },
    { $inc: updates, $set: { lastActive: new Date() } }
  );
}

async function processUserMessage(ctx, user, text, { isRegenerate = false } = {}) {
  const telegramId = user.telegramId;
  const chatId = ctx.chat.id;
  const memoryUserId = `telegram:${telegramId}`;

  try {
    await ctx.telegram.sendChatAction(chatId, 'typing');

    const history = await getConversation(telegramId);
    const routing = analyzeIntent(text);

    let memoryContext = '';
    let webContext = '';
    let newsContext = '';

    if (routing.useMemory && isMemoryConfigured()) {
      try {
        const memResult = await searchMemory(memoryUserId, text);
        memoryContext = formatMemoryResults(memResult.results);
        await incrementUsage(telegramId, 'memoryOps');
      } catch (err) {
        logger.warn('Memory search failed', { error: err.message });
      }
    }

    if (routing.useWeb && env.TAVILY_API_KEY) {
      try {
        const webResult = await webSearch(text);
        webContext = formatWebResults(webResult.results);
        await incrementUsage(telegramId, 'webSearches');
      } catch (err) {
        logger.warn('Web search failed', { error: err.message });
      }
    }

    if (routing.useNews && env.NEWSDATA_API_KEY) {
      try {
        const newsResult = await newsSearch(text);
        newsContext = formatNewsResults(newsResult.results);
        await incrementUsage(telegramId, 'newsSearches');
      } catch (err) {
        logger.warn('News search failed', { error: err.message });
      }
    }

    const adminPrompt = await getSystemPrompt();
    const systemContent = buildSystemPrompt({
      adminPrompt,
      memoryContext,
      webContext,
      newsContext,
    });

    const messages = [
      { role: 'system', content: systemContent },
      ...history.map((msg) => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: text },
    ];

    const answer = await generateResponse(messages);

    if (!isRegenerate) {
      await addConversationMessage(telegramId, chatId, 'user', text);
    }
    await addConversationMessage(telegramId, chatId, 'assistant', answer);

    await Message.create({
      userId: telegramId,
      chatId,
      role: 'assistant',
      content: answer,
      services: routing,
      timestamp: new Date(),
    });

    if (shouldSaveMemory(text)) {
      try {
        await addMemory(memoryUserId, [
          { role: 'user', content: text },
          { role: 'assistant', content: answer },
        ]);
        await incrementUsage(telegramId, 'memoryOps');
      } catch (err) {
        logger.warn('Memory save failed', { error: err.message });
      }
    }

    await incrementUserStats(telegramId, {
      totalMessages: isRegenerate ? 1 : 2,
      aiRequests: 1,
    });

    const chunks = splitMessage(answer);
    for (let i = 0; i < chunks.length; i += 1) {
      const options = i === 0 ? { reply_markup: chatKeyboard } : {};
      await ctx.reply(chunks[i], options);
    }
  } catch (err) {
    logger.error('User message processing error', {
      telegramId,
      error: err.message,
    });
    await incrementUserStats(telegramId, { errors: 1 });
    await ctx.reply('⚠️ Something went wrong while processing your request. Please try again.');
  }
}

function setupUserBot(bot) {
  bot.use(telegramRateLimit);

  bot.start(async (ctx) => {
    const telegramId = String(ctx.from.id);
    let user = await User.findOne({ telegramId });

    if (!user) {
      user = await User.create({
        telegramId,
        username: ctx.from.username || '',
        firstName: ctx.from.first_name || '',
        lastName: ctx.from.last_name || '',
        isAdmin: env.ADMIN_IDS.includes(telegramId),
        lastActive: new Date(),
      });
    } else {
      user.lastActive = new Date();
      user.username = ctx.from.username || user.username;
      user.firstName = ctx.from.first_name || user.firstName;
      user.lastName = ctx.from.last_name || user.lastName;
      await user.save();
    }

    return sendWelcome(ctx);
  });

  bot.help((ctx) => sendHelp(ctx));

  bot.command('reset', async (ctx) => {
    const telegramId = String(ctx.from.id);
    await clearConversation(telegramId);
    return ctx.reply('🗑️ Conversation cleared.');
  });

  bot.command('settings', (ctx) => sendSettings(ctx));

  bot.on('text', async (ctx) => {
    const telegramId = String(ctx.from.id);
    const maintenance = await getMaintenanceMode();

    if (maintenance && !env.ADMIN_IDS.includes(telegramId)) {
      return ctx.reply('🔧 Ghost GPT is temporarily under maintenance.');
    }

    let user = await User.findOne({ telegramId });

    if (!user) {
      user = await User.create({
        telegramId,
        username: ctx.from.username || '',
        firstName: ctx.from.first_name || '',
        lastName: ctx.from.last_name || '',
        isAdmin: env.ADMIN_IDS.includes(telegramId),
        lastActive: new Date(),
      });
    } else {
      user.lastActive = new Date();
      user.username = ctx.from.username || user.username;
      user.firstName = ctx.from.first_name || user.firstName;
      user.lastName = ctx.from.last_name || user.lastName;
      await user.save();
    }

    if (user.banned) {
      return ctx.reply('⛔ You are banned from using Ghost GPT.');
    }

    const text = ctx.message.text.trim();
    if (!text) {
      return ctx.reply('Please send a message.');
    }

    return processUserMessage(ctx, user, text);
  });
}

module.exports = {
  setupUserBot,
  processUserMessage,
  getConversation,
  addConversationMessage,
  clearConversation,
  getMaintenanceMode,
  incrementUsage,
  incrementUserStats,
  formatMemoryResults,
  formatWebResults,
  formatNewsResults,
};
