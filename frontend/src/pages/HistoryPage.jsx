import React, { useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  FileImage,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

const HistoryPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const historyData = [
    {
      id: "1",
      fileName: "portrait_analysis.jpg",
      date: "2024-01-15",
      time: "14:30",
      result: "tampered",
      confidence: 87,
      type: "single",
    },
    {
      id: "2",
      fileName: "batch_analysis_001",
      date: "2024-01-14",
      time: "09:15",
      result: "clean",
      confidence: 94,
      type: "batch",
      batchSize: 5,
    },
    {
      id: "3",
      fileName: "social_media_image.png",
      date: "2024-01-13",
      time: "16:45",
      result: "suspicious",
      confidence: 73,
      type: "single",
    },
    {
      id: "4",
      fileName: "document_scan.tiff",
      date: "2024-01-12",
      time: "11:20",
      result: "clean",
      confidence: 98,
      type: "single",
    },
    {
      id: "5",
      fileName: "batch_analysis_002",
      date: "2024-01-11",
      time: "13:10",
      result: "tampered",
      confidence: 81,
      type: "batch",
      batchSize: 8,
    },
  ];

  const filteredData = historyData.filter((item) => {
    const matchesSearch = item.fileName
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterType === "all" || item.result === filterType;
    return matchesSearch && matchesFilter;
  });

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

  const getResultColor = (result) => {
    switch (result) {
      case "clean":
        return "text-green-400 bg-green-400/10 border-green-400/20";
      case "tampered":
        return "text-red-400 bg-red-400/10 border-red-400/20";
      case "suspicious":
        return "text-orange-400 bg-orange-400/10 border-orange-400/20";
      default:
        return "text-dark-400";
    }
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-20 pb-10 relative overflow-hidden bg-gradient-to-br from-[#050505] via-[#0a0a0f] to-[#111122] text-white"
    >
      {/* === Animated Background (same as previous pages) === */}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* === Header === */}
        <Motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1
            className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent 
            leading-[1.2] pb-2"  // 🔥 FIX: adds breathing space below so text like "g" isn't cut off
          >
            Analysis History
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            View and manage your previous image analyses and download detailed reports.
          </p>
        </Motion.div>

        {/* === Search and Filters === */}
        <Motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-[#0f0f18]/70 border border-gray-800 rounded-xl p-6 mb-8 backdrop-blur-md"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by filename..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#1a1a24] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-10 pr-8 py-3 bg-[#1a1a24] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="all">All Results</option>
                  <option value="clean">Clean</option>
                  <option value="tampered">Tampered</option>
                  <option value="suspicious">Suspicious</option>
                </select>
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="pl-10 pr-8 py-3 bg-[#1a1a24] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                  <option value="confidence">Sort by Confidence</option>
                </select>
              </div>
            </div>
          </div>
        </Motion.div>

        {/* === History List === */}
        <Motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="space-y-4"
        >
          {filteredData.map((item, index) => (
            <Motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-[#0f0f18]/70 backdrop-blur-sm rounded-xl border border-gray-800 p-6 hover:border-cyan-500/30 transition-all duration-300"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <FileImage className="h-10 w-10 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {item.fileName}
                      </h3>
                      {item.type === "batch" && (
                        <span className="px-2 py-1 text-xs bg-violet-500/20 text-violet-400 rounded-full border border-violet-500/30">
                          Batch ({item.batchSize})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>{item.date}</span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  {/* Result */}
                  <div className="flex items-center space-x-2">
                    {getResultIcon(item.result)}
                    <div className="text-right">
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getResultColor(
                          item.result
                        )}`}
                      >
                        {item.result.charAt(0).toUpperCase() +
                          item.result.slice(1)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {item.confidence}% confidence
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 bg-[#1a1a24] hover:bg-cyan-500/20 rounded-lg text-gray-400 hover:text-cyan-400 transition-all duration-300"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Motion.button>
                    <Motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 bg-[#1a1a24] hover:bg-cyan-500/20 rounded-lg text-gray-400 hover:text-cyan-400 transition-all duration-300"
                      title="Download Report"
                    >
                      <Download className="h-4 w-4" />
                    </Motion.button>
                  </div>
                </div>
              </div>
            </Motion.div>
          ))}
        </Motion.div>
      </div>
    </Motion.div>
  );
};

export default HistoryPage;
