import React, { useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import api from "../api";
import {
  Upload, AlertTriangle, CheckCircle, Clock, XCircle, 
  ShieldCheck, Search, Zap, X, FileText, Fingerprint, Download, Image as ImageIcon
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const ImageUploadPage = () => {
  const [files, setFiles] = useState([]);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [verificationData, setVerificationData] = useState(null);
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);

  const BACKEND_URL = "http://127.0.0.1:8000";

  const downloadSingleReport = async (imageID) => {
    if (!imageID) return toast.error("Report reference missing. Ensure image is processed.");
    const load = toast.loading("Generating Forensic PDF...");
    try {
      const response = await api.post("reports/generate/", { image_id: imageID, force: true }, { responseType: 'blob' });
      if (response.data.type === "application/json") {
        const text = await response.data.text();
        const err = JSON.parse(text);
        throw new Error(err.detail || "Server logic failed");
      }
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Forensic_Report_${String(imageID).substring(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF Downloaded", { id: load });
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error(error.message || "PDF generation failed.", { id: load });
    }
  };

  const handleDownloadBatch = async () => {
    const batchId = files.find(f => f.db_batch_id)?.db_batch_id;
    if (!batchId) return toast.error("No processed batch ID found.");
    const load = toast.loading("Archiving batch results...");
    try {
      const response = await api.post("reports/download_batch/", { batch_id: batchId }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Archive_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Batch ZIP Ready", { id: load });
    } catch (error) {
      toast.error("Batch download failed", { id: load },error);
    }
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
    const response = await api.post("images/", formData, { headers: { "Content-Type": "multipart/form-data" } });
    const images = Array.isArray(response.data.images) ? response.data.images : [response.data];
    return { images, batch_id: response.data.batch_id || (images[0]?.batch) };
  };

  const handleApplyWatermark = async () => {
    setShowWatermarkModal(false);
    const load = toast.loading("Applying Cryptographic Seal...");
    try {
      const { images } = await uploadFilesToBackend("watermark");
      await Promise.all(images.map((img) => api.post("watermark/apply/", { image_id: img.ImageID })));
      setFiles((prev) => prev.map((f, i) => ({ ...f, db_id: images[i]?.ImageID, status: "completed", result: "Protected" })));
      toast.success("Seal applied successfully!", { id: load });
    } catch (error) {
      toast.error("Sealing failed", { id: load },error);
    }
  };

  const handleMLAnalysis = async (mode) => {
    setShowAnalysisModal(false);
    const load = toast.loading("Executing AI Artifact Scan...");
    try {
      const { images, batch_id } = await uploadFilesToBackend(mode);
      const responses = await Promise.all(images.map((img) => api.post("scan/", { image_id: img.ImageID, scan_mode: mode })));
      const formatted = responses.map(res => ({ ImageID: res.data.ImageID || res.data.image_id, file_name: res.data.file_name, score: res.data.score, verdict: res.data.verdict }));
      setFiles((prev) => prev.map((f, i) => ({ ...f, db_id: images[i]?.ImageID, db_batch_id: batch_id, status: "completed", result: formatted[i]?.verdict || "Analyzed" })));
      setScanResults(formatted);
      setShowResultPopup(true);
      toast.success("Scan Complete", { id: load });
    } catch (error) {
      toast.error("Analysis failed", { id: load },error);
    }
  };

  const handleVerifyWatermark = async () => {
    setShowWatermarkModal(false);
    const load = toast.loading("Verifying Forensic Integrity...");
    try {
      const fd = new FormData();
      fd.append("image", files[0].file);
      const res = await api.post("watermark/auto-verify/", fd);
      const serverID = res.data.ImageID || res.data.image_id;
      setVerificationData({ status: res.data.status, image_id: serverID, comparison_image: res.data.comparison_url, correlation_score: res.data.statistics?.correlation_score || 0 });
      setShowVerifyPopup(true);
      setFiles((prev) => prev.map((f) => ({ ...f, db_id: serverID, status: "completed", result: res.data.status })));
      toast.success("Verification Complete", { id: load });
    } catch (error) {
      toast.error("Verification failed", { id: load },error);
    }
  };

  const getStatusIcon = (status, result) => {
    if (status === "pending") return <Clock className="h-5 w-5 text-gray-400 animate-pulse" />;
    const res = result?.toLowerCase() || "";
    if (res.includes("verified") || res.includes("protected") || res.includes("real")) return <CheckCircle className="h-5 w-5 text-green-400" />;
    if (res.includes("tamper") || res.includes("high") || res.includes("fake")) return <XCircle className="h-5 w-5 text-red-500" />;
    return <AlertTriangle className="h-5 w-5 text-orange-400" />;
  };

  return (
    <div className="min-h-screen pt-20 pb-10 bg-[#050505] text-white px-4">
      <Toaster />
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold mb-4 bg-linear-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent uppercase tracking-tighter">
            Pixel Forensic Studio
          </h1>
          <p className="text-gray-400 text-lg">AI Manipulation Detection & Digital Integrity Seals</p>
        </div>

        <Motion.div className="p-10 border-2 border-dashed rounded-xl border-gray-800 bg-gray-900/10 backdrop-blur-md text-center">
          <Upload className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <input type="file" multiple accept="image/*" onChange={(e) => e.target.files && handleFileUpload(e.target.files)} className="hidden" id="multi-upload" />
          <label htmlFor="multi-upload" className="inline-block px-10 py-4 bg-white text-black rounded-full font-bold cursor-pointer hover:scale-105 transition-transform active:scale-95">
            Select Images
          </label>

          {files.length > 0 && (
            <div className="mt-10 space-y-3 text-left">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between bg-[#0f0f18] p-4 rounded-xl border border-gray-800">
                  <div className="flex items-center space-x-4 overflow-hidden">
                    {getStatusIcon(file.status, file.result)}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate max-w-[200px]">{file.name}</p>
                      {file.result && (
                         <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${file.result.toLowerCase().includes('tamper') ? 'text-red-500' : 'text-cyan-400'}`}>
                           {file.result}
                         </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {file.db_id && <button onClick={() => downloadSingleReport(file.db_id)} className="text-cyan-400 hover:text-white"><FileText size={18} /></button>}
                    <button onClick={() => handleRemoveFile(file.id)} className="text-gray-600 hover:text-red-500"><XCircle size={20} /></button>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap justify-center gap-4 mt-10">
                <button onClick={() => setShowAnalysisModal(true)} className="px-8 py-3 bg-gray-800 border border-gray-700 rounded-xl font-bold hover:border-cyan-400 transition-all">Analyze AI</button>
                <button onClick={() => setShowWatermarkModal(true)} className="px-8 py-3 bg-linear-to-r from-cyan-500 to-blue-600 rounded-xl font-bold shadow-lg">Protect</button>
                {files.some(f => f.db_batch_id) && <button onClick={handleDownloadBatch} className="px-8 py-3 bg-violet-600/20 border border-violet-500/30 rounded-xl font-bold flex items-center gap-2"><Download size={18} /> ZIP</button>}
              </div>
            </div>
          )}
        </Motion.div>
      </div>

      {/* Popups */}
      <AnimatePresence>
        {showVerifyPopup && verificationData && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVerifyPopup(false)} className="absolute inset-0 bg-black/95 backdrop-blur-md" />
            <Motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-4xl bg-[#0f0f1a] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold uppercase tracking-tighter flex items-center gap-2"><Fingerprint className="text-cyan-400" /> Integrity Report</h2>
                <button onClick={() => setShowVerifyPopup(false)} className="p-2 hover:bg-gray-800 rounded-full"><X size={20}/></button>
              </div>
              <div className="rounded-xl border border-gray-800 overflow-hidden bg-black text-center mb-6">
                 {verificationData.comparison_image && <img src={`${BACKEND_URL}${verificationData.comparison_image}`} className="w-full h-auto max-h-[400px] object-contain" alt="Heatmap" />}
              </div>
              <div className="grid grid-cols-3 gap-4">
                 <div className="p-4 bg-gray-900 rounded-xl border border-gray-800 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Status</p>
                    <p className={`text-xl font-black ${verificationData.status === 'Verified' ? 'text-green-400' : 'text-red-500'}`}>{verificationData.status}</p>
                 </div>
                 <div className="p-4 bg-gray-900 rounded-xl border border-gray-800 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Correlation</p>
                    <p className="text-xl font-black text-cyan-400">{(parseFloat(verificationData.correlation_score || 0) * 100).toFixed(2)}%</p>
                 </div>
                 <div className="p-4 bg-gray-900 rounded-xl border border-gray-800 text-center flex flex-col justify-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Seal</p>
                    <p className="text-md font-black text-violet-400 tracking-tighter">AES-256</p>
                 </div>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResultPopup && scanResults && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowResultPopup(false)} className="absolute inset-0 bg-black/95 backdrop-blur-md" />
            <Motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="relative w-full max-w-2xl bg-[#0f0f1a] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-2"><FileText className="text-cyan-400" /> Scan Results</h2>
                <button onClick={() => setShowResultPopup(false)} className="p-2 hover:text-red-500"><X size={20}/></button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {scanResults.map((res, idx) => (
                    <div key={idx} className="flex gap-4 p-4 bg-gray-900/50 border border-gray-800 rounded-2xl items-center">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-2">
                          <h3 className="text-sm font-bold truncate pr-4">{res.file_name}</h3>
                          <span className="text-xl font-black text-cyan-400">{res.score}%</span>
                        </div>
                        <div className={`px-4 py-1 inline-block rounded-full text-[10px] font-black uppercase ${res.verdict.includes("HIGH") ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-400"}`}>
                           {res.verdict}
                        </div>
                      </div>
                      {res.ImageID && <button onClick={() => downloadSingleReport(res.ImageID)} className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg hover:bg-cyan-500/20"><Download size={18} /></button>}
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
              <h2 className="text-2xl font-bold mb-6 text-center tracking-tighter uppercase">{showAnalysisModal ? "Forensic Scan" : "Protect"}</h2>
              <div className="space-y-4">
                {showAnalysisModal ? (
                  <button onClick={() => handleMLAnalysis("gan")} className="w-full flex items-center gap-4 p-5 bg-gray-900 border border-gray-800 rounded-2xl hover:border-violet-500 transition-all group text-left">
                    <div className="p-3 bg-violet-500/10 rounded-xl"><Zap className="text-violet-400" /></div>
                    <div><p className="font-bold uppercase tracking-tight">Run Scan</p><p className="text-xs text-gray-500">Deep pixel artifacts check</p></div>
                  </button>
                ) : (
                  <>
                    <button onClick={handleApplyWatermark} className="w-full flex items-center gap-4 p-5 bg-gray-900 border border-gray-800 rounded-2xl hover:border-green-500 transition-all group text-left">
                      <div className="p-3 bg-green-500/10 rounded-xl"><ShieldCheck className="text-green-400" /></div>
                      <div><p className="font-bold uppercase tracking-tight">Apply Seal</p><p className="text-xs text-gray-500">Inject invisible hash</p></div>
                    </button>
                    <button onClick={handleVerifyWatermark} className="w-full flex items-center gap-4 p-5 bg-gray-900 border border-gray-800 rounded-2xl hover:border-cyan-500 transition-all group text-left">
                      <div className="p-3 bg-cyan-500/10 rounded-xl"><Search className="text-cyan-400" /></div>
                      <div><p className="font-bold uppercase tracking-tight">Verify</p><p className="text-xs text-gray-500">Scan for tamper seals</p></div>
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