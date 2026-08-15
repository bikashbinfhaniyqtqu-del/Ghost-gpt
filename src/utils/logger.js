let logWriter = null;

function setLogWriter(fn) {
  logWriter = fn;
}

function safeMeta(meta = {}) {
  const safe = {};
  for (const key of Object.keys(meta)) {
    if (/token|key|secret|uri|password/i.test(key)) continue;
    safe[key] = meta[key];
  }
  return safe;
}

function log(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...safeMeta(meta),
  };

  const line = `${entry.timestamp} [${level.toUpperCase()}] ${message} ${
    Object.keys(safeMeta(meta)).length ? JSON.stringify(safeMeta(meta)) : ''
  }`;

  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }

  if (logWriter && level === 'error') {
    try {
      logWriter(entry);
    } catch (_) {
      // Ignore DB logging errors
    }
  }
}

module.exports = {
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  setLogWriter,
};
