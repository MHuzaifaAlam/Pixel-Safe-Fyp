import React, { useState } from "react";
import { Mail, Lock } from "lucide-react";

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050505] to-[#0c0c14] flex flex-col justify-center items-center px-4">
      {/* Container */}
      <div className="w-full max-w-sm md:max-w-md bg-[#0f0f1a] border border-gray-800 rounded-2xl shadow-lg p-6 md:p-8 text-white">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">
          {isSignUp ? "Create Account" : "Welcome Back"}
        </h2>
        <p className="text-sm text-gray-400 text-center mb-6">
          {isSignUp
            ? "Sign up to get started with Pixel-Safe"
            : "Sign in to access your Pixel-Safe dashboard"}
        </p>

        {/* Tabs */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setIsSignUp(false)}
            className={`px-4 py-2 text-sm rounded-l-lg transition-all duration-300 ${
              !isSignUp
                ? "bg-gradient-to-r from-cyan-400 to-purple-500"
                : "bg-gray-800"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            className={`px-4 py-2 text-sm rounded-r-lg transition-all duration-300 ${
              isSignUp
                ? "bg-gradient-to-r from-cyan-400 to-purple-500"
                : "bg-gray-800"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email Address</label>
            <div className="flex items-center bg-[#141420] border border-gray-700 rounded-lg px-3 py-2 mt-1">
              <Mail size={18} className="text-gray-400 mr-2" />
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full bg-transparent outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <div className="flex items-center bg-[#141420] border border-gray-700 rounded-lg px-3 py-2 mt-1">
              <Lock size={18} className="text-gray-400 mr-2" />
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full bg-transparent outline-none text-sm"
              />
            </div>
          </div>

          {!isSignUp && (
            <div className="flex justify-between text-xs text-gray-400">
              <label className="flex items-center gap-1">
                <input type="checkbox" className="accent-purple-500" />
                Remember me
              </label>
              <button className="hover:text-cyan-400">Forgot password?</button>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-400 to-purple-500 hover:opacity-90 text-white py-2 rounded-lg text-sm mt-2"
          >
            {isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center justify-center mt-5">
          <div className="border-t border-gray-700 w-1/4" />
          <span className="text-gray-500 text-xs mx-2">or</span>
          <div className="border-t border-gray-700 w-1/4" />
        </div>

        {/* Google Sign-In */}
        <button className="w-full mt-4 flex justify-center items-center gap-2 bg-white text-gray-800 rounded-lg py-2 hover:bg-gray-100 transition-all">
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5"
          />
          <span className="text-sm font-medium">Sign in with Google</span>
        </button>

        <p className="text-center text-xs text-gray-400 mt-6">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setIsSignUp(false)}
                className="text-cyan-400 hover:underline"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Don’t have an account?{" "}
              <button
                onClick={() => setIsSignUp(true)}
                className="text-cyan-400 hover:underline"
              >
                Sign up
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Login;
