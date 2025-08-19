import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  loginUser,
  logoutUser,
  refreshToken,
  getProfile,
} from '../services/auth';

const AuthContext = createContext(); // Defined outside component for Fast Refresh

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Initial loading while checking token

  const login = useCallback(async (credentials) => {
    try {
      const userData = await loginUser(credentials);
      setUser(userData);
    } catch (err) {
      throw err; // Let caller handle error (e.g. in login page)
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn('Logout failed:', err);
    } finally {
      setUser(null);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const profile = await getProfile();
      console.log('AuthContext - Profile fetched:', profile);
      setUser(profile);
      return profile;
    } catch (err) {
      console.warn('Failed to fetch profile:', err);
      setUser(null);
      throw err;
    }
  }, []); // Empty dependency array since it doesn't depend on any state

  useEffect(() => {
    const initialize = async () => {
      try {
        const refreshResult = await refreshToken(); // Try to refresh silently (via HttpOnly cookie)
        if (refreshResult && refreshResult.user) {
          setUser(refreshResult.user); // Set user from refresh response
        } else {
          await fetchProfile(); // Fallback to fetch profile if no user in refresh response
        }
      } catch (err) {
        console.log('Auth initialization failed, trying fetchProfile...');
        try {
          await fetchProfile(); // Try to fetch profile as fallback
        } catch (profileErr) {
          console.log('Profile fetch also failed, user not logged in');
          setUser(null); // Not logged in
        }
      } finally {
        setLoading(false); // Done loading
      }
    };

    initialize();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Safer access to context
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
