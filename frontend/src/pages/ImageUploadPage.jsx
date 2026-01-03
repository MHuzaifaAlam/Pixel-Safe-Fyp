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
  const [verificationData, setVerificationData] = useState(null);
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

  const uploadFilesToBackend = async (mode = "analysis") => {
    const formData = new FormData();
    files.forEach((f) => formData.append("image", f.file));
    formData.append("action_mode", mode);
    const response = await api.post("images/", formData, { 
      headers: { "Content-Type": "multipart/form-data" } 
    });
    const images = Array.isArray(response.data.images) ? response.data.images : [response.data];
    return { images };
  };

  const handleMLAnalysis = async () => {
    if (files.length === 0) return toast.error("Please select an image first.");
    setShowAnalysisModal(false);
    const load = toast.loading("Executing AI Artifact Scan...");
    
    try {
      const { images } = await uploadFilesToBackend("analysis");
      const currentImageId = images[0].ImageID;

      const res = await api.post("scan/", { 
          image_id: currentImageId,
          scan_mode: "gan" 
      });
      
      if (res.status === 200) {
        let finalVerdict = res.data.verdict;
        const s = res.data.score || 0;
        if (!finalVerdict || finalVerdict === "Analysis Complete") {
            if (s > 80) finalVerdict = "HIGH AI INTENSITY";
            else if (s > 50) finalVerdict = "MODERATE AI INTENSITY";
            else if (s > 25) finalVerdict = "LOW INTENSITY AI";
            else finalVerdict = "AUTHENTIC / REAL";
        }

        setVerificationData({
          status: finalVerdict, 
          score: s.toFixed(2),
          verdict: finalVerdict,
          display_image: res.data.visual_url || images[0].image,
          image_id: currentImageId
        });

        setShowVerifyPopup(true);
        toast.success("Forensic Scan Successful", { id: load });
      }
    } catch (error) {
      console.error(error);
      toast.error("Analysis failed.");
      toast.dismiss(load);
    }
  };

  const handleVerifyWatermark = async () => {
    if (files.length === 0) return toast.error("No images selected.");
    const load = toast.loading("Executing Dual-Layer Forensic Analysis...");
    try {
      const fd = new FormData();
      fd.append("image", files[0].file);
      fd.append("scan_mode", "gan");

      const [watermarkRes, aiRes] = await Promise.all([
        api.post("watermark/auto-verify/", fd),
        api.post("scan/", fd)
      ]);

      const imageId = watermarkRes.data.image_id || aiRes.data.image_id || files[0].db_id;
      const isAuthentic = watermarkRes.data.status?.toLowerCase().includes("authentic") || 
                         watermarkRes.data.status?.toLowerCase().includes("success");
      
      const finalStatus = isAuthentic ? "AUTHENTIC / REAL" : "TAMPERED / MODIFIED";

      setVerificationData({
        status: finalStatus,
        score: (aiRes.data.score || 0).toFixed(2),
        verdict: aiRes.data.verdict || finalStatus,
        display_image: watermarkRes.data.forensic_visualization || 
                       watermarkRes.data.comparison_url || 
                       files[0].preview,
        image_id: imageId
      });

      setShowVerifyPopup(true);
      toast.success(isAuthentic ? "Integrity Confirmed" : "Anomalies Detected", { id: load });
    } catch (error) {
      console.error(error);
      toast.error("Integrity scan failed.", { id: load });
    }
  };

  const downloadSingleReport = async (imageID, aiScore = null) => {
    if (!imageID) return toast.error('Invalid report reference.');
    const load = toast.loading("Generating Forensic PDF...");
    try {
      const payload = { image_id: imageID };
      if (aiScore !== null) payload.ai_score = parseFloat(aiScore);
      const response = await api.post("reports/generate/", payload, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success("PDF dossier prepared", { id: load });
    } catch (error) {
      console.error(error);
      toast.error("PDF generation failed.", { id: load });
    }
  };

  const handleApplyWatermark = async () => {
    setShowWatermarkModal(false);
    const load = toast.loading("Applying Cryptographic Seal...");
    try {
      const { images } = await uploadFilesToBackend("watermark");
      const response = await api.post("watermark/apply/", { image_id: images[0].ImageID });
      setFiles((prev) => prev.map((f, i) => (i === 0 ? { ...f, db_id: images[0].ImageID, status: "completed", result: response.data.status || "Sealed" } : f)));
      toast.success("Seal applied successfully!", { id: load });
    } catch (error) {
      console.error(error);
      toast.error("Sealing failed", { id: load });
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-10 bg-[#050505] text-white px-4">
      <Toaster />
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold mb-4 bg-linear-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent uppercase tracking-tighter italic">
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
                      <Clock size={20} className="text-cyan-400" />
                      <p className="text-sm font-semibold truncate max-w-[200px]">{file.name}</p>
                      {file.result && <p className="text-[10px] font-bold uppercase text-cyan-400">{file.result}</p>}
                    </div>
                    <button onClick={() => handleRemoveFile(file.id)} className="text-gray-600 hover:text-red-500 transition-colors"><XCircle size={20} /></button>
                  </div>
                ))}
                <div className="flex justify-center gap-4 mt-10">
                  <button onClick={() => setShowAnalysisModal(true)} className="px-8 py-3 bg-gray-800 border border-gray-700 rounded-xl font-bold hover:border-cyan-400 transition-all">AI Scan</button>
                  <button onClick={() => setShowWatermarkModal(true)} className="px-8 py-3 bg-linear-to-r from-cyan-500 to-blue-600 rounded-xl font-bold shadow-lg transition-all">Protect Content</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showVerifyPopup && verificationData && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVerifyPopup(false)} className="absolute inset-0 bg-black/95 backdrop-blur-md" />
            <Motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg bg-[#0f0f1a] border border-gray-800 rounded-2xl p-5 max-h-[90vh] shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-md font-bold uppercase flex items-center gap-2 font-mono italic">
                  <Fingerprint className="text-cyan-400" size={18}/> Forensic Report
                </h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => downloadSingleReport(verificationData.image_id, verificationData.score)} className="p-2 hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400 rounded-full transition-all">
                    <Download size={20} />
                  </button>
                  <button onClick={() => setShowVerifyPopup(false)} className="p-1.5 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-full transition-all">
                    <X size={20}/>
                  </button>
                </div>
              </div>
              
              <div className="rounded-xl border border-gray-800 overflow-hidden bg-black text-center mb-5 h-[280px] flex items-center justify-center">
                <img src={resolveUrl(verificationData.display_image)} className="w-full h-full object-contain" alt="Forensic View" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-800 text-center flex flex-col justify-center min-h-20">
                  <p className="text-[8px] text-gray-500 font-bold uppercase mb-1 tracking-widest italic">Process Verdict</p>
                  <p className={`text-sm font-black leading-tight uppercase ${verificationData.status?.toLowerCase().includes('authentic') ? 'text-green-400' : 'text-red-500'}`}>
                    {verificationData.status}
                  </p>
                </div>
                <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-800 text-center flex flex-col justify-center min-h-20">
                  <p className="text-[8px] text-gray-500 font-bold uppercase mb-1 tracking-widest italic">AI Intensity</p>
                  <p className="text-xl font-black text-cyan-400">{verificationData.score}%</p>
                </div>
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