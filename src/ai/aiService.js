const env = require('../config/env');
const { setStatus } = require('../utils/serviceStatus');
const { Setting } = require('../database/models');

async function getAIModel() {
  try {
    const setting = await Setting.findOne({ key: 'aiModel' });
    return setting?.value || env.AI_MODEL;
  } catch {
    return env.AI_MODEL;
  }
}

async function generateResponse(messages, options = {}) {
  const model = await getAIModel();
  const baseUrl = env.AI_BASE_URL.replace(/\/$/, '');
  const url = `${baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI provider error: ${response.status} ${text.slice(0, 120)}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content from AI provider');
    }

    setStatus('ai', 'online');
    return content;
  } catch (err) {
    setStatus('ai', 'degraded');
    if (err.name === 'AbortError') {
      throw new Error('AI request timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { generateResponse, getAIModel };
