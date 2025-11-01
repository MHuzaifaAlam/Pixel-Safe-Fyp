import React from 'react';

import { AlertTriangle, CheckCircle, Download, Eye, BarChart3 } from 'lucide-react';

const ResultsPage = () => {
  const confidenceScore = 87;
  const tamperedRegions = [
    { id: 1, x: 120, y: 80, width: 60, height: 40, confidence: 92 },
    { id: 2, x: 200, y: 150, width: 80, height: 50, confidence: 78 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-20 pb-10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary-400 to-violet-400 bg-clip-text text-transparent">
            Analysis Results
          </h1>
          <p className="text-dark-300 text-lg">
            Detailed forensic analysis of your uploaded image
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Results */}
          <div className="lg:col-span-2">
            {/* Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-600 p-6 mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-8 w-8 text-orange-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">Tampering Detected</h2>
                    <p className="text-dark-300">Potential manipulation found in image</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-orange-400">{confidenceScore}%</div>
                  <div className="text-sm text-dark-300">Confidence</div>
                </div>
              </div>

              {/* Confidence Bar */}
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-dark-300">Confidence Score</span>
                  <span className="text-sm text-orange-400">{confidenceScore}%</span>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${confidenceScore}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Image Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-600 p-6 mb-6"
            >
              <h3 className="text-xl font-semibold mb-4 text-white flex items-center">
                <Eye className="mr-2 h-5 w-5 text-primary-400" />
                Visual Analysis
              </h3>

              <div className="relative bg-dark-700 rounded-lg p-4 mb-4">
                <div className="aspect-video bg-gradient-to-br from-dark-600 to-dark-800 rounded-lg relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-dark-400">
                    Original Image with Heatmap Overlay
                  </div>

                  {tamperedRegions.map((region) => (
                    <motion.div
                      key={region.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 0.7, scale: 1 }}
                      transition={{ delay: 0.8 + region.id * 0.2 }}
                      className="absolute border-2 border-red-400 bg-red-400/20 rounded"
                      style={{
                        left: `${(region.x / 400) * 100}%`,
                        top: `${(region.y / 300) * 100}%`,
                        width: `${(region.width / 400) * 100}%`,
                        height: `${(region.height / 300) * 100}%`,
                      }}
                    >
                      <div className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        {region.confidence}%
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm border border-red-500/30">
                  High Risk Region
                </span>
                <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm border border-orange-500/30">
                  Medium Risk Region
                </span>
                <span className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full text-sm border border-primary-500/30">
                  Metadata Analysis
                </span>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-600 p-6"
            >
              <h3 className="text-lg font-semibold mb-4 text-white flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-primary-400" />
                Analysis Summary
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-dark-300">Processing Time</span>
                  <span className="text-white">1.3s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-300">Image Size</span>
                  <span className="text-white">1920x1080</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-300">File Format</span>
                  <span className="text-white">JPEG</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-300">Color Depth</span>
                  <span className="text-white">24-bit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-300">Regions Flagged</span>
                  <span className="text-orange-400">{tamperedRegions.length}</span>
                </div>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-600 p-6"
            >
              <h3 className="text-lg font-semibold mb-4 text-white">Actions</h3>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-primary-500 to-violet-500 rounded-lg font-medium text-white flex items-center justify-center space-x-2 hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-300"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Report</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-4 py-3 bg-dark-700 hover:bg-dark-600 rounded-lg font-medium text-white flex items-center justify-center space-x-2 transition-all duration-300"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Details</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-4 py-3 border border-primary-500 hover:bg-primary-500/10 rounded-lg font-medium text-primary-400 flex items-center justify-center space-x-2 transition-all duration-300"
                >
                  <span>Analyze Another</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Technical Details */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-600 p-6"
            >
              <h3 className="text-lg font-semibold mb-4 text-white">Technical Analysis</h3>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-dark-300 mb-1">EXIF Data</div>
                  <div className="text-green-400">✓ Consistent</div>
                </div>
                <div>
                  <div className="text-dark-300 mb-1">Compression Artifacts</div>
                  <div className="text-orange-400">⚠ Anomalies Detected</div>
                </div>
                <div>
                  <div className="text-dark-300 mb-1">Noise Pattern</div>
                  <div className="text-red-400">✗ Inconsistent</div>
                </div>
                <div>
                  <div className="text-dark-300 mb-1">Edge Analysis</div>
                  <div className="text-orange-400">⚠ Suspicious Edges</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ResultsPage;
