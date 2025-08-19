// src/middlewares/errorHandler.js
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  console.error(`[${new Date().toISOString()}] ERROR ${status} ${req.method} ${req.originalUrl} -> ${err.message}`);
  if (err.stack) console.error(err.stack);
  res.status(status).json({ error: err.message || 'Server Error' });
}
module.exports = errorHandler;
