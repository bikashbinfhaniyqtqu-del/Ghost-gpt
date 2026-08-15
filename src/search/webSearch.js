const env = require('../config/env');
const { setStatus } = require('../utils/serviceStatus');

const TIMEOUT_MS = 15000;

async function webSearch(query) {
  if (!env.TAVILY_API_KEY) {
    return { results: [], error: 'not_configured' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: env.TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        max_results: 5,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Tavily search failed: ${res.status}`);
    }

    const data = await res.json();
    const results = (data.results || []).map((item) => ({
      title: item.title || 'Untitled',
      url: item.url || '',
      content: item.content || '',
    }));

    setStatus('webSearch', 'online');
    return { results };
  } catch (err) {
    setStatus('webSearch', 'degraded');
    if (err.name === 'AbortError') {
      throw new Error('Web search timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { webSearch };
