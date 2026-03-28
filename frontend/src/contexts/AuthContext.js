import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('tranchly_token'));
  const [loading, setLoading] = useState(true);

  const api = useCallback(() => {
    return axios.create({
      baseURL: BACKEND_URL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }, [token]);

  const fetchUser = useCallback(() => {
    if (token) {
      return api().get('/api/auth/me')
        .then(res => { setUser(res.data.user); return res.data.user; })
        .catch(() => { localStorage.removeItem('tranchly_token'); setToken(null); return null; });
    }
    return Promise.resolve(null);
  }, [token, api]);

  useEffect(() => {
    if (token) {
      fetchUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, fetchUser]);

  const login = async (email, password) => {
    const res = await api().post('/api/auth/login', { email, password });
    localStorage.setItem('tranchly_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const signup = async (email, password, full_name, role) => {
    const res = await api().post('/api/auth/signup', { email, password, full_name, role });
    localStorage.setItem('tranchly_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('tranchly_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    return fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, refreshUser, api: api() }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
