const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled Express error', {
    message: err.message,
    stack: err.stack,
  });

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { errorHandler };
