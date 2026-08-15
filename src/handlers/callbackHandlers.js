const env = require('../config/env');
const { User, Conversation } = require('../database/models');
const {
  processUserMessage,
  getConversation,
  clearConversation,
  sendWelcome,
  sendHelp,
  sendSettings,
} = require('./userHandlers');
const {
  adminPending,
  sendAdminMenu,
} = require('./adminHandlers');
const {
  welcomeKeyboard,
  chatKeyboard,
  settingsKeyboard,
} = require('../keyboards/userKeyboard');
const {
  adminMenuKeyboard,
  systemPromptKeyboard,
} = require('../keyboards/adminKeyboard');

function registerUserCallbacks(bot) {
  bot.action(/^(start_chat|settings|help|home|clear_chat|regen)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = String(ctx.from.id);
    const action = ctx.match[1];
    const user = await User.findOne({ telegramId });

    if (!user) {
      return ctx.reply('Please use /start first.');
    }

    if (action === 'start_chat' || action === 'home') {
      return sendWelcome(ctx);
    }

    if (action === 'settings') {
      return sendSettings(ctx);
    }

    if (action === 'help') {
      return sendHelp(ctx);
    }

    if (action === 'clear_chat') {
      await clearConversation(telegramId);
      return ctx.reply('🗑️ Conversation cleared.');
    }

    if (action === 'regen') {
      const conversation = await getConversation(telegramId);
      const lastUserMessage = [...conversation]
        .reverse()
        .find((msg) => msg.role === 'user');

      if (!lastUserMessage) {
        return ctx.reply('Nothing to regenerate.');
      }

      return processUserMessage(ctx, user, lastUserMessage.content, {
        isRegenerate: true,
      });
    }
  });
}

function registerAdminCallbacks(bot, userBot) {
  bot.action(/^sysprompt_(view|edit|reset|confirm|cancel)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = String(ctx.from.id);
    const action = ctx.match[1];

    if (action === 'view') {
      const { getSystemPrompt } = require('./adminHandlers');
      const prompt = await getSystemPrompt();
      return ctx.reply(`🧠 Current System Prompt:\n\n${prompt || 'Empty'}`);
    }

    if (action === 'edit') {
      adminPending.set(telegramId, { type: 'system_prompt' });
      return ctx.reply('Send the new system prompt:');
    }

    if (action === 'reset') {
      const { setSystemPrompt } = require('./adminHandlers');
      await setSystemPrompt('', telegramId);
      return ctx.reply('♻️ System prompt reset to default.');
    }

    if (action === 'confirm') {
      const pending = adminPending.get(telegramId);
      if (!pending?.value) {
        return ctx.reply('No pending prompt found.');
      }
      const { setSystemPrompt } = require('./adminHandlers');
      await setSystemPrompt(pending.value, telegramId);
      adminPending.delete(telegramId);
      return ctx.reply('✅ System prompt activated.');
    }

    if (action === 'cancel') {
      adminPending.delete(telegramId);
      return ctx.reply('❌ Prompt update cancelled.');
    }
  });

  bot.action(/^maintenance_(enable|disable)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const action = ctx.match[1];
    const { setMaintenanceMode } = require('./adminHandlers');

    if (action === 'enable') {
      await setMaintenanceMode(true);
      return ctx.reply('🔧 Maintenance mode enabled.');
    }

    await setMaintenanceMode(false);
    return ctx.reply('🔧 Maintenance mode disabled.');
  });
}

module.exports = {
  registerUserCallbacks,
  registerAdminCallbacks,
};
