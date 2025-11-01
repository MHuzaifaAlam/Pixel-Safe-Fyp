import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

import Home from './pages/Home'
import ImageUploadPage from './pages/ImageUploadPage'
import ResultsPage from './pages/ResultPage'
import HistoryPage from './pages/HistoryPage'
import BrowserExtensionPage from './pages/BrowserExtensionPage'
import SocialMediaScannerPage from './pages/SocialMediaScannerPage'
import LoginPage from './pages/LoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'

import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-dark-900 text-white overflow-x-hidden">
        <Navbar />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<ImageUploadPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/extension" element={<BrowserExtensionPage />} />
            <Route path="/social-scanner" element={<SocialMediaScannerPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
          </Routes>
        </AnimatePresence>
        <Footer />
      </div>
    </Router>
  )
}
