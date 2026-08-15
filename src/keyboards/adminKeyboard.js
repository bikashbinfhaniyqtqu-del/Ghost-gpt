const adminMenuKeyboard = {
  inline_keyboard: [
    [
      { text: '📊 Statistics', callback_data: 'admin_stats' },
      { text: '👥 Users', callback_data: 'admin_users' },
    ],
    [
      { text: '🧠 System Prompt', callback_data: 'admin_prompt' },
      { text: '🤖 AI Settings', callback_data: 'admin_ai_settings' },
    ],
    [
      { text: '🔌 Service Status', callback_data: 'admin_service_status' },
      { text: '🚫 User Management', callback_data: 'admin_user_management' },
    ],
    [
      { text: '📢 Broadcast', callback_data: 'admin_broadcast' },
      { text: '📜 Logs', callback_data: 'admin_logs' },
    ],
    [{ text: '⚙️ Settings', callback_data: 'admin_settings' }],
  ],
};

const systemPromptKeyboard = {
  inline_keyboard: [
    [
      { text: '👁 View Prompt', callback_data: 'sysprompt_view' },
      { text: '✏️ Edit Prompt', callback_data: 'sysprompt_edit' },
    ],
    [
      { text: '♻️ Reset Prompt', callback_data: 'sysprompt_reset' },
      { text: '🔙 Back', callback_data: 'admin_menu' },
    ],
  ],
};

const confirmKeyboard = {
  inline_keyboard: [
    [
      { text: '✅ Confirm', callback_data: 'sysprompt_confirm' },
      { text: '❌ Cancel', callback_data: 'sysprompt_cancel' },
    ],
  ],
};

const broadcastConfirmKeyboard = {
  inline_keyboard: [
    [
      { text: '✅ Send', callback_data: 'broadcast_confirm' },
      { text: '❌ Cancel', callback_data: 'broadcast_cancel' },
    ],
  ],
};

const maintenanceKeyboard = {
  inline_keyboard: [
    [
      { text: '🟢 Enable', callback_data: 'maintenance_enable' },
      { text: '🔴 Disable', callback_data: 'maintenance_disable' },
    ],
    [{ text: '🔙 Back', callback_data: 'admin_settings' }],
  ],
};

module.exports = {
  adminMenuKeyboard,
  systemPromptKeyboard,
  confirmKeyboard,
  broadcastConfirmKeyboard,
  maintenanceKeyboard,
};
