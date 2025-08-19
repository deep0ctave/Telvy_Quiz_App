// src/middlewares/validation.js
const Joi = require('joi');

function validateBody(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const msg = error.details.map(d => d.message).join(', ');
      return res.status(400).json({ error: msg });
    }
    next();
  };
}

module.exports = { validateBody };
