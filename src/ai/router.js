function analyzeIntent(text = '') {
  const lower = text.toLowerCase();

  const memoryPatterns = [
    /remember/i,
    /my name is/i,
    /my project/i,
    /i told you/i,
    /previous/i,
    /what do you know about me/i,
    /my preference/i,
    /i like/i,
    /i dislike/i,
    /my app/i,
    /my startup/i,
    /my company/i,
    /my goal/i,
    /my plan/i,
  ];

  const newsPatterns = [
    /\bnews\b/i,
    /\bheadlines\b/i,
    /\bbreaking\b/i,
    /\btop stories\b/i,
    /\btoday'?s news\b/i,
    /\blatest news\b/i,
    /\bcurrent events\b/i,
    /\bcurrent (tech|technology|business|sports|world|india) news\b/i,
    /\brecent events\b/i,
    /\bnews about\b/i,
  ];

  const webPatterns = [
    /\bcurrent price\b/i,
    /\bprice of\b/i,
    /\bbitcoin price\b/i,
    /\bweather\b/i,
    /\bstock\b/i,
    /\blive\b/i,
    /\btoday\b/i,
    /\bnow\b/i,
    /\blatest\b/i,
    /\bcurrent\b/i,
    /\breal-time\b/i,
    /\bexchange rate\b/i,
    /\bscore\b/i,
    /\btemperature\b/i,
    /\bforecast\b/i,
    /\bupdate\b/i,
  ];

  const useMemory = memoryPatterns.some((pattern) => pattern.test(text));
  const useNews = newsPatterns.some((pattern) => pattern.test(text));
  const useWeb =
    webPatterns.some((pattern) => pattern.test(text)) ||
    /\bsearch (the )?(web|online|internet)\b/i.test(text) ||
    /\bgoogle\b/i.test(text);

  const trimmed = text.trim();

  if (/^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/i.test(trimmed)) {
    return { useMemory: false, useWeb: false, useNews: false, useAI: true };
  }

  return { useMemory, useWeb, useNews, useAI: true };
}

module.exports = { analyzeIntent };
