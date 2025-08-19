const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { validateBody } = require('../middlewares/validation');
const { protect } = require('../middlewares/authMiddleware');
const {
  registerSchema,
  otpRequestSchema,
  otpVerifySchema,
  loginSchema
} = require('../validations/authValidations');

router.post('/register', validateBody(registerSchema), auth.register);
router.post('/otp/request', validateBody(otpRequestSchema), auth.requestOTP);
router.post('/otp/verify', validateBody(otpVerifySchema), auth.verifyOTP);
router.post('/login', validateBody(loginSchema), auth.login);
router.post('/refresh', auth.refreshToken);
router.post('/logout', auth.logout);


module.exports = router;
