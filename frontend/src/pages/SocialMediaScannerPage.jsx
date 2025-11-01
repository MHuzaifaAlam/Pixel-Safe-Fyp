import React, { useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  Search,
  Hash,
  AlertTriangle,
  CheckCircle,
  Eye,
  Download,
  RefreshCw,
} from "lucide-react";

const SocialMediaScannerPage = () => {
  const [hashtag, setHashtag] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState([]);

  const mockResults = [
    {
      id: "1",
      url: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg",
      platform: "twitter",
      timestamp: "2h ago",
      result: "clean",
      confidence: 94,
      likes: 1240,
      shares: 89,
    },
    {
      id: "2",
      url: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg",
      platform: "instagram",
      timestamp: "4h ago",
      result: "tampered",
      confidence: 87,
      likes: 3456,
      shares: 234,
    },
    {
      id: "3",
      url: "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg",
      platform: "facebook",
      timestamp: "6h ago",
      result: "suspicious",
      confidence: 73,
      likes: 567,
      shares: 45,
    },
    {
      id: "4",
      url: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg",
      platform: "twitter",
      timestamp: "8h ago",
      result: "clean",
      confidence: 98,
      likes: 2890,
      shares: 156,
    },
  ];

  const handleScan = () => {
    if (!hashtag.trim()) return;

    setIsScanning(true);
    setScanResults([]);

    setTimeout(() => {
      setScanResults(mockResults);
      setIsScanning(false);
    }, 3000);
  };

  const getResultIcon = (result) => {
    switch (result) {
      case "clean":
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "tampered":
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case "suspicious":
        return <AlertTriangle className="h-5 w-5 text-orange-400" />;
      default:
        return null;
    }
  };

  const getPlatformColor = (platform) => {
    switch (platform) {
      case "twitter":
        return "bg-blue-500";
      case "instagram":
        return "bg-pink-500";
      case "facebook":
        return "bg-blue-600";
      default:
        return "bg-gray-500";
    }
  };

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
            "radial-gradient(circle at 20% 30%, rgba(147,51,234,0.08), transparent 60%)",
            "radial-gradient(circle at 70% 80%, rgba(6,182,212,0.08), transparent 60%)",
            "radial-gradient(circle at 50% 50%, rgba(236,72,153,0.08), transparent 60%)",
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, repeatType: "mirror" }}
      />

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <Motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            Social Media Scanner
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Scan hashtags across social media to detect tampered or AI-generated
            images and prevent misinformation spread.
          </p>
        </Motion.div>

        {/* Search Section */}
        <Motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <div className="bg-[#0f0f18]/70 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter hashtag (e.g., breakingnews, election2024)"
                  value={hashtag}
                  onChange={(e) => setHashtag(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#101018] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors"
                  onKeyPress={(e) => e.key === "Enter" && handleScan()}
                />
              </div>
              <Motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleScan}
                disabled={isScanning || !hashtag.trim()}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 flex items-center space-x-2"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Scanning...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Scan</span>
                  </>
                )}
              </Motion.button>
            </div>
          </div>
        </Motion.div>

        {/* Scanning Animation */}
        {isScanning && (
          <Motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="max-w-md mx-auto bg-[#0f0f18]/70 backdrop-blur-sm rounded-xl border border-gray-700 p-8">
              <div className="relative mb-4">
                <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto"></div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Scanning Social Media
              </h3>
              <p className="text-gray-400">
                Fetching and analyzing images from #{hashtag}...
              </p>
            </div>
          </Motion.div>
        )}

        {/* Results Section */}
        {scanResults.length > 0 && (
          <Motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Scan Results for #{hashtag}
                </h2>
                <p className="text-gray-400">
                  Found {scanResults.length} images • Analyzed in 3.2 seconds
                </p>
              </div>
              <Motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-4 sm:mt-0 px-6 py-3 border border-cyan-500 rounded-lg font-semibold text-cyan-400 hover:bg-cyan-500/10 transition-all duration-300 flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export Report</span>
              </Motion.button>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {scanResults.map((result, index) => (
                <Motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-[#0f0f18]/70 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden hover:border-cyan-500/30 transition-all duration-300"
                >
                  <div className="aspect-video bg-[#101018] relative overflow-hidden">
                    <img
                      src={result.url}
                      alt="Social media post"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getPlatformColor(
                          result.platform
                        )}`}
                      >
                        {result.platform}
                      </div>
                    </div>
                    <div className="absolute top-3 right-3">
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${
                          result.result === "clean"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : result.result === "tampered"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                        }`}
                      >
                        {getResultIcon(result.result)}
                        <span>{result.result}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-lg font-semibold text-white mb-1">
                          {result.confidence}% Confidence
                        </div>
                        <div className="text-sm text-gray-400">
                          Posted {result.timestamp}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-400">
                        <div>{result.likes.toLocaleString()} likes</div>
                        <div>{result.shares} shares</div>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <Motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex-1 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all duration-300 flex items-center justify-center space-x-2"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Details</span>
                      </Motion.button>
                      <Motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-[#101018] hover:bg-[#1a1a24] rounded-lg text-gray-400 hover:text-white transition-all duration-300"
                      >
                        <Download className="h-4 w-4" />
                      </Motion.button>
                    </div>
                  </div>
                </Motion.div>
              ))}
            </div>
          </Motion.div>
        )}
      </div>
    </Motion.div>
  );
};

export default SocialMediaScannerPage;
