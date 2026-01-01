import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api"; // ✅ Path to your axios instance
import { AuthContext } from "./AuthContext"; 

export const AuthProvider = ({ children }) => {
  // Initialize state from LocalStorage for persistence
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("access_token"));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user_data")));
  const navigate = useNavigate();

  const login = (userData) => {
    setIsAuthenticated(true);
    const userInfo = {
      name: userData.username,
      email: userData.email || `${userData.username}@example.com`,
      pic: "https://i.pravatar.cc/150?img=68",
    };
    setUser(userInfo);
    localStorage.setItem("user_data", JSON.stringify(userInfo));
  };

  // ✅ Logout: Blacklists Django refresh token & clears local storage
  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        // Blacklist the token on the server
        await api.post("logout/", { refresh: refreshToken });
      }
    } catch (error) {
      // ✅ Log error to satisfy ESLint "no-unused-vars"
      console.error("Logout API failed:", error); 
    } finally {
      // ✅ Always clear local session regardless of API success
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_data");
      setIsAuthenticated(false);
      setUser(null);
      navigate("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};