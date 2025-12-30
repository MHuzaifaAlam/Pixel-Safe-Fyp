import { useState} from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }) => {
  // 1. Initialize state from LocalStorage so refresh doesn't log the user out
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("access_token"));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user_data")));
  const navigate = useNavigate();

  const login = (userData) => {
    // userData is the object { username: ..., token: ... } sent from LoginPage
    setIsAuthenticated(true);
    
    // Create a more robust user object
    const userInfo = {
      name: userData.username,
      email: userData.email || `${userData.username}@example.com`,
      pic: "https://i.pravatar.cc/150?img=68",
    };

    setUser(userInfo);
    
    // Save user info to localStorage so it persists on refresh
    localStorage.setItem("user_data", JSON.stringify(userInfo));
  };

  const logout = () => {
    // Clear everything from storage
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
    
    setIsAuthenticated(false);
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};