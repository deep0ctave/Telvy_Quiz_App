import api from './api';

export const loginUser = async ({ username, password, force = false }) => {
  const res = await api.post('/auth/login', { username, password, forceLogin: force });
  const { accessToken, user } = res.data;
  console.log('Login response:', res.data);
  localStorage.setItem('accessToken', accessToken);
  return user;
};

export const logoutUser = async () => {
  try {
    await api.post('/auth/logout');
  } catch (err) {
    console.error('[Logout Error]', err);
  } finally {
    localStorage.removeItem('accessToken');
  }
};

export const refreshToken = async () => {
  console.log('Refreshing token...');
  const res = await api.post('/auth/refresh');
  const { accessToken, user } = res.data;
  console.log('Refresh response:', res.data);
  if (accessToken) {
    localStorage.setItem('accessToken', accessToken);
    return { accessToken, user };
  } else {
    throw new Error('Failed to refresh token');
  }
};

export const getProfile = async () => {
  console.log('Getting profile...');
  const token = localStorage.getItem('accessToken');
  console.log('Token from localStorage:', token);
  
  const res = await api.get('/users/me');
  console.log('Profile response:', res.data);
  return res.data;
};

// Updated registration flow to match new API
export const registerUser = async (formData) => {
  const res = await api.post('/auth/register', {
    role: formData.role || 'student',
    name: formData.name,
    username: formData.username,
    dob: formData.dob,
    email: formData.email,
    gender: formData.gender,
    school: formData.school,
    class: formData.class,
    section: formData.section,
    password: formData.password,
    phone: formData.phone,
  });
  return res.data;
};

export const verifyOtp = async ({ phone, otp }) => {
  const res = await api.post('/auth/otp/verify', { 
    phone, 
    otp, 
    purpose: 'register' 
  });
  return res.data;
};

export const resendOtp = async (phone) => {
  const res = await api.post('/auth/otp/request', { phone });
  return res.data;
};