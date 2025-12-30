import React, { useState } from "react";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/UseAuth";
import api from "../api"; 
import toast, { Toaster } from "react-hot-toast";

const LoginPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
  });

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  const loadingToast = toast.loading(isSignUp ? "Creating account..." : "Signing in...");

  try {
    if (!isSignUp) {
      // --- LOGIN FLOW ---
      // Only send username and password to the /token/ endpoint
      const response = await api.post("token/", {
        username: formData.username,
        password: formData.password,
      });

      const { access, refresh } = response.data;

      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);

      login({ username: formData.username, token: access });
      
      toast.success("Welcome back!", { id: loadingToast });
      navigate("/admin");
    } else {
      // --- SIGNUP FLOW (Signup stays the same) ---
      const signupData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
      };

      await api.post("signup/", signupData);
      
      toast.success("Account created! Please sign in.", { id: loadingToast });
      setIsSignUp(false);
      setFormData(prev => ({ ...prev, password: "" }));
    }
  } catch (err) {
    alert({err}`An error occurred. Please try again.`);
    // ... error handling logic
  }
};

  const handleGoogleLogin = () => {
    toast.error("Google Login is not configured yet.");
  };

  return (
    <div className="w-full py-20 bg-linear-to-b from-[#050505] to-[#0c0c14] flex flex-col items-center px-4 min-h-[80vh]">
      <Toaster position="top-center" reverseOrder={false} />

      <div className="w-full max-w-sm md:max-w-md bg-[#0f0f1a] border border-gray-800 rounded-2xl shadow-lg p-6 md:p-8 text-white">
        
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">
          {isSignUp ? "Create Account" : "Welcome Back"}
        </h2>
        <p className="text-sm text-gray-400 text-center mb-6">
          {isSignUp
            ? "Sign up to get started with Pixel-Safe"
            : "Sign in to access your Pixel-Safe dashboard"}
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium">Username</label>
            <div className="flex items-center bg-[#141420] border border-gray-700 rounded-lg px-3 py-2 mt-1">
              <User size={18} className="text-gray-400 mr-2" />
              <input
                type="text"
                name="username"
                placeholder="Enter username"
                className="w-full bg-transparent outline-none text-sm"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {isSignUp && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium">First Name</label>
                <div className="flex items-center bg-[#141420] border border-gray-700 rounded-lg px-3 py-2 mt-1">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First"
                    className="w-full bg-transparent outline-none text-sm"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Last Name</label>
                <div className="flex items-center bg-[#141420] border border-gray-700 rounded-lg px-3 py-2 mt-1">
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last"
                    className="w-full bg-transparent outline-none text-sm"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Email Address</label>
            <div className="flex items-center bg-[#141420] border border-gray-700 rounded-lg px-3 py-2 mt-1">
              <Mail size={18} className="text-gray-400 mr-2" />
              <input
                type="email"
                name="email"
                placeholder="Enter email"
                className="w-full bg-transparent outline-none text-sm"
                value={formData.email}
                onChange={handleChange}
                required={isSignUp}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <div className="flex items-center bg-[#141420] border border-gray-700 rounded-lg px-3 py-2 mt-1">
              <Lock size={18} className="text-gray-400 mr-2" />
              <input
                type="password"
                name="password"
                placeholder="Enter password"
                className="w-full bg-transparent outline-none text-sm"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-linear-to-r from-cyan-400 to-purple-500 hover:opacity-90 text-white py-2 rounded-lg text-sm mt-2 flex items-center justify-center gap-2 transition-all duration-300 active:scale-95"
          >
            {isSignUp ? "Create Account" : "Sign In"}
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="flex items-center my-4">
          <div className="grow h-px bg-gray-700"></div>
          <span className="text-xs text-gray-500 px-2">OR</span>
          <div className="grow h-px bg-gray-700"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full border border-gray-600 hover:bg-gray-800 transition py-2 rounded-lg text-sm flex items-center justify-center gap-2"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-4 h-4"
          />
          Continue with Google
        </button>

        <p className="text-center text-xs text-gray-400 mt-6">
          {isSignUp ? "Already have an account?" : "Don’t have an account?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-cyan-400 hover:underline transition-colors"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;