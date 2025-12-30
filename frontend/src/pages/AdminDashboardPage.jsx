import React, { useState, useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  FileImage,
  Layers,
  CheckCircle,
  Clock,
  RefreshCcw,
  Trash2,
  ExternalLink,
  AlertCircle,
  Download,
  X
} from "lucide-react";
import api from "../api";
import toast, { Toaster } from "react-hot-toast";
import { Link } from "react-router-dom";

const AdminDashboardPage = () => {
  const [images, setImages] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

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
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
      toast.error("Failed to sync history.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBatch = async (batchId) => {
    const load = toast.loading("Loading batch details...");
    try {
      // ✅ Using BatchID as requested
      const res = await api.get(`batches/${batchId}/images/`);
      setSelectedBatch(res.data);
      setIsBatchModalOpen(true);
      toast.dismiss(load);
    } catch (err) {
      console.error("Batch Details Error:", err);
      toast.error("Could not load batch details", { id: load });
    }
  };

  const handleDownload = async (imageUrl, fileName) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || "pixel_safe_export.png";
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      toast.error("Download failed",err);
    }
  };

  const handleDeleteImage = async (id) => {
    if (!window.confirm("Delete this image permanently?")) return;
    try {
      await api.delete(`images/${id}/`);
      setImages(prev => prev.filter(img => img.ImageID !== id));
      
      // Update modal images if user deletes while popup is open
      if (selectedBatch) {
        setSelectedBatch(prev => ({
          ...prev,
          images: prev.images.filter(img => img.ImageID !== id)
        }));
      }
      toast.success("Image deleted");
    } catch (err) {
      toast.error("Delete failed",err);
    }
  };

  const userStats = [
    { label: "Your Images", value: images.length, icon: FileImage, color: "text-cyan-400" },
    { label: "Active Batches", value: batches.length, icon: Layers, color: "text-violet-400" },
    { label: "Processed", value: images.filter(i => i.Status === 'Completed').length, icon: CheckCircle, color: "text-green-400" },
  ];

  return (
    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen pt-24 pb-12 bg-[#050505] text-white px-4 md:px-8">
      <Toaster />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">My Workspace</h1>
            <p className="text-gray-400 mt-1 text-sm">Forensic history and batch management.</p>
          </div>
          <div className="flex gap-3">
             <Link to="/upload" className="px-4 py-2 bg-cyan-500 rounded-lg text-sm font-semibold hover:bg-cyan-400 transition-colors">+ New Upload</Link>
             <button onClick={fetchUserData} className="p-2 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors">
               <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
             </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {userStats.map((stat) => (
            <div key={stat.label} className="bg-[#0f0f1a] border border-gray-800 p-6 rounded-2xl flex items-center gap-4 shadow-lg">
              <div className="p-3 bg-[#141420] rounded-xl"><stat.icon className={stat.color} size={24} /></div>
              <div><p className="text-gray-400 text-xs uppercase tracking-widest">{stat.label}</p><p className="text-2xl font-bold">{stat.value}</p></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Table */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-semibold flex items-center gap-2"><Clock size={20} className="text-cyan-400" /> Recent Activity</h3>
            <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#141420] text-gray-500 text-xs font-bold uppercase tracking-tighter">
                    <tr>
                      <th className="px-6 py-4">Image</th>
                      <th className="px-6 py-4 text-center">Action</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Result</th>
                      <th className="px-6 py-4 text-right">Tools</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {!loading && images.slice(0, 8).map((img) => (
                      <tr key={img.ImageID} className="group hover:bg-[#1a1a2e] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={img.image} className="h-10 w-10 rounded object-cover border border-gray-700" alt="" />
                            <div className="text-sm font-medium truncate max-w-[120px] text-gray-200">{img.fileName}</div>
                          </div>
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
                        <td className="px-6 py-4 font-mono text-xs text-cyan-400">
                          {img.Status === 'Completed' ? (img.metadata?.detection_result || "Success") : <span className="text-gray-500 italic">Processing...</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleDownload(img.image, img.fileName)} className="p-1.5 text-gray-400 hover:text-cyan-400"><Download size={16} /></button>
                            <button onClick={() => handleDeleteImage(img.ImageID)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                <div 
                  key={batch.BatchID} 
                  onClick={() => handleOpenBatch(batch.BatchID)}
                  className="bg-[#0f0f1a] border border-gray-800 p-4 rounded-xl hover:border-violet-500 cursor-pointer transition-all shadow-md group"
                >
                   <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm group-hover:text-violet-400">{batch.name}</h4>
                      <ExternalLink size={14} className="text-gray-500" />
                   </div>
                   <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase">
                      <span>{batch.image_count} Images</span>
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBatchModalOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <Motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-4xl bg-[#0f0f1a] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#141420]">
                <div>
                  <h2 className="text-xl font-bold">{selectedBatch.batch_name}</h2>
                  <p className="text-xs text-gray-500 uppercase tracking-tighter">Images in Batch: {selectedBatch.total_images}</p>
                </div>
                <button onClick={() => setIsBatchModalOpen(false)} className="p-2 hover:bg-gray-800 rounded-full"><X size={20} /></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4">
                <table className="w-full text-left">
                  <thead className="text-gray-500 text-[10px] font-bold uppercase tracking-widest border-b border-gray-800">
                    <tr>
                      <th className="px-4 py-3">Image</th>
                      <th className="px-4 py-3 text-center">Action</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Result</th>
                      <th className="px-4 py-3 text-right">Tools</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {selectedBatch.images.map((img) => (
                      <tr key={img.ImageID} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-4 flex items-center gap-3">
                            <img src={img.image} className="h-8 w-8 rounded object-cover border border-gray-700" alt="" />
                            <p className="text-xs font-medium text-gray-300 truncate max-w-[120px]">{img.fileName}</p>
                        </td>
                        <td className="px-4 py-4 text-center">
                           <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">
                             {img.metadata?.action_mode === 'watermark' ? 'Protected' : 'Analysis'}
                           </span>
                        </td>
                        <td className="px-4 py-4 text-[11px]">
                          <div className={`flex items-center gap-1.5 ${img.Status === 'Completed' ? 'text-green-400' : 'text-yellow-500'}`}>
                             {img.Status === 'Completed' ? <CheckCircle size={12} /> : <Clock size={12} />}
                             <span className="capitalize">{img.Status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-mono text-[10px] text-cyan-400">
                          {img.Status === 'Completed' ? (img.metadata?.detection_result || "Success") : "Processing..."}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleDownload(img.image, img.fileName)} className="p-1 text-gray-400 hover:text-cyan-400"><Download size={14} /></button>
                            <button onClick={() => handleDeleteImage(img.ImageID)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                          </div>
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
    </Motion.div>
  );
};

export default AdminDashboardPage;