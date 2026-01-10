import React, { useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import api from "../api";
import {
  Upload, Clock, XCircle, ShieldCheck, Search, Zap, X, Fingerprint, Image as ImageIcon, Download
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const ImageUploadPage = () => {
  const [files, setFiles] = useState([]);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  // ✅ Changed to an array to handle multiple results
  const [verificationData, setVerificationData] = useState([]); 
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);

  const BACKEND_URL = "http://127.0.0.1:8000";

  const resolveUrl = (u) => {
    if (!u) return "";
    if (u.startsWith("blob:") || u.startsWith("data:") || u.startsWith("http")) return u;
    const path = u.startsWith("/") ? u : `/${u}`;
    return `${BACKEND_URL}${path}`;
  };

  const handleFileUpload = (uploadedFiles) => {
    const fileArray = Array.from(uploadedFiles).slice(0, 10);
    const newFiles = fileArray.map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file: file,
      preview: URL.createObjectURL(file),
      name: file.name,
      status: "pending",
      result: null,
      db_id: null,
    }));
    setFiles((prev) => [...prev, ...newFiles].slice(0, 10));
  };

  const handleRemoveFile = (id) => setFiles((prev) => prev.filter((file) => file.id !== id));

  const uploadSingleFile = async (fileObj, mode) => {
    const formData = new FormData();
    formData.append("image", fileObj.file);
    formData.append("action_mode", mode);
    const response = await api.post("images/", formData, { 
      headers: { "Content-Type": "multipart/form-data" } 
    });
    return Array.isArray(response.data.images) ? response.data.images[0] : response.data;
  };

  // ✅ BATCH AI SCAN: Handles multiple images and shows all in popup
  const handleMLAnalysis = async () => {
    if (files.length === 0) return toast.error("Please select images first.");
    setShowAnalysisModal(false);
    const load = toast.loading(`Scanning ${files.length} images...`);
    const resultsArray = [];
    
    try {
      for (const fileObj of files) {
        const dbImage = await uploadSingleFile(fileObj, "analysis");
        const res = await api.post("scan/", { 
            image_id: dbImage.ImageID,
            scan_mode: "gan" 
        });
        
        const s = res.data.score || 0;
        let verdict = res.data.verdict;
        if (!verdict || verdict === "Analysis Complete") {
            if (s > 80) verdict = "HIGH AI INTENSITY";
            else if (s > 50) verdict = "MODERATE AI INTENSITY";
            else if (s > 25) verdict = "LOW INTENSITY AI";
            else verdict = "AUTHENTIC / REAL";
        }

        resultsArray.push({
          status: verdict, 
          score: s.toFixed(2),
          display_image: res.data.visual_url || dbImage.image,
          image_id: dbImage.ImageID,
          name: fileObj.name
        });

        setFiles(prev => prev.map(f => f.id === fileObj.id ? { 
          ...f, status: "completed", result: verdict, db_id: dbImage.ImageID 
        } : f));
      }
      setVerificationData(resultsArray);
      setShowVerifyPopup(true);
      toast.success("Batch Scan Complete", { id: load });
    } catch (error) {
      console.error(error);
      toast.error("Batch scan failed.", { id: load });
    }
  };

  // ✅ BATCH INTEGRITY VERIFY: Handles multiple images
  const handleVerifyWatermark = async () => {
    if (files.length === 0) return toast.error("No images selected.");
    const load = toast.loading(`Verifying Batch (${files.length} images)...`);
    const resultsArray = [];

    try {
      for (const fileObj of files) {
        const fd = new FormData();
        fd.append("image", fileObj.file);
        fd.append("scan_mode", "gan");

        const [watermarkRes, aiRes] = await Promise.all([
          api.post("watermark/auto-verify/", fd),
          api.post("scan/", fd)
        ]);

        const imageId = watermarkRes.data.image_id || aiRes.data.image_id;
        const isAuthentic = watermarkRes.data.status?.toLowerCase().includes("authentic");
        const finalStatus = isAuthentic ? "AUTHENTIC / REAL" : "TAMPERED / MODIFIED";

        resultsArray.push({
          status: finalStatus,
          score: (aiRes.data.score || 0).toFixed(2),
          display_image: watermarkRes.data.forensic_visualization || watermarkRes.data.comparison_url || fileObj.preview,
          image_id: imageId,
          name: fileObj.name
        });

        setFiles(prev => prev.map(f => f.id === fileObj.id ? { 
          ...f, status: "completed", result: `${finalStatus} | AI: ${aiRes.data.score}%`, db_id: imageId 
        } : f));
      }
      setVerificationData(resultsArray);
      setShowVerifyPopup(true);
      toast.success("Batch Integrity Verified", { id: load });
    } catch (error) {
      console.error(error);
      toast.error("Batch verification failed.", { id: load });
    }
  };

  const downloadSingleReport = async (imageID, aiScore = null) => {
    if (!imageID) return toast.error('Invalid reference.');
    const load = toast.loading("Generating PDF...");
    try {
      const payload = { image_id: imageID };
      if (aiScore !== null) payload.ai_score = parseFloat(aiScore);
      const response = await api.post("reports/generate/", payload, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      window.open(url, '_blank');
      toast.success("Dossier Prepared", { id: load });
    } catch (error) {
      toast.error("Download failed.",error);
    }
  };

  const handleApplyWatermark = async () => {
    if (files.length === 0) return toast.error("No images to protect.");
    setShowWatermarkModal(false);
    const load = toast.loading(`Sealing Batch...`);
    try {
      for (const fileObj of files) {
        const dbImage = await uploadSingleFile(fileObj, "watermark");
        const response = await api.post("watermark/apply/", { image_id: dbImage.ImageID });
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { 
          ...f, status: "completed", result: response.data.status || "Sealed", db_id: dbImage.ImageID 
        } : f));
      }
      toast.success("Batch Protection Applied!", { id: load });
    } catch (error) {
      toast.error("Batch sealing failed.",error);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-10 bg-[#050505] text-white px-4">
      <Toaster />
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          {/* ✅ Heading italic style removed */}
          <h1 className="text-6xl font-extrabold mb-4 bg-linear-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent uppercase tracking-tighter">
            Image Upload
          </h1>
          <p className="text-gray-400 text-lg">AI Manipulation Detection & Digital Integrity Seals</p>
        
          <div className="p-10 border-2 border-dashed mt-20 rounded-xl border-gray-800 bg-gray-900/10">
            <Upload className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <input type="file" multiple accept="image/*" onChange={(e) => e.target.files && handleFileUpload(e.target.files)} className="hidden" id="multi-upload" />
            <label htmlFor="multi-upload" className="inline-block px-10 py-4 bg-blue-300 text-black rounded-full font-bold cursor-pointer hover:scale-105 transition-transform">Select Images</label>
           
            {files.length > 0 && (
              <div className="mt-10 space-y-3 text-left">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between bg-[#0f0f18] p-4 rounded-xl border border-gray-800">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <img src={file.preview} className="h-10 w-10 rounded-lg object-cover border border-gray-700" alt="" />
                        {file.status === 'completed' && <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 border border-[#050505]"><ShieldCheck size={10} className="text-white"/></div>}
                      </div>
                      <div>
                        <p className="text-sm font-semibold truncate max-w-[200px]">{file.name}</p>
                        {file.result && <p className="text-[10px] font-bold uppercase text-cyan-400 tracking-tighter">{file.result}</p>}
                      </div>
                    </div>
                    <button onClick={() => handleRemoveFile(file.id)} className="text-gray-600 hover:text-red-500 transition-colors"><XCircle size={20} /></button>
                  </div>
                ))}
                <div className="flex justify-center gap-4 mt-10">
                  <button onClick={() => setShowAnalysisModal(true)} className="px-8 py-3 bg-gray-800 border border-gray-700 rounded-xl font-bold hover:border-cyan-400 transition-all"> AI Scan</button>
                  <button onClick={() => setShowWatermarkModal(true)} className="px-8 py-3 bg-linear-to-r from-cyan-500 to-blue-600 rounded-xl font-bold shadow-lg transition-all">Protect All</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showVerifyPopup && verificationData.length > 0 && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVerifyPopup(false)} className="absolute inset-0 bg-black/95 backdrop-blur-md" />
            <Motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-[#0f0f1a] border border-gray-800 rounded-2xl p-6 max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
              
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-md font-bold uppercase flex items-center gap-2 font-mono italic">
                  <Fingerprint className="text-cyan-400" size={18}/> Batch Forensic Report ({verificationData.length})
                </h2>
                <button onClick={() => setShowVerifyPopup(false)} className="p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-full">
                  <X size={20}/>
                </button>
              </div>

              {/* SCROLLABLE LIST OF ALL RESULTS */}
              <div className="flex-grow overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                {verificationData.map((data, index) => (
                  <div key={index} className="border-b border-gray-800 pb-8 last:border-0">
                    <p className="text-[10px] text-gray-400 mb-2 uppercase font-mono tracking-widest">Evidence #{index + 1}: {data.name}</p>
                    
                    <div className="rounded-xl border border-gray-800 overflow-hidden bg-black text-center mb-4 h-[250px] flex items-center justify-center">
                      <img src={resolveUrl(data.display_image)} className="w-full h-full object-contain" alt="Forensic View" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-800 text-center flex flex-col justify-center min-h-20">
                        <p className="text-[8px] text-gray-500 font-bold uppercase mb-1 tracking-widest italic">Verdict</p>
                        <p className={`text-sm font-black leading-tight uppercase ${data.status?.toLowerCase().includes('authentic') ? 'text-green-400' : 'text-red-500'}`}>
                          {data.status}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-800 text-center flex flex-col justify-center min-h-20">
                        <p className="text-[8px] text-gray-500 font-bold uppercase mb-1 tracking-widest italic">AI Intensity</p>
                        <p className="text-xl font-black text-cyan-400">{data.score}%</p>
                      </div>
                    </div>
                    <button onClick={() => downloadSingleReport(data.image_id, data.score)} className="mt-4 w-full py-3 bg-gray-900 border border-gray-800 hover:bg-cyan-500 hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                      <Download size={14}/> Download Report Dossier
                    </button>
                  </div>
                ))}
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(showAnalysisModal || showWatermarkModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowAnalysisModal(false); setShowWatermarkModal(false); }} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
            <Motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-[#0f0f1a] border border-gray-800 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-center uppercase">{showAnalysisModal ? "AI Analysis" : "Security Check"}</h2>
              <div className="space-y-4">
                {showAnalysisModal ? (
                  <button onClick={handleMLAnalysis} className="w-full flex items-center gap-4 p-5 bg-gray-900 border border-gray-800 rounded-2xl hover:border-violet-500 transition-all group text-left">
                    <div className="p-3 bg-violet-500/10 rounded-xl group-hover:bg-violet-500/20"><Zap className="text-violet-400" /></div>
                    <div><p className="font-bold uppercase tracking-tight">AI Artifact Scan</p><p className="text-xs text-gray-500 font-mono">Generative Pattern Analysis</p></div>
                  </button>
                ) : (
                  <>
                    <button onClick={handleApplyWatermark} className="w-full flex items-center gap-4 p-5 bg-gray-900 border border-gray-800 rounded-2xl hover:border-green-500 transition-all group text-left">
                      <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20"><ShieldCheck className="text-green-400" /></div>
                      <div><p className="font-bold uppercase tracking-tight">Apply Forensic Seal</p><p className="text-xs text-gray-500 font-mono">Cryptographic Protection</p></div>
                    </button>
                    <button onClick={handleVerifyWatermark} className="w-full flex items-center gap-4 p-5 bg-gray-900 border border-gray-800 rounded-2xl hover:border-cyan-500 transition-all group text-left">
                      <div className="p-3 bg-cyan-500/10 rounded-xl group-hover:bg-cyan-500/20"><Search className="text-cyan-400" /></div>
                      <div><p className="font-bold uppercase tracking-tight">Verify Integrity</p><p className="text-xs text-gray-500 font-mono">Tamper Detection</p></div>
                    </button>
                  </>
                )}
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageUploadPage;