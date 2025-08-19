// src/middlewares/authMiddleware.js
const jwtUtils = require('../config/jwt');

async function protect(req, res, next) {
  try {
    const auth = req.headers['authorization'];
    if (!auth) {
      return res.status(401).json({ error: 'no_token' });
    }

    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'malformed_token' });
    }

    const token = parts[1];
    console.log('Token received:', token);
    
    const payload = jwtUtils.verify(token); // just verify signature & expiry
    console.log('JWT payload:', payload);
    
    if (!payload) {
      return res.status(401).json({ error: 'invalid_token' });
    }

    req.user = payload; // { id, role, username, ... }
    console.log('User set in req:', req.user);
    next();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] auth error`, err);
    res.status(500).json({ error: 'server_error' });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'not_authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}

module.exports = { protect, authorizeRoles };
