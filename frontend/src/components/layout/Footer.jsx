import React from "react";
import { motion as Motion } from "framer-motion";
import { Shield, ArrowUp, Github, Twitter, Mail } from "lucide-react";

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-[#0b0b0f] border-t border-gray-800 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-violet-500 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Pixel-Safe
              </span>
            </div>
            <p className="text-gray-400 mb-4 max-w-md">
              Advanced AI-powered forensic tool for detecting image tampering
              and ensuring digital integrity. Protect your digital assets with
              cutting-edge technology.
            </p>
            <div className="flex space-x-4">
              <Motion.a
                whileHover={{ scale: 1.1 }}
                href="#"
                className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-blue-400 transition-colors"
              >
                <Github className="h-5 w-5" />
              </Motion.a>
              <Motion.a
                whileHover={{ scale: 1.1 }}
                href="#"
                className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-blue-400 transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </Motion.a>
              <Motion.a
                whileHover={{ scale: 1.1 }}
                href="#"
                className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-blue-400 transition-colors"
              >
                <Mail className="h-5 w-5" />
              </Motion.a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {["Home", "Upload", "Batch Process", "History"].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Support</h3>
            <ul className="space-y-2">
              {[
                "About",
                "Contact",
                "Privacy Policy",
                "Terms of Service",
              ].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            © 2024 Pixel-Safe. All rights reserved.
          </p>
          <Motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={scrollToTop}
            className="mt-4 md:mt-0 p-3 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full text-white hover:shadow-lg hover:shadow-blue-500/25 transition-shadow"
          >
            <ArrowUp className="h-5 w-5" />
          </Motion.button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
