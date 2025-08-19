const Joi = require('joi');

const registerSchema = Joi.object({
  role: Joi.string().valid('student', 'teacher').required(),
  name: Joi.string().min(3).required(),
  username: Joi.string().alphanum().min(3).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  phone: Joi.string().pattern(/^\+?\d{10,15}$/).required(),
  dob: Joi.date().optional(),
  gender: Joi.string().optional(),
  school: Joi.string().optional(),
  class: Joi.string().optional(),
  section: Joi.string().optional()
});

const otpRequestSchema = Joi.object({
  phone: Joi.string().pattern(/^\d{10}$/).required(),
  purpose: Joi.string().optional()
});

const otpVerifySchema = Joi.object({
  phone: Joi.string().pattern(/^\d{10}$/).required(),
  otp: Joi.string().required(),
  purpose: Joi.string().optional()
});

const loginSchema = Joi.object({
  phone: Joi.string().pattern(/^\d{10}$/).optional(),
  username: Joi.string().alphanum().min(3).optional(),
  password: Joi.string().required(),
  forceLogin: Joi.boolean().optional()
}).or('phone', 'username'); // Must have at least one of these


module.exports = {
  registerSchema,
  otpRequestSchema,
  otpVerifySchema,
  loginSchema
};
