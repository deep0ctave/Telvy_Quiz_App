// src/server.js
require('dotenv').config();
const app = require('./app');
const { createServer } = require('http');
const { attachSocketServer } = require('./socketServer');

const port = process.env.PORT || 3000;

// Create HTTP server
const server = createServer(app);

// Start the server
server.listen(port, () => {
  console.log(`Server listening on ${port}`);
  attachSocketServer(server);
  console.log(`WebSocket server attached`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
