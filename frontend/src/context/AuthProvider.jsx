import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";   // ✅ THIS IMPORT IS REQUIRED

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const login = (email) => {
    setIsAuthenticated(true);
    setUser({
      name: email.split("@")[0],
      email,
      pic: "https://i.pravatar.cc/150?img=68",
    });

    navigate("/dashboard");
  };

  const logout = () => {
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
