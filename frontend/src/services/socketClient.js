import { io } from 'socket.io-client';

let socket = null;
let isAuthenticated = false;
let authWaiters = [];

function resolveAuth(ok) {
  isAuthenticated = ok;
  authWaiters.forEach(({ resolve, reject, timer }) => {
    clearTimeout(timer);
    ok ? resolve(true) : reject(new Error('not_authenticated'));
  });
  authWaiters = [];
}

export function connect(token) {
  if (socket && socket.connected) return socket;
  const baseURL = (import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '')) || 'http://localhost:3000';
  socket = io(baseURL, {
    withCredentials: true,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    path: '/socket.io'
  });

  socket.on('connect', () => {
    const t = token || localStorage.getItem('accessToken');
    isAuthenticated = false;
    if (t) socket.emit('authenticate', { token: t });
  });

  socket.on('authenticated', () => resolveAuth(true));
  socket.on('auth_error', () => resolveAuth(false));

  return socket;
}

async function ensureAuthenticated(timeoutMs = 4000) {
  if (isAuthenticated) return true;
  // If socket exists but not authed, wait
  if (socket) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('not_authenticated'));
      }, timeoutMs);
      authWaiters.push({ resolve, reject, timer });
    });
  }
  throw new Error('socket_not_connected');
}

export function startTimer(attemptId) {
  if (!socket) return;
  socket.emit('start_timer', { attempt_id: attemptId });
}

export function syncState(attemptId, state, clientId) {
  if (!socket) return;
  socket.emit('sync_state', { attempt_id: attemptId, state, client_id: clientId });
}

export function syncStateAck(attemptId, state, timeoutMs = 4000, clientId) {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Socket not connected'));
    const handler = (payload) => {
      if (payload?.attempt_id === attemptId) {
        clearTimeout(timer);
        socket.off('state_synced', handler);
        resolve(true);
      }
    };
    const timer = setTimeout(() => {
      socket.off('state_synced', handler);
      reject(new Error('sync_timeout'));
    }, timeoutMs);
    socket.on('state_synced', handler);
    socket.emit('sync_state', { attempt_id: attemptId, state, client_id: clientId });
  });
}

export function on(event, handler) {
  if (!socket) return;
  socket.on(event, handler);
}

export function off(event, handler) {
  if (!socket) return;
  socket.off(event, handler);
}

export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Request/response helpers using callbacks wrapped in Promises
export function startQuiz(quizId) {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Socket not connected'));
    ensureAuthenticated().then(() => {
      socket.emit('start_quiz', { quiz_id: quizId }, (resp) => {
        if (resp?.ok) resolve(resp.data);
        else reject(new Error(resp?.error || 'start_quiz_failed'));
      });
    }).catch(reject);
  });
}

export function getAttempt(attemptId) {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Socket not connected'));
    ensureAuthenticated().then(() => {
      socket.emit('get_attempt', { attempt_id: attemptId }, (resp) => {
        if (resp?.ok) resolve(resp.data);
        else reject(new Error(resp?.error || 'get_attempt_failed'));
      });
    }).catch(reject);
  });
}

export function submitAttemptSocket(attemptId) {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Socket not connected'));
    ensureAuthenticated().then(() => {
      socket.emit('submit_attempt', { attempt_id: attemptId }, (resp) => {
        if (resp?.ok) resolve(resp.data);
        else reject(new Error(resp?.error || 'submit_attempt_failed'));
      });
    }).catch(reject);
  });
}

export function getLiveAttempts(filters = {}) {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Socket not connected'));
    ensureAuthenticated().then(() => {
      // Listen for the response event
      const handleResponse = (data) => {
        socket.off('admin_live_attempts', handleResponse);
        resolve(data);
      };
      
      socket.on('admin_live_attempts', handleResponse);
      socket.emit('admin_get_live_attempts', filters);
      
      // Set timeout for the request
      setTimeout(() => {
        socket.off('admin_live_attempts', handleResponse);
        reject(new Error('Request timeout'));
      }, 10000);
    }).catch(reject);
  });
}

export function resetTimer(attemptId, duration) {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Socket not connected'));
    ensureAuthenticated().then(() => {
      // Listen for the response event
      const handleResponse = (data) => {
        socket.off('admin_timer_reset', handleResponse);
        resolve(data);
      };
      
      socket.on('admin_timer_reset', handleResponse);
      socket.emit('admin_reset_timer', { attempt_id: attemptId, new_duration: duration });
      
      // Set timeout for the request
      setTimeout(() => {
        socket.off('admin_timer_reset', handleResponse);
        reject(new Error('Request timeout'));
      }, 10000);
    }).catch(reject);
  });
}

export function resetAssignment(quizId, studentId) {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Socket not connected'));
    ensureAuthenticated().then(() => {
      // Listen for the response event
      const handleResponse = (data) => {
        socket.off('admin_assignment_reset', handleResponse);
        resolve(data);
      };
      
      socket.on('admin_assignment_reset', handleResponse);
      socket.emit('admin_reset_assignment', { quiz_id: quizId, student_id: studentId });
      
      // Set timeout for the request
      setTimeout(() => {
        socket.off('admin_assignment_reset', handleResponse);
        reject(new Error('Request timeout'));
      }, 10000);
    }).catch(reject);
  });
}

export function massResetTimer(filters, duration) {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Socket not connected'));
    ensureAuthenticated().then(() => {
      // Listen for the response event
      const handleResponse = (data) => {
        socket.off('admin_mass_timer_reset', handleResponse);
        resolve(data);
      };
      
      socket.on('admin_mass_timer_reset', handleResponse);
      socket.emit('admin_mass_reset_timer', { filters, new_duration: duration });
      
      // Set timeout for the request
      setTimeout(() => {
        socket.off('admin_mass_timer_reset', handleResponse);
        reject(new Error('Request timeout'));
      }, 30000); // Longer timeout for mass operations
    }).catch(reject);
  });
}

export function massResetAssignment(filters) {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Socket not connected'));
    ensureAuthenticated().then(() => {
      // Listen for the response event
      const handleResponse = (data) => {
        socket.off('admin_mass_assignment_reset', handleResponse);
        resolve(data);
      };
      
      socket.on('admin_mass_assignment_reset', handleResponse);
      socket.emit('admin_mass_reset_assignment', { filters });
      
      // Set timeout for the request
      setTimeout(() => {
        socket.off('admin_mass_assignment_reset', handleResponse);
        reject(new Error('Request timeout'));
      }, 30000); // Longer timeout for mass operations
    }).catch(reject);
  });
}


