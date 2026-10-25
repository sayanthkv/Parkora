import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('parkora_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('parkora_user');
    const storedToken = localStorage.getItem('parkora_token');

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (e) {
        logout();
      }
    } else {
      logout();
    }
    setLoading(false);
  }, []);

  // Login handler accepting email & password from Login component
  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    
    // Support flexible backend response structures
    const responseData = res.data.data || res.data;
    const jwtToken = responseData.token || res.data.token;
    const userData = responseData.user || responseData;

    if (!jwtToken) {
      throw new Error('No authentication token received from server.');
    }

    localStorage.setItem('parkora_token', jwtToken);
    localStorage.setItem('parkora_user', JSON.stringify(userData));
    
    setToken(jwtToken);
    setUser(userData);

    return responseData;
  };

  // Register handler accepting registration object
  const register = async (registrationData) => {
    const res = await API.post('/auth/register', registrationData);

    const responseData = res.data.data || res.data;
    const jwtToken = responseData.token || res.data.token;
    const userData = responseData.user || responseData;

    if (jwtToken) {
      localStorage.setItem('parkora_token', jwtToken);
      localStorage.setItem('parkora_user', JSON.stringify(userData));
      setToken(jwtToken);
      setUser(userData);
    }

    return responseData;
  };

  const logout = () => {
    localStorage.removeItem('parkora_token');
    localStorage.removeItem('parkora_user');
    localStorage.removeItem('token'); // Clear backup key if present
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
};