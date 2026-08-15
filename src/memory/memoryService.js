const env = require('../config/env');
const { setStatus } = require('../utils/serviceStatus');

const API_BASE = 'https://api.mem0.ai/v1';

function isConfigured() {
  return Boolean(env.MEM0_API_KEY);
}

async function searchMemory(userId, query, { signal } = {}) {
  if (!isConfigured()) {
    return { results: [], error: 'not_configured' };
  }

  const url = `${API_BASE}/memories/search?user_id=${encodeURIComponent(
    userId
  )}&query=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Token ${env.MEM0_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal,
    });

    if (!res.ok) {
      throw new Error(`Mem0 search failed: ${res.status}`);
    }

    const data = await res.json();
    const results = Array.isArray(data) ? data : data.results || [];

    setStatus('memory', 'online');
    return { results };
  } catch (err) {
    setStatus('memory', 'degraded');
    if (err.name === 'AbortError') {
      throw new Error('Memory search timed out');
    }
    throw err;
  }
}

async function addMemory(userId, messages, { signal } = {}) {
  if (!isConfigured()) {
    return { saved: false };
  }

  try {
    const res = await fetch(`${API_BASE}/memories/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${env.MEM0_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, messages }),
      signal,
    });

    if (!res.ok) {
      throw new Error(`Mem0 add failed: ${res.status}`);
    }

    const data = await res.json();
    setStatus('memory', 'online');
    return { saved: true, data };
  } catch (err) {
    setStatus('memory', 'degraded');
    if (err.name === 'AbortError') {
      throw new Error('Memory add timed out');
    }
    throw err;
  }
}

async function deleteAllMemories(userId) {
  if (!isConfigured()) {
    return { deleted: false };
  }

  try {
    const res = await fetch(
      `${API_BASE}/memories/?user_id=${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Token ${env.MEM0_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Mem0 delete failed: ${res.status}`);
    }

    setStatus('memory', 'online');
    return { deleted: true };
  } catch (err) {
    setStatus('memory', 'degraded');
    throw err;
  }
}

module.exports = {
  searchMemory,
  addMemory,
  deleteAllMemories,
  isMemoryConfigured: isConfigured,
};
