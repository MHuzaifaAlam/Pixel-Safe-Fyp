import React, { useState, useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  FileImage, Layers, CheckCircle, Clock, RefreshCcw,
  Trash2, ExternalLink, Download, X, FileText, AlertCircle
} from "lucide-react";
import api from "../api";
import toast, { Toaster } from "react-hot-toast";
import { Link } from "react-router-dom";

const AdminDashboardPage = () => {
  const [images, setImages] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  const BACKEND_BASE = "http://127.0.0.1:8000";

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [imgRes, batchRes] = await Promise.all([
        api.get("images/"),
        api.get("batches/")
      ]);
      setImages(imgRes.data || []);
      setBatches(batchRes.data || []);
    } catch {
      toast.error("Failed to sync history.");
    } finally {
      setLoading(false);
    }
  };

 const downloadSingleReport = async (imageID) => {
    if (!imageID) return toast.error("Report reference missing. Ensure image is processed.");
    const load = toast.loading("Generating Forensic PDF...");
    try {
      const response = await api.post("reports/generate/", { image_id: imageID }, { responseType: 'blob' });
      const ctype = response.headers['content-type'] || '';
      const isPdf = ctype.includes('application/pdf');
      if (!isPdf) {
        const text = await response.data.text();
        try {
          const err = JSON.parse(text);
          throw new Error(err.detail || err.error || "Server logic failed");
        } catch (parseErr) {
          // Log original parse error for debugging, then throw a clean message
          console.error("PDF parse error:", parseErr);
          throw new Error(text || "Unexpected response while generating PDF");
        }
      }

      const blob = new Blob([response.data], { type: ctype || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const tab = window.open(url, '_blank', 'noopener');
      if (!tab) {
        toast.error("Popup blocked. Allow popups for PDF preview.", { id: load });
      } else {
        toast.success("PDF opened", { id: load });
      }
      // Keep the object URL alive so the browser's PDF viewer can download/save
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error(error.message || "PDF generation failed.", { id: load });
    }
  };

  const handleOpenBatch = async (batchId) => {
    const load = toast.loading("Loading batch...");
    try {
      const res = await api.get(`batches/${batchId}/images/`);
      const data = Array.isArray(res.data) ? { images: res.data, name: "Batch Details" } : res.data;
      setSelectedBatch(data);
      setIsBatchModalOpen(true);
      toast.dismiss(load);
    } catch {
      toast.error("Could not load batch", { id: load });
    }
  };

  const handleDownloadImage = async (imageUrl, fileName) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || "export.png";
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleDeleteImage = async (id) => {
    if (!window.confirm("Delete permanently?")) return;
    const load = toast.loading("Deleting...");
    try {
      await api.delete(`images/${id}/`);
      setImages(prev => prev.filter(img => img.ImageID !== id));
      toast.success("Deleted", { id: load });
    } catch {
      toast.error("Delete failed", { id: load });
    }
  };

  const getImageUrl = (url) => {
    if (!url) return "";
    return url.startsWith('http') ? url : `${BACKEND_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const userStats = [
    { label: "Your Images", value: images.length, icon: FileImage, color: "text-cyan-400" },
    { label: "Active Batches", value: batches.length, icon: Layers, color: "text-violet-400" },
    { label: "Processed", value: images.filter(i => i.Status === 'Completed').length, icon: CheckCircle, color: "text-green-400" },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 bg-[#050505] text-white px-4 md:px-8">
      <Toaster />
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-linear-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">My Dashboard</h1>
            <p className="text-gray-400 mt-1 text-sm">Forensic history and batch management.</p>
          </div>
          <div className="flex gap-3">
             <Link to="/upload" className="px-4 py-2 bg-cyan-500 rounded-lg text-sm font-semibold hover:bg-cyan-400 transition-colors">+ New Upload</Link>
             <button onClick={fetchUserData} className="p-2 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800">
               <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
             </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {userStats.map((stat) => (
            <div key={stat.label} className="bg-[#0f0f1a] border border-gray-800 p-6 rounded-2xl flex items-center gap-4 shadow-lg">
              <div className="p-3 bg-[#141420] rounded-xl"><stat.icon className={stat.color} size={24} /></div>
              <div><p className="text-gray-400 text-xs uppercase tracking-widest">{stat.label}</p><p className="text-2xl font-bold">{stat.value}</p></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Activity Table */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-semibold flex items-center gap-2"><Clock size={20} className="text-cyan-400" /> Recent Activity</h3>
            <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#141420] text-gray-500 text-xs font-bold uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Image</th>
                      <th className="px-6 py-4 text-center">Action</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Result</th>
                      <th className="px-6 py-4 text-right">Tools</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {loading ? (
                      <tr><td colSpan="5" className="p-20 text-center text-gray-500"><RefreshCcw className="animate-spin mx-auto mb-2 text-cyan-400" /> Syncing...</td></tr>
                    ) : images.length > 0 ? (
                      images.map((img) => (
                        <tr key={img.ImageID} className="group hover:bg-[#1a1a2e] transition-colors">
                          <td className="px-6 py-4 flex items-center gap-3">
                            <img src={getImageUrl(img.image)} className="h-10 w-10 rounded object-cover border border-gray-700" alt="" />
                            <div className="text-sm font-medium truncate max-w-[120px] text-gray-200">{img.fileName}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                             <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-300">
                               {img.metadata?.action_mode === 'watermark' ? 'Protected' : 'Analysis'}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className={`flex items-center gap-1.5 ${img.Status === 'Completed' ? 'text-green-400' : 'text-yellow-500'}`}>
                               {img.Status === 'Completed' ? <CheckCircle size={14} /> : <Clock size={14} />}
                               <span className="capitalize">{img.Status}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-cyan-400 uppercase">
                            {img.metadata?.detection_result || "N/A"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {img.Status === 'Completed' && (
                                <button onClick={() => downloadSingleReport(img.ImageID)} className="p-1.5 text-cyan-400 hover:bg-cyan-400/10 rounded" title="Download Report">
                                  <FileText size={16} />
                                </button>
                              )}
                              <button onClick={() => handleDownloadImage(getImageUrl(img.image), img.fileName)} className="p-1.5 text-gray-400 hover:text-white"><Download size={16} /></button>
                              <button onClick={() => handleDeleteImage(img.ImageID)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500">No activity found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Batches Sidebar */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold flex items-center gap-2"><Layers size={20} className="text-violet-400" /> My Batches</h3>
            <div className="space-y-4">
              {batches.map((batch) => (
                <div key={batch.BatchID} onClick={() => handleOpenBatch(batch.BatchID)} className="bg-[#0f0f1a] border border-gray-800 p-4 rounded-xl hover:border-violet-500 cursor-pointer transition-all shadow-md group">
                   <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm group-hover:text-violet-400">{batch.name || "Unnamed Batch"}</h4>
                      <ExternalLink size={14} className="text-gray-500" />
                   </div>
                   <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase">
                     <span>{batch.image_count} Items</span>
                     <span>{new Date(batch.created_at).toLocaleDateString()}</span>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- BATCH MODAL --- */}
      <AnimatePresence>
        {isBatchModalOpen && selectedBatch && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBatchModalOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <Motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-4xl bg-[#0f0f1a] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#141420]">
                <div><h2 className="text-xl font-bold">{selectedBatch.name || "Batch Contents"}</h2></div>
                <button onClick={() => setIsBatchModalOpen(false)} className="p-2 hover:bg-gray-800 rounded-full"><X size={24} /></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4">
                <table className="w-full text-left">
                  <thead className="text-gray-500 text-[10px] font-bold uppercase tracking-widest border-b border-gray-800 sticky top-0 bg-[#0f0f1a]">
                    <tr>
                      <th className="px-6 py-4">Image</th>
                      <th className="px-6 py-4">Result</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {selectedBatch.images?.map((img) => (
                      <tr key={img.ImageID} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                            <img src={getImageUrl(img.image)} className="h-10 w-10 rounded object-cover border border-gray-700" alt="" />
                            <p className="text-sm text-gray-300">{img.fileName}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-cyan-400">{img.metadata?.detection_result || "Success"}</td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                            {img.Status === 'Completed' && (
                                <button onClick={() => downloadSingleReport(img.ImageID)} className="p-1.5 text-cyan-400 hover:bg-cyan-400/10 rounded"><FileText size={16} /></button>
                            )}
                            <button onClick={() => handleDownloadImage(getImageUrl(img.image), img.fileName)} className="p-1.5 text-gray-400"><Download size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboardPage;