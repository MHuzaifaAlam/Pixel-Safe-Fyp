import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { Shield, Menu, X } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navRef = useRef(null);

  useEffect(() => {
    gsap.set(navRef.current, { opacity: 0, y: -80 }); // Initially hidden

    gsap.to(navRef.current, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: "#intro", // 🔹 When Intro leaves
        start: "bottom top", // Start showing when intro goes off-screen
        toggleActions: "play none none reverse",
      },
    });
  }, []);

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/upload', label: 'Upload' },
    { path: '/history', label: 'History' },
    { path: '/extension', label: 'Extension' },
    { path: '/social-scanner', label: 'Social Scanner' },
    { path: '/login', label: 'Login' },
  ];

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/10 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* === Logo === */}
          <Link to="/" className="flex items-center space-x-2">
            <Motion.div
              whileHover={{ scale: 1.05 }}
              className="p-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg shadow-md"
            >
              <Shield className="h-6 w-6 text-white drop-shadow-md" />
            </Motion.div>
            <Motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-sm"
            >
              Pixel-Safe
            </Motion.span>
          </Link>

          {/* === Desktop Navigation === */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    location.pathname === item.path
                      ? 'text-white bg-white/10'
                      : 'text-gray-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* === Mobile Menu Button === */}
          <div className="md:hidden">
            <Motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-gray-200 hover:text-white hover:bg-white/10 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Motion.button>
          </div>
        </div>
      </div>

      {/* === Mobile Navigation === */}
      {isOpen && (
        <Motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden bg-black/40 backdrop-blur-xl border-t border-white/10"
        >
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${
                  location.pathname === item.path
                    ? 'text-white bg-white/10'
                    : 'text-gray-200 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </Motion.div>
      )}
    </nav>
  );
};

export default Navbar;
