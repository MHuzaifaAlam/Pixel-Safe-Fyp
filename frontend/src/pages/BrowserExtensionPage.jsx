import React from "react";
import { motion as Motion } from "framer-motion";
import { Chrome, ShieldCheck, Image, Layers } from "lucide-react";

const BrowserExtensionPage = () => {
  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-20 pb-10 relative overflow-hidden bg-gradient-to-br from-[#050505] via-[#0a0a0f] to-[#111122] text-white"
    >
      {/* Animated glowing background */}
      <Motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            "radial-gradient(circle at 20% 30%, rgba(147,51,234,0.1), transparent 60%)",
            "radial-gradient(circle at 70% 80%, rgba(6,182,212,0.1), transparent 60%)",
            "radial-gradient(circle at 50% 50%, rgba(236,72,153,0.1), transparent 60%)",
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, repeatType: "mirror" }}
      />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Section */}
        <Motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="overflow-visible">
  <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight md:leading-snug bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent pb-2">
    Watermarking Browser Extension
  </h1>
</div>

          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Protect and verify digital image authenticity directly from your
            browser. Add or detect invisible watermarks to ensure trust and
            transparency online.
          </p>
        </Motion.div>

        {/* Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Extension Preview */}
          <Motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-[#0f0f18]/70 p-8 rounded-xl border border-gray-700 text-center shadow-lg"
          >
            <div className="flex justify-center mb-6">
              <Chrome className="h-16 w-16 text-cyan-400" />
            </div>
            <h3 className="text-2xl font-semibold mb-3 text-white">
              Pixel-Safe Watermarking Extension
            </h3>
            <p className="text-gray-400 mb-6">
              Embed invisible watermarks into your images or detect existing
              ones — all within your browser. Ensure every image shared is
              verified and tamper-proof.
            </p>
            <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300">
              Add to Chrome
            </button>
          </Motion.div>

          {/* Features Section */}
          <Motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="flex items-start space-x-4">
              <Image className="h-10 w-10 text-cyan-400 mt-1" />
              <div>
                <h4 className="text-xl font-semibold text-white">
                  Add Invisible Watermarks
                </h4>
                <p className="text-gray-400">
                  Secure your original images with embedded digital signatures
                  that cannot be seen or easily removed.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <ShieldCheck className="h-10 w-10 text-violet-400 mt-1" />
              <div>
                <h4 className="text-xl font-semibold text-white">
                  Verify Authenticity Instantly
                </h4>
                <p className="text-gray-400">
                  Detect and validate image watermarks directly from websites
                  and social media platforms.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <Layers className="h-10 w-10 text-cyan-400 mt-1" />
              <div>
                <h4 className="text-xl font-semibold text-white">
                  Browser-Based Convenience
                </h4>
                <p className="text-gray-400">
                  No software installation required — all watermarking operations
                  happen seamlessly in your browser using secure local APIs.
                </p>
              </div>
            </div>
          </Motion.div>
        </div>

        {/* How It Works Section */}
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mt-20"
        >
          <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            How It Works
          </h2>
          <p className="text-gray-400 max-w-3xl mx-auto mb-12">
            The Pixel-Safe Watermarking Extension uses advanced cryptographic
            watermarking technology to encode digital signatures into image data
            without altering visual quality. When viewed in the browser, the
            extension automatically verifies if an image has a valid watermark
            or if it’s been tampered with.
          </p>
        </Motion.div>
      </div>
    </Motion.div>
  );
};

export default BrowserExtensionPage;
