import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { Shield, Menu, X, LogOut } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useAuth } from "../../context/UseAuth";

gsap.registerPlugin(ScrollTrigger);

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navRef = useRef(null);
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    // 1. Identify the trigger element (Intro section on Home page)
    const introElement = document.querySelector("#intro");

    // 2. SAFETY CHECK: If #intro is missing (e.g., Login/Upload pages or Refresh)
    // we show the navbar immediately and don't attach ScrollTrigger.
    if (!introElement) {
      gsap.set(navRef.current, { opacity: 1, y: 0 });
      return;
    }

    // 3. HOME PAGE LOGIC: Navbar starts hidden and slides in on scroll
    gsap.set(navRef.current, { opacity: 0, y: -80 });

    const navAnimation = gsap.to(navRef.current, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: introElement,
        start: "bottom top",
        toggleActions: "play none none reverse",
      },
    });

    // 4. CLEANUP: Destroy the trigger when the component unmounts or path changes
    return () => {
      if (navAnimation.scrollTrigger) navAnimation.scrollTrigger.kill();
    };
  }, [location.pathname]); // Re-run whenever the user changes pages

  const navItems = [
    { path: "/", label: "Home", isPublic: true },
    { path: "/upload", label: "Upload", isPublic: false },
    { path: "/extension", label: "Extension", isPublic: false },
    { path: "/admin", label: "Dashboard", isPublic: false }
  ];

  let items = navItems.filter((i) => i.isPublic || isAuthenticated);
  if (!isAuthenticated) items.push({ path: "/login", label: "Login" });

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/10 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Motion.div
              whileHover={{ scale: 1.05 }}
              className="p-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg"
            >
              <Shield className="h-6 w-6 text-white" />
            </Motion.div>
            <Motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
            >
              Pixel-Safe
            </Motion.span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center">
            <div className="ml-10 flex items-baseline space-x-4">
              {items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? "text-white bg-white/10"
                      : "text-gray-200 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* User info & Logout */}
            {isAuthenticated && user && (
              <div className="ml-6 flex items-center space-x-3 border-l border-white/10 pl-6">
                <img
                  src={user.pic}
                  className="h-8 w-8 rounded-full border-2 border-purple-400 object-cover"
                  alt="profile"
                />
                <span className="text-sm text-white">{user.name}</span>

                <button
                  onClick={logout}
                  className="p-2 rounded-full text-gray-200 hover:text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-gray-200"
            >
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-black/90 border-b border-white/10 px-2 pt-2 pb-3 space-y-1">
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-200 hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
          {isAuthenticated && (
            <button
              onClick={logout}
              className="flex w-full items-center px-3 py-2 text-base font-medium text-red-400 hover:bg-white/10"
            >
              <LogOut className="mr-2 h-5 w-5" /> Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;