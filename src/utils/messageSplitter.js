function splitMessage(text, maxLength = 4000) {
  if (typeof text !== 'string' || text.length === 0) return [text];
  if (text.length <= maxLength) return [text];

  const paragraphs = text.split(/(\n\n|\n(?=[*-])|(?<=[.!?])\s+)/g);
  const chunks = [];
  let current = '';

  for (const part of paragraphs) {
    if ((current + part).length > maxLength) {
      if (current.trim()) chunks.push(current.trim());
      current = part;
    } else {
      current += part;
    }
  }

  if (current.trim()) chunks.push(current.trim());

  for (let i = 0; i < chunks.length; i += 1) {
    if (chunks[i].length > maxLength) {
      const sub = chunks[i].match(new RegExp(`.{1,${maxLength}}`, 'gs')) || [
        chunks[i].slice(0, maxLength),
      ];
      chunks.splice(i, 1, ...sub);
    }
  }

  return chunks;
}

module.exports = { splitMessage };
