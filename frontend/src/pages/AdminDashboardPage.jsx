import React, { useState, useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  FileImage, Layers, CheckCircle, Clock, RefreshCcw,
  Trash2, ExternalLink, Download, X, FileText, Fingerprint, ShieldAlert
} from "lucide-react";
import api from "../api";
import toast, { Toaster } from "react-hot-toast";
import { Link } from "react-router-dom";

const AdminDashboardPage = () => {
  const [images, setImages] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllReports, setShowAllReports] = useState(false);
  
  // Hover & Position States
  const [hoveredImage, setHoveredImage] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Batch States
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
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to sync forensic records.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ NEW: Helper to format the AI score dynamically
   * Rounds to 1 decimal place and handles null/undefined
   */
  const formatScore = (val) => {
    if (val === undefined || val === null) return "0.0";
    const num = parseFloat(val);
    return isNaN(num) ? "0.0" : num.toFixed(1);
  };

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX + 20, y: e.clientY + 20 });
  };

  const handleOpenBatch = async (batchId) => {
    const load = toast.loading("Opening Batch...");
    try {
      const res = await api.get(`batches/${batchId}/images/`);
      setSelectedBatch(Array.isArray(res.data) ? { images: res.data, name: "Batch Analysis" } : res.data);
      setIsBatchModalOpen(true);
      toast.dismiss(load);
    } catch (err) {
      console.error("Batch error:", err);
      toast.error("Load failed", { id: load });
    }
  };

  const getForensicAction = (img) => {
    const mode = img.metadata?.action_mode;
    if (mode === 'watermark') return "Watermarked";
    if (img.metadata?.scan_mode === 'gan') return "AI Scan";
    if (img.metadata?.visual_url || img.result?.includes('|')) return "Verification";
    return "Processed";
  };

  const downloadSingleReport = async (imageID) => {
    if (!imageID) return toast.error("Report reference missing.");
    const load = toast.loading("Generating Forensic PDF...");
    try {
      const response = await api.post("reports/generate/", { image_id: imageID }, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success("Dossier Prepared", { id: load });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Generation failed.", { id: load });
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
      link.click();
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Download failed");
    }
  };

  const handleDeleteImage = async (id) => {
    if (!window.confirm("Purge record permanently?")) return;
    const load = toast.loading("Purging...");
    try {
      await api.delete(`images/${id}/`);
      setImages(prev => prev.filter(img => img.ImageID !== id));
      toast.success("Record Purged", { id: load });
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Purge failed", { id: load });
    }
  };

  const getImageUrl = (img) => {
    if (!img) return "";

    // ✅ THE UNIVERSAL PRIORITY LIST:
    // It checks for results from ALL forensic tools before showing the original
    const path = 
      img.metadata?.forensic_visualization || // 1. Tamper Highlights (Integrity)
      img.metadata?.visual_url ||             // 2. AI Scan Results (AI Scan)
      img.metadata?.comparison_url ||         // 3. Side-by-side (Watermark Verify)
      img.metadata?.heatmap_url ||            // 4. Heatmap fallback
      img.image;                              // 5. Original Upload (Fallback)

    if (!path) return "";

    // If backend already provides the full URL
    if (path.startsWith('http')) return path;

    // Build the full URL for relative paths
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BACKEND_BASE}${cleanPath}`;
  };
  const userStats = [
    { label: "Your Images", value: images.length, icon: FileImage, color: "text-cyan-400" },
    { label: "Active Batches", value: batches.length, icon: Layers, color: "text-violet-400" },
    { label: "Processed", value: images.filter(i => i.Status === 'Completed').length, icon: CheckCircle, color: "text-green-400" },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 bg-[#050505] text-white px-4 md:px-8">
      <Toaster />

      {/* --- FORENSIC HOVER POPUP (Score Included) --- */}
      <AnimatePresence>
        {hoveredImage && (
          <Motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ position: 'fixed', left: mousePos.x, top: mousePos.y, zIndex: 9999 }}
            className="pointer-events-none bg-[#0a0a0f] border border-cyan-500/50 p-5 rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.2)] backdrop-blur-xl w-72"
          >
            <img src={getImageUrl(hoveredImage)} className="w-full h-32 object-contain rounded-lg mb-3 bg-black border border-gray-800" alt="Analysis View" />
            
            <div className="space-y-3 border-t border-gray-800 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-xs italic">Forensic AI Score:</span>
                <span className="text-cyan-400 font-black text-sm font-mono">
                  {/* Pulls score directly from metadata */}
                  {formatScore(hoveredImage.metadata?.ai_score || hoveredImage.score)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-xs italic">Verdict:</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${hoveredImage.metadata?.detection_result?.toLowerCase().includes('tamper') ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-400'}`}>
                  {hoveredImage.metadata?.detection_result || "Authentic"}
                </span>
              </div>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-linear-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent italic tracking-tight">Forensic Command Center</h1>
            <p className="text-gray-400 mt-1 text-sm font-mono tracking-tighter uppercase opacity-60">Dossier History & Integrity Logs</p>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setShowAllReports(!showAllReports)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border ${showAllReports ? 'bg-violet-600 border-violet-500' : 'bg-gray-900 border-gray-800 text-gray-400'}`}>
                {showAllReports ? "Activity Logs" : "Report Archive"}
             </button>
             <Link to="/upload" className="px-4 py-2 bg-cyan-500 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-cyan-400 transition-all text-black shadow-lg shadow-cyan-500/20">+ New Scan</Link>
          </div>
        </div>

        {/* --- STATS SECTION --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {userStats.map((stat) => (
            <div key={stat.label} className="bg-[#0f0f1a] border border-gray-800 p-6 rounded-2xl flex items-center gap-4 shadow-lg group hover:border-gray-700 transition-colors">
              <div className="p-3 bg-[#141420] rounded-xl"><stat.icon className={stat.color} size={24} /></div>
              <div><p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">{stat.label}</p><p className="text-2xl font-black">{stat.value}</p></div>
            </div>
          ))}
        </div>

        {showAllReports ? (
          /* --- REPORT ARCHIVE CARDS (Shows score) --- */
          <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {images.filter(img => img.Status === 'Completed').map(img => (
               <div key={img.ImageID} className="bg-[#0f0f1a] border border-gray-800 p-5 rounded-3xl hover:border-cyan-500/30 transition-all group relative">
                  <div className="flex gap-4 mb-5">
                    <img src={getImageUrl(img)} className="h-16 w-16 rounded-2xl object-cover border border-gray-800 shadow-xl" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate text-gray-200">{img.fileName}</p>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-gray-900 border border-gray-800 rounded text-cyan-400 mt-2 inline-block">
                        AI Score: {formatScore(img.metadata?.ai_score || img.score)}%
                      </span>
                    </div>
                  </div>
                  <button onClick={() => downloadSingleReport(img.ImageID)} className="w-full py-3 bg-gray-900 border border-gray-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500 hover:text-black transition-all flex items-center justify-center gap-2">
                    <Download size={14} /> Download Dossier
                  </button>
               </div>
             ))}
          </Motion.div>
        ) : (
          /* --- RECENT ACTIVITY TABLE --- */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-xl font-semibold flex items-center gap-2 italic tracking-tight"><Clock size={20} className="text-cyan-400" /> Recent Logs</h3>
              <div className="bg-[#0f0f1a] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                <table className="w-full text-left">
                  <thead className="bg-[#141420] text-gray-500 text-[10px] font-black uppercase tracking-widest border-b border-gray-800">
                    <tr>
                      <th className="px-6 py-5">Evidence</th>
                      <th className="px-6 py-5 text-center">Action</th>
                      <th className="px-6 py-5">Status</th>
                      <th className="px-6 py-5 text-right">Tools</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {loading ? (
                      <tr><td colSpan="4" className="p-20 text-center">
                        <RefreshCcw className="animate-spin text-cyan-400 mx-auto" size={30} />
                      </td></tr>
                    ) : images.map((img) => (
                      <tr 
                        key={img.ImageID} 
                        className="group hover:bg-white/[0.02] transition-colors cursor-crosshair"
                        onMouseEnter={() => setHoveredImage(img)}
                        onMouseLeave={() => setHoveredImage(null)}
                        onMouseMove={handleMouseMove}
                      >
                        <td className="px-6 py-4 flex items-center gap-4">
                          <img src={getImageUrl(img)} className="h-12 w-12 rounded-xl object-cover border border-gray-800 group-hover:scale-105 transition-transform" alt="" />
                          <div className="text-xs font-bold truncate max-w-[150px] text-gray-300">{img.fileName}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border transition-all ${
                              getForensicAction(img) === 'Watermarked' ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' : 
                              getForensicAction(img) === 'AI Scan' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 
                              'bg-green-500/10 border-green-500/30 text-green-400'
                           }`}>
                             {getForensicAction(img)}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className={`flex items-center gap-1.5 font-mono text-[10px] font-bold ${img.Status === 'Completed' ? 'text-green-400' : 'text-yellow-500'}`}>
                             {img.Status === 'Completed' ? <CheckCircle size={14} /> : <Clock size={14} />}
                             <span className="uppercase">{img.Status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            {img.Status === 'Completed' && (
                              <button onClick={() => downloadSingleReport(img.ImageID)} className="p-2 text-cyan-400 hover:bg-cyan-400 hover:text-black rounded-xl transition-all"><FileText size={16} /></button>
                            )}
                            <button onClick={() => handleDownloadImage(getImageUrl(img), img.fileName)} className="p-2 text-gray-500 hover:text-white transition-all"><Download size={16} /></button>
                            <button onClick={() => handleDeleteImage(img.ImageID)} className="p-2 text-gray-500 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Evidence Batches */}
            <div className="space-y-6">
                <h3 className="text-xl font-semibold flex items-center gap-2 italic tracking-tight"><Layers size={20} className="text-violet-400" /> Evidence Batches</h3>
                <div className="space-y-3">
                  {batches.map((batch) => (
                    <div key={batch.BatchID} onClick={() => handleOpenBatch(batch.BatchID)} className="bg-[#0f0f1a] border border-gray-800 p-5 rounded-3xl hover:border-violet-500/50 cursor-pointer transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity"><ExternalLink size={16} className="text-violet-400" /></div>
                        <h4 className="font-bold text-sm mb-1 group-hover:text-violet-400 transition-colors">{batch.name || "UNNAMED_BATCH"}</h4>
                        <div className="flex justify-between items-center text-[9px] text-gray-500 font-black uppercase">
                          <span className="bg-gray-900 px-2 py-0.5 rounded-full">{batch.image_count} Items</span>
                          <span>{new Date(batch.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                  ))}
                </div>
            </div>
          </div>
        )}
      </div>

      {/* --- BATCH MODAL --- */}
      <AnimatePresence>
        {isBatchModalOpen && selectedBatch && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBatchModalOpen(false)} className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
            <Motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-4xl bg-[#0f0f1a] border border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
               <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-[#141420]">
                <h2 className="text-2xl font-black uppercase tracking-tighter italic">Batch Contents</h2>
                <button onClick={() => setIsBatchModalOpen(false)} className="p-3 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-full transition-all"><X size={28} /></button>
              </div>
              <div className="overflow-y-auto p-6">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-gray-800/50">
                    {selectedBatch.images?.map((img) => (
                      <tr key={img.ImageID} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-5 flex items-center gap-4">
                            <img src={getImageUrl(img)} className="h-12 w-12 rounded-xl object-cover border border-gray-800" alt="" />
                            <p className="text-xs font-bold text-gray-300">{img.fileName}</p>
                        </td>
                        <td className="px-6 py-5 text-right flex justify-end gap-2">
                             <button onClick={() => downloadSingleReport(img.ImageID)} className="p-2 text-cyan-400 hover:bg-cyan-400 hover:text-black rounded-lg transition-all"><FileText size={18} /></button>
                             <button onClick={() => handleDownloadImage(getImageUrl(img), img.fileName)} className="p-2 text-gray-500 hover:text-white transition-all"><Download size={18} /></button>
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