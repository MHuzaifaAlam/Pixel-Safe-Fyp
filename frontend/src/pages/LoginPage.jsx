import React, { useState } from "react";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/UseAuth";

const LoginPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // 👉 MOCK SIGNUP + SIGNIN HANDLER
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isSignUp) {
      // LOGIN FLOW
      if (
        formData.email === "test@example.com" &&
        formData.password === "test123"
      ) {
        login(formData.email);
        navigate("/upload");
      } else {
        setError("Invalid email or password");
      }
    } else {
      // SIGNUP FLOW (Mock)
      if (
        formData.firstName &&
        formData.lastName &&
        formData.email &&
        formData.password
      ) {
        login(formData.email);
        navigate("/upload");
      } else {
        setError("Please fill all fields");
      }
    }
  };

  // 👉 MOCK GOOGLE LOGIN
  const handleGoogleLogin = () => {
    login("googleuser@example.com"); // Mock user
    navigate("/upload");
  };

  return (
    <div className="w-full py-20 bg-gradient-to-b from-[#050505] to-[#0c0c14] flex flex-col items-center px-4 min-h-[80vh]">
      <div className="w-full max-w-sm md:max-w-md bg-[#0f0f1a] border border-gray-800 rounded-2xl shadow-lg p-6 md:p-8 text-white">

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">
          {isSignUp ? "Create Account" : "Welcome Back"}
        </h2>
        <p className="text-sm text-gray-400 text-center mb-6">
          {isSignUp
            ? "Sign up to get started with Pixel-Safe"
            : "Sign in to access your Pixel-Safe dashboard"}
        </p>

        {error && <p className="text-red-500 text-xs text-center mb-3">{error}</p>}

        <form className="space-y-4" onSubmit={handleSubmit}>

          {/* SIGNUP EXTRA FIELDS */}
          {isSignUp && (
            <>
              <div>
                <label className="text-sm font-medium">First Name</label>
                <div className="flex items-center bg-[#141420] border border-gray-700 rounded-lg px-3 py-2 mt-1">
                  <User size={18} className="text-gray-400 mr-2" />
                  <input
                    type="text"
                    name="firstName"
                    placeholder="Enter first name"
                    className="w-full bg-transparent outline-none text-sm"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Last Name</label>
                <div className="flex items-center bg-[#141420] border border-gray-700 rounded-lg px-3 py-2 mt-1">
                  <User size={18} className="text-gray-400 mr-2" />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Enter last name"
                    className="w-full bg-transparent outline-none text-sm"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </>
          )}

          {/* EMAIL */}
          <div>
            <label className="text-sm font-medium">Email Address</label>
            <div className="flex items-center bg-[#141420] border border-gray-700 rounded-lg px-3 py-2 mt-1">
              <Mail size={18} className="text-gray-400 mr-2" />
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                className="w-full bg-transparent outline-none text-sm"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="text-sm font-medium">Password</label>
            <div className="flex items-center bg-[#141420] border border-gray-700 rounded-lg px-3 py-2 mt-1">
              <Lock size={18} className="text-gray-400 mr-2" />
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                className="w-full bg-transparent outline-none text-sm"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-400 to-purple-500 hover:opacity-90 text-white py-2 rounded-lg text-sm mt-2 flex items-center justify-center gap-2"
          >
            {isSignUp ? "Create Account" : "Sign In"}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* OR Divider */}
        <div className="flex items-center my-4">
          <div className="flex-grow h-px bg-gray-700"></div>
          <span className="text-xs text-gray-500 px-2">OR</span>
          <div className="flex-grow h-px bg-gray-700"></div>
        </div>

        {/* GOOGLE BUTTON */}
        <button
          onClick={handleGoogleLogin}
          className="w-full border border-gray-600 hover:bg-gray-800 transition py-2 rounded-lg text-sm flex items-center justify-center gap-2"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-4 h-4"
          />
          Continue with Google
        </button>

        {/* SWITCH MODE */}
        <p className="text-center text-xs text-gray-400 mt-6">
          {isSignUp ? "Already have an account?" : "Don’t have an account?"}{" "}
          <button
            onClick={() => {
              setError("");
              setIsSignUp(!isSignUp);
            }}
            className="text-cyan-400 hover:underline"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
