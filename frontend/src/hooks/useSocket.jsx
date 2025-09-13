import { useState } from 'react';

/**
 * Simple useSocket hook
 * Based on Socket.IO tutorial approach
 */
export const useSocket = () => {
  // REST-only stub
  return {
    isConnected: false,
    isAuthenticated: false,
    timer: null,
    error: null,
    connect: async () => {},
    startQuiz: async () => { throw new Error('Socket disabled'); },
    syncState: () => {},
    recoverQuiz: async () => { throw new Error('Socket disabled'); }
  };
};

/**
 * Hook for quiz timer functionality
 * Provides server-controlled timer with fallback
 */
export const useQuizTimer = () => {
  // REST-only stub
  const [timeRemaining] = useState(0);
  const [isExpired] = useState(false);
  const [progressPercentage] = useState(0);
  const [formattedTime] = useState('0:00');
  return { timeRemaining, formattedTime, isExpired, progressPercentage };
};