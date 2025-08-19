const Joi = require('joi');

// Assign quizzes
const assignSchema = Joi.object({
  quiz_id: Joi.number().integer().required(),
  student_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
  due_at: Joi.date().optional().allow(null)
});

// Deassign quizzes
const deassignSchema = Joi.object({
  quiz_id: Joi.number().integer().required(),
  student_id: Joi.number().integer().required()
});

module.exports = {
  assignSchema,
  deassignSchema
};
