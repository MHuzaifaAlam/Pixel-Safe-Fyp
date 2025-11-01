import React, { useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  Users,
  Activity,
  Settings,
  BarChart3,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Eye,
  Trash2,
} from "lucide-react";

const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const stats = [
    { label: "Total Users", value: "12,847", change: "+12%", icon: Users, color: "text-blue-400" },
    { label: "Images Analyzed", value: "1,234,567", change: "+8%", icon: Activity, color: "text-green-400" },
    { label: "Tampering Detected", value: "23,456", change: "+15%", icon: AlertTriangle, color: "text-red-400" },
    { label: "System Uptime", value: "99.9%", change: "+0.1%", icon: Shield, color: "text-primary-400" },
  ];

  const recentUsers = [
    { id: 1, name: "John Doe", email: "john@example.com", status: "active", joined: "2024-01-15" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", status: "active", joined: "2024-01-14" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com", status: "inactive", joined: "2024-01-13" },
    { id: 4, name: "Alice Brown", email: "alice@example.com", status: "active", joined: "2024-01-12" },
  ];

  const systemLogs = [
    { id: 1, type: "info", message: "Model retrained successfully", timestamp: "2024-01-15 14:30:00" },
    { id: 2, type: "warning", message: "High CPU usage detected", timestamp: "2024-01-15 14:25:00" },
    { id: 3, type: "error", message: "Failed to process batch job #1234", timestamp: "2024-01-15 14:20:00" },
    { id: 4, type: "info", message: "Database backup completed", timestamp: "2024-01-15 14:15:00" },
  ];

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "system", label: "System", icon: Settings },
    { id: "logs", label: "Logs", icon: Activity },
  ];

  const getLogIcon = (type) => {
    switch (type) {
      case "info":
        return <CheckCircle className="h-4 w-4 text-blue-400" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-orange-400" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      default:
        return <Activity className="h-4 w-4 text-dark-400" />;
    }
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-20 pb-10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary-400 to-violet-400 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-dark-300 text-lg">
            Monitor system performance, manage users, and control AI models.
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex space-x-1 bg-dark-800 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-md font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-primary-500 to-violet-500 text-white shadow-lg"
                    : "text-dark-300 hover:text-white hover:bg-dark-700"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* === Overview Tab === */}
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-600 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                    <span className="text-green-400 text-sm font-medium">
                      {stat.change}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-dark-300 text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Chart placeholders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-dark-800/50 rounded-xl border border-dark-600 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Analysis Trends</h3>
                <div className="h-64 bg-dark-700 rounded-lg flex items-center justify-center text-dark-400">
                  Chart Placeholder
                </div>
              </div>
              <div className="bg-dark-800/50 rounded-xl border border-dark-600 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Detection Accuracy</h3>
                <div className="h-64 bg-dark-700 rounded-lg flex items-center justify-center text-dark-400">
                  Chart Placeholder
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* === Users Tab === */}
        {activeTab === "users" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">User Management</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-gradient-to-r from-primary-500 to-violet-500 rounded-lg font-medium text-white hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-300"
              >
                Add User
              </motion.button>
            </div>

            <div className="bg-dark-800/50 rounded-xl border border-dark-600 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-600">
                    {recentUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-dark-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-white">{user.name}</div>
                            <div className="text-sm text-dark-300">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.status === "active"
                                ? "bg-green-400/20 text-green-400"
                                : "bg-red-400/20 text-red-400"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                          {user.joined}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-primary-400 hover:text-primary-300">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="text-red-400 hover:text-red-300">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* === System Tab === */}
        {activeTab === "system" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-white">System Control</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-dark-800/50 rounded-xl border border-dark-600 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">AI Model Management</h3>
                <div className="space-y-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-4 py-3 bg-gradient-to-r from-primary-500 to-violet-500 rounded-lg font-medium text-white hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Retrain Model</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-4 py-3 bg-dark-700 hover:bg-dark-600 rounded-lg font-medium text-white transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export Model</span>
                  </motion.button>
                </div>
              </div>

              <div className="bg-dark-800/50 rounded-xl border border-dark-600 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">System Maintenance</h3>
                <div className="space-y-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium text-white transition-all duration-300"
                  >
                    Clear Cache
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium text-white transition-all duration-300"
                  >
                    Restart Services
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* === Logs Tab === */}
        {activeTab === "logs" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">System Logs</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg font-medium text-white transition-all duration-300 flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </motion.button>
            </div>

            <div className="bg-dark-800/50 rounded-xl border border-dark-600 p-6">
              <div className="space-y-3">
                {systemLogs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-3 p-3 bg-dark-700/50 rounded-lg">
                    {getLogIcon(log.type)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white">{log.message}</div>
                      <div className="text-xs text-dark-400 mt-1">{log.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
      </Motion.div>);
};

export default AdminDashboardPage;
