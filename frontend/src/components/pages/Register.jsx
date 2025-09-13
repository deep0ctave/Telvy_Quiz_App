import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import { registerUser, verifyOtp, resendOtp } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import 'react-toastify/dist/ReactToastify.css';
import 'react-datepicker/dist/react-datepicker.css';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const Register = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState(1);
  const [schoolOptions, setSchoolOptions] = useState([]);
  const [form, setForm] = useState({
    name: '',
    dob: '',
    gender: '',
    phone: '',
    email: '',
    school: '',
    class: '',
    section: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [fullPhone, setFullPhone] = useState('');
  const [dobDate, setDobDate] = useState(null);
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dropdownRef = useRef(null);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validateStep = () => {
    const required = {
      1: ['name', 'dob', 'gender', 'phone', 'email'],
      2: ['school', 'class', 'section'],
      3: ['username', 'password', 'confirmPassword'],
    };
    const missing = required[step].filter((f) => !form[f]?.trim());
    if (missing.length) {
      toast.error('Please fill all required fields');
      return false;
    }
    if (step === 3 && form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    return true;
  };

  const next = () => validateStep() && setStep((s) => Math.min(3, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      await registerUser({ ...form, role: 'student' });
      toast.success('OTP sent to your phone');
      document.getElementById('otp_modal')?.showModal();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to register');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!otp.trim()) return toast.error('Please enter the OTP');
    setSubmitting(true);
    try {
      await verifyOtp({ phone: form.phone, otp });
      toast.success('🎉 Registration successful. Redirecting to login...', { autoClose: 2000 });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'OTP verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await resendOtp(form.phone);
      toast.success('OTP resent successfully');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to resend OTP');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      step < 3 ? next() : handleSubmit();
    }
  };

  // 🔍 Fetch school suggestions
  useEffect(() => {
    const controller = new AbortController();
    const fetchSchools = async () => {
      const query = form.school.trim();
      if (!query) return setSchoolOptions([]);
      try {
        const res = await api.get(`/misc/schools?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        setSchoolOptions(res.data.schools || []);
      } catch (err) {
        if (err.name !== 'CanceledError') {
          console.error('School fetch error:', err);
        }
        setSchoolOptions([]);
      }
    };
    const timeout = setTimeout(fetchSchools, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [form.school]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSchoolOptions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-90 flex flex-col items-center py-10">
      <ToastContainer position="top-center" />
      <ul className="steps w-full max-w-md mb-6">
        <li className={`step ${step >= 1 ? 'step-primary' : ''}`}>Personal</li>
        <li className={`step ${step >= 2 ? 'step-primary' : ''}`}>School</li>
        <li className={`step ${step === 3 ? 'step-primary' : ''}`}>Account</li>
      </ul>

      <form className="w-full max-w-md px-4 space-y-6" onKeyDown={handleKeyDown}>
        {step === 1 && (
          <>
            <input name="name" type="text" placeholder="Full Name" className="input input-bordered w-full" value={form.name} onChange={handleChange} />
            <DatePicker
              selected={dobDate}
              onChange={(date) => {
                setDobDate(date);
                setForm({ ...form, dob: format(date, 'yyyy-MM-dd') });
              }}
              dateFormat="dd/MM/yyyy"
              placeholderText="Select your DOB"
              className="input input-bordered w-full"
              wrapperClassName="w-full"
              maxDate={new Date()}
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
            />
            <select name="gender" className="select select-bordered w-full" value={form.gender} onChange={handleChange}>
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <div className="input input-bordered w-full flex items-center gap-2 px-3">
              <PhoneInput
                placeholder="Phone number"
                defaultCountry="IN"
                international
                countryCallingCodeEditable={false}
                value={fullPhone}
                onChange={(val) => {
                  const v = val || '';
                  setFullPhone(v);
                  setForm({ ...form, phone: v });
                }}
                className="w-full"
                countrySelectProps={{
                  className: "PhoneInputCountrySelect",
                  style: {
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'inherit'
                  }
                }}
              />
            </div>
            <input name="email" type="email" placeholder="Email" className="input input-bordered w-full" value={form.email} onChange={handleChange} />
            <button type="button" onClick={next} className="btn btn-primary w-full">Next</button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="relative" ref={dropdownRef}>
              <input
                name="school"
                type="text"
                placeholder="School"
                autoComplete="off"
                className="input input-bordered w-full"
                value={form.school}
                onChange={handleChange}
              />
              {schoolOptions.length > 0 && (
                <ul className="absolute z-10 bg-base-100 border w-full mt-1 rounded shadow">
                  {schoolOptions.map((s) => (
                    <li
                      key={s}
                      className="px-4 py-2 hover:bg-base-300 cursor-pointer"
                      onClick={() => {
                        setForm({ ...form, school: s });
                        setSchoolOptions([]);
                      }}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <select name="class" className="select select-bordered w-full" value={form.class} onChange={handleChange}>
              <option value="">Select Class</option>
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
            <select name="section" className="select select-bordered w-full" value={form.section} onChange={handleChange}>
              <option value="">Select Section</option>
              {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
            <div className="flex justify-between">
              <button type="button" onClick={prev} className="btn btn-outline">Back</button>
              <button type="button" onClick={next} className="btn btn-primary">Next</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <input name="username" type="text" placeholder="Username" className="input input-bordered w-full" value={form.username} onChange={handleChange} />
            <input name="password" type="password" placeholder="Password" className="input input-bordered w-full" value={form.password} onChange={handleChange} />
            <input name="confirmPassword" type="password" placeholder="Confirm Password" className="input input-bordered w-full" value={form.confirmPassword} onChange={handleChange} />
            <div className="flex justify-between">
              <button type="button" onClick={prev} className="btn btn-outline">Back</button>
              <button type="button" onClick={handleSubmit} className="btn btn-success" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </>
        )}
      </form>

      {/* ✅ OTP Modal */}
      <dialog id="otp_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Verify OTP</h3>
          <p className="py-2">An OTP has been sent to your phone.</p>
          <input
            type="text"
            maxLength="6"
            placeholder="Enter OTP"
            className="input input-bordered w-full"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <div className="modal-action flex flex-col space-y-2">
            <button type="button" onClick={handleVerify} className="btn btn-primary w-full" disabled={submitting}>
              Confirm & Submit
            </button>
            <button type="button" onClick={handleResendOtp} className="btn btn-outline w-full">
              Resend OTP
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
};

export default Register;
