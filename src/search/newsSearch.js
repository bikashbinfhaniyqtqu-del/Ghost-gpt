const env = require('../config/env');
const { setStatus } = require('../utils/serviceStatus');

const TIMEOUT_MS = 15000;

async function newsSearch(query) {
  if (!env.NEWSDATA_API_KEY) {
    return { results: [], error: 'not_configured' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const url = `https://newsdata.io/api/1/news?apikey=${encodeURIComponent(
    env.NEWSDATA_API_KEY
  )}&q=${encodeURIComponent(query)}&language=en&size=5`;

  try {
    const res = await fetch(url, { signal: controller.signal });

    if (!res.ok) {
      throw new Error(`NewsData search failed: ${res.status}`);
    }

    const data = await res.json();
    const results = (data.results || []).map((item) => ({
      title: item.title || 'Untitled',
      url: item.link || '',
      content: item.description || item.content || '',
      source: item.source_id || '',
    }));

    setStatus('newsSearch', 'online');
    return { results };
  } catch (err) {
    setStatus('newsSearch', 'degraded');
    if (err.name === 'AbortError') {
      throw new Error('News search timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { newsSearch };
