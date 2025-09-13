import axios from 'axios';

// Create a pre-configured Axios instance
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send cookies including refreshToken
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newAccessToken = data.accessToken;

        localStorage.setItem('accessToken', newAccessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);

        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);



// 🔹 Create user
export const createUser = async (data) => {
  const res = await api.post('/users', data);
  return res.data; // Return just the data like other functions
};

// 🔸 Get all users
export const getAllUsers = async () => {
  const res = await api.get('/users');
  return res.data; // New API returns array directly
};

// 🔸 Get a single user
export const getUserById = async (id) => {
  const res = await api.get(`/users/${id}`);
  return res.data;
};

// ✏️ Update user (admin)
export const updateUserById = async (id, data) => {
  return api.put(`/users/${id}`, data);
};

// 👤 Get user profile
export const getProfile = async () => {
  const res = await api.get('/users/me');
  return res.data;
};

// ✏️ Update user profile
export const updateProfile = async (data) => {
  const res = await api.put('/users/me', data);
  return res.data;
};

// ❌ Delete user
export const deleteUserById = async (id) => {
  return api.delete(`/users/${id}`);
};

// Question Management
export const getAllQuestions = async () => {
  const res = await api.get('/questions');
  return res.data;
};

export const getQuestionById = async (id) => {
  const res = await api.get(`/questions/${id}`);
  return res.data;
};

export const createQuestion = async (data) => {
  const res = await api.post('/questions', data);
  return res.data;
};

export const createBulkQuestions = async (questions) => {
  const res = await api.post('/questions/bulk', { questions });
  return res.data;
};

export const updateQuestionById = async (id, data) => {
  const res = await api.put(`/questions/${id}`, data);
  return res.data;
};

export const deleteQuestionById = async (id) => {
  const res = await api.delete(`/questions/${id}`);
  return res.data;
};

// Legacy function for backward compatibility
export const getAllQuestionsWithDetails = async () => {
  const res = await api.get('/questions');
  return res.data;
};

// Quiz Management
export const getAllQuizzes = async () => {
  const res = await api.get('/quizzes');
  return res.data;
};

export const getQuizById = async (id) => {
  const res = await api.get(`/quizzes/${id}`);
  return res.data;
};

export const createQuiz = async (data) => {
  const res = await api.post('/quizzes', data);
  return res.data;
};

export const updateQuiz = async (id, data) => {
  const res = await api.put(`/quizzes/${id}`, data);
  return res.data;
};

export const deleteQuiz = async (id) => {
  const res = await api.delete(`/quizzes/${id}`);
  return res.data;
};

// Quiz Questions Management
export const setQuizQuestions = async (quizId, questions) => {
  // Convert questions array to question_ids array
  const question_ids = Array.isArray(questions) ? questions : [];
  const res = await api.post(`/quizzes/${quizId}/questions`, { question_ids });
  return res.data;
};

// Assignment Management
export const assignQuizzes = async (data) => {
  const res = await api.post('/assignments', data);
  return res.data;
};

export const deassignQuiz = async (data) => {
  const res = await api.post('/assignments/deassign', data);
  return res.data;
};

export const getAssignmentsForQuiz = async (quizId) => {
  const res = await api.get(`/assignments/quiz/${quizId}`);
  return res.data;
};

export const getMyAssignments = async () => {
  const res = await api.get('/assignments/my');
  return res.data;
};


// ✅ Log all requests
api.interceptors.request.use((config) => {
  console.log('[API Request]', config.method?.toUpperCase(), config.url, config.data || {});
  console.log('[API Request] Full config:', {
    method: config.method,
    url: config.url,
    data: config.data,
    headers: config.headers
  });
  return config;
}, (error) => {
  console.error('[API Request Error]', error);
  return Promise.reject(error);
});

// ✅ Log all responses
api.interceptors.response.use((response) => {
  console.log('[API Response]', response.config.url, response.data);
  return response;
}, (error) => {
  console.error('[API Response Error]', error.response?.config?.url, error.response?.data);
  return Promise.reject(error);
});

// Attempt Management with Enhanced Logging
export const startAttempt = async (quizId) => {
  console.log('[DEBUG] startAttempt - Starting attempt for quiz:', quizId);
  try {
    const res = await api.post('/attempts/start', { quiz_id: quizId });
    console.log('[DEBUG] startAttempt - Success response:', res.data);
    return res.data;
  } catch (error) {
    console.error('[DEBUG] startAttempt - Error:', error.response?.data || error.message);
    throw error;
  }
};

export const syncAttempt = async (attemptId, state) => {
  console.log('[DEBUG] syncAttempt - Syncing attempt:', attemptId);
  console.log('[DEBUG] syncAttempt - State data:', {
    quiz_id: state.quiz_id,
    questions_count: state.questions?.length,
    questions_with_answers: state.questions?.filter(q => q.answer !== null).length,
    answers_detail: state.questions?.filter(q => q.answer !== null).map(q => ({ id: q.id, answer: q.answer }))
  });
  try {
    const res = await api.patch(`/attempts/${attemptId}/sync`, { state });
    console.log('[DEBUG] syncAttempt - Success response:', res.data);
    return res.data;
  } catch (error) {
    console.error('[DEBUG] syncAttempt - Error:', error.response?.data || error.message);
    throw error;
  }
};

export const submitAttempt = async (attemptId) => {
  console.log('[DEBUG] submitAttempt - Submitting attempt:', attemptId);
  try {
    const res = await api.post(`/attempts/${attemptId}/submit`);
    console.log('[DEBUG] submitAttempt - Success response:', res.data);
    return res.data;
  } catch (error) {
    console.error('[DEBUG] submitAttempt - Error:', error.response?.data || error.message);
    throw error;
  }
};

export const getAttemptById = async (attemptId) => {
  console.log('[DEBUG] getAttemptById - Fetching attempt:', attemptId);
  try {
    const res = await api.get(`/attempts/${attemptId}`);
    console.log('[DEBUG] getAttemptById - Success response:', {
      id: res.data.id,
      status: res.data.status,
      score: res.data.score,
      questions_count: res.data.state?.questions?.length,
      questions_with_answers: res.data.state?.questions?.filter(q => q.answer !== null).length
    });
    return res.data;
  } catch (error) {
    console.error('[DEBUG] getAttemptById - Error:', error.response?.data || error.message);
    throw error;
  }
};

export const getMyAttempts = async () => {
  console.log('[DEBUG] getMyAttempts - Fetching user attempts');
  try {
    const res = await api.get('/attempts/my');
    console.log('[DEBUG] getMyAttempts - Success response:', {
      count: res.data.length,
      attempts: res.data.map(a => ({ id: a.id, quiz_id: a.quiz_id, status: a.status, score: a.score }))
    });
    return res.data;
  } catch (error) {
    console.error('[DEBUG] getMyAttempts - Error:', error.response?.data || error.message);
    throw error;
  }
};

export default api;
