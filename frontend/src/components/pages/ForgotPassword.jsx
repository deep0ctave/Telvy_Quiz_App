import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import api from '../../services/api'; // Your preconfigured Axios instance
import 'react-toastify/dist/ReactToastify.css';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleInitiate = async () => {
    if (!phone.trim()) return toast.error('Enter your phone number');
    try {
      setSubmitting(true);
      await api.post('/auth/forgot-password/initiate', { phone });
      toast.success('OTP sent to your phone');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!otp.trim() || !newPassword || !confirmPassword) {
      return toast.error('Fill in all fields');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match');
    }
    try {
      setSubmitting(true);
      await api.post('/auth/forgot-password/verify', {
        phone,
        otp,
        new_password: newPassword,
      });
      toast.success('Password reset successful. Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/auth/forgot-password/resend', { phone });
      toast.success('OTP resent successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not resend OTP');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <ToastContainer position="top-center" />
      <div className="card w-full max-w-md shadow-xl bg-base-100 p-6 space-y-4">
        <h2 className="text-2xl font-bold text-center">Forgot Password</h2>

        {step === 1 && (
          <>
            <label className="form-control w-full">
              <span className="label-text">Phone Number</span>
              <label className="input input-bordered flex items-center gap-2">
                <span>+91</span>
                <input
                  type="tel"
                  className="grow"
                  placeholder="Enter your phone number"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
            </label>
            <button
              onClick={handleInitiate}
              className="btn btn-primary w-full"
              disabled={submitting}
            >
              {submitting ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <label className="form-control w-full">
              <span className="label-text">OTP</span>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Enter OTP"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </label>

            <label className="form-control w-full">
              <span className="label-text">New Password</span>
              <input
                type="password"
                className="input input-bordered w-full"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>

            <label className="form-control w-full">
              <span className="label-text">Confirm Password</span>
              <input
                type="password"
                className="input input-bordered w-full"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>

            <div className="flex justify-between">
              <button
                onClick={handleResend}
                className="btn btn-outline"
                type="button"
              >
                Resend OTP
              </button>
              <button
                onClick={handleVerify}
                className="btn btn-success"
                disabled={submitting}
              >
                {submitting ? 'Verifying...' : 'Reset Password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
