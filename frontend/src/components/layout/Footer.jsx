import React from "react";
import { motion as Motion } from "framer-motion";
import { Link } from "react-router-dom"; // ✅ Import Link
import { Shield, ArrowUp, Github, Twitter, Mail } from "lucide-react";

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Define routes for Quick Links
  const quickLinks = [
    { name: "Home", path: "/" },
    { name: "Upload", path: "/upload" },
    { name: "Extension", path: "/extension" },
  ];

  // Define routes for Support
  const supportLinks = [
    { name: "Admin", path: "/admin" },
  ];

  return (
    <footer className="bg-[#0b0b0f] border-t border-gray-800 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Logo & Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-2 bg-linear-to-r from-blue-500 to-violet-500 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-linear-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent italic tracking-tighter uppercase">
                Pixel-Safe
              </span>
            </div>
            <p className="text-gray-400 mb-4 max-w-md text-sm leading-relaxed">
              Advanced AI-powered forensic tool for detecting image tampering
              and ensuring digital integrity. Protect your digital assets with
              cutting-edge technology.
            </p>
            <div className="flex space-x-4">
              <SocialIcon href="https://github.com" icon={<Github className="h-5 w-5" />} />
              <SocialIcon href="https://twitter.com" icon={<Twitter className="h-5 w-5" />} />
              <SocialIcon href="mailto:support@pixel-safe.com" icon={<Mail className="h-5 w-5" />} />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold mb-4 text-white uppercase tracking-widest">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-gray-400 hover:text-blue-400 transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-bold mb-4 text-white uppercase tracking-widest">
              Support
            </h3>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-gray-400 hover:text-blue-400 transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-xs uppercase tracking-tight">
            © 2026 Pixel-Safe. All rights reserved.
          </p>
          <Motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            className="mt-4 md:mt-0 p-3 bg-linear-to-r from-blue-500 to-violet-500 rounded-full text-white hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all"
          >
            <ArrowUp className="h-5 w-5" />
          </Motion.button>
        </div>
      </div>
    </footer>
  );
};

// Reusable Social Icon Component
const SocialIcon = ({ href, icon }) => (
  <Motion.a
    whileHover={{ y: -3 }}
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="p-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-blue-400 hover:border-blue-500/50 transition-all"
  >
    {icon}
  </Motion.a>
);

export default Footer;