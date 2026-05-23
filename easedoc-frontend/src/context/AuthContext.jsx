import { createContext, useState, useEffect } from "react";
import api from "../api/axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get("/protected");
        setUser(res.data.user);
      } catch (err) {
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const login = (data) => {
    localStorage.setItem("token", data.token);
    setUser(data.user);
  };

  const updateUserSession = (data) => {
    if (data.token) localStorage.setItem("token", data.token);
    if (data.user) setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUserSession }}>
      {children}
    </AuthContext.Provider>
  );
};
