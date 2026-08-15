const welcomeKeyboard = {
  inline_keyboard: [
    [
      { text: '💬 Start Chat', callback_data: 'start_chat' },
      { text: '⚙️ Settings', callback_data: 'settings' },
      { text: 'ℹ️ Help', callback_data: 'help' },
    ],
  ],
};

const chatKeyboard = {
  inline_keyboard: [
    [
      { text: '🔄 Regenerate', callback_data: 'regen' },
      { text: '🗑️ Clear Chat', callback_data: 'clear_chat' },
      { text: '🏠 Home', callback_data: 'home' },
    ],
  ],
};

const settingsKeyboard = {
  inline_keyboard: [
    [
      { text: '🗑️ Clear Chat', callback_data: 'clear_chat' },
      { text: '🏠 Home', callback_data: 'home' },
    ],
  ],
};

module.exports = {
  welcomeKeyboard,
  chatKeyboard,
  settingsKeyboard,
};
