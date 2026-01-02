import React, { useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import api from "../api"
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
    if (u.startsWith("http")) return u;
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
    const response = await api.post("images/", formData, { headers: { "Content-Type": "multipart/form-data" } });
    const images = Array.isArray(response.data.images) ? response.data.images : [response.data];
    return { images };
  };

  const handleMLAnalysis = async (mode) => {
    setShowAnalysisModal(false);
    const load = toast.loading("Executing AI Artifact Scan...");
    try {
      const { images } = await uploadFilesToBackend(mode);
      const res = await api.post("scan/", { image_id: images[0].ImageID, scan_mode: mode });

      const heatmap = res.data.heatmap_url || res.data.comparison_url || res.data.result_image || res.data.visual_url;

      setVerificationData({
        status: res.data.verdict || "Analyzed",
        score: res.data.score || 0,
        verdict: res.data.verdict,
        display_image: heatmap || files[0]?.preview,
        report_id: res.data.report_id,
        image_id: images[0].ImageID
      });
      setShowVerifyPopup(true);

      setFiles((prev) => prev.map((f) => ({ ...f, db_id: images[0].ImageID, status: "completed", result: res.data.verdict })));
      toast.success("AI Analysis Complete", { id: load });
    } catch (err) {
      toast.error("Analysis failed", { id: load });
      console.error(err);
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
      const watermarkData = watermarkRes.data.verification || {};
      const finalStatus = watermarkData.status || watermarkRes.data.status || "Status Missing";

      setVerificationData({
        status: finalStatus,
        score: aiRes.data.score || 0,
        verdict: aiRes.data.verdict || "N/A",
        display_image: watermarkRes.data.comparison_url || files[0].preview,
        report_id: watermarkRes.data.report_id,
        image_id: imageId
      });

      setShowVerifyPopup(true);
      setFiles((prev) => prev.map((f) => ({ ...f, db_id: imageId, status: "completed", result: `${finalStatus} | AI: ${aiRes.data.verdict || 'Processed'}` })));
      toast.success("Forensic Integrity Verified", { id: load });
    } catch (err) {
      toast.error("Dual-scan failed.", { id: load });
      console.error(err);
    }
  };
  const downloadSingleReport = async (imageID, aiScore = null) => {
    // Defensive: ensure we were passed an ID (not an event or DOM node)
    if (!imageID || (typeof imageID !== 'string' && typeof imageID !== 'number')) {
      console.error('Invalid imageID passed to downloadSingleReport:', imageID);
      return toast.error('Invalid report reference. Please refresh and try again.');
    }
    const load = toast.loading("Generating Forensic PDF...");
    try {
      const payload = { image_id: imageID };
      if (aiScore !== null && typeof aiScore !== 'undefined') {
        const s = parseFloat(aiScore);
        if (Number.isFinite(s)) {
          payload.ai_score = s;
        } else {
          console.warn('Ignoring non-numeric aiScore for PDF generation:', aiScore);
        }
      }

      const response = await api.post("reports/generate/", payload, { responseType: 'blob' });
      const ctype = response.headers['content-type'] || '';
      const isPdf = ctype.includes('application/pdf');
      if (!isPdf) {
        const text = await response.data.text();
        try {
          const err = JSON.parse(text);
          throw new Error(err.detail || err.error || "Server logic failed");
        } catch (e) {
          console.error("PDF parse error:", e);
          throw new Error(text || "Unexpected response while generating PDF");
        }
      }

      const blob = new Blob([response.data], { type: ctype || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Open a blank tab first (preserve user gesture) to avoid popup blockers
      const tab = window.open('about:blank', '_blank');
      if (!tab) {
        toast.error("Popup blocked. Please allow popups to preview the PDF.", { id: load });
        return;
      }

      try {
        tab.location.href = url;
        toast.success("PDF opened", { id: load });
      } catch (e) {
        // Fallback: create a temporary link and click it
        try {
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success("PDF opened", { id: load });
        } catch (linkErr) {
          console.error("PDF open fallback failed:", linkErr);
          toast.error("Unable to open PDF.", { id: load });
        }
        e
      }
    } catch (err) {
      // More helpful network error messaging
      const msg = err?.message || '';
      if (msg.includes('Network Error') || msg.includes('ECONNREFUSED') || (err?.code === 'ECONNABORTED')) {
        toast.error('Unable to contact server — is the backend running at http://127.0.0.1:8000/?', { id: load });
      } else {
        toast.error(`PDF generation failed: ${err.message || err}`, { id: load });
      }
      console.error(err);
      return;
    }
  };


  const handleApplyWatermark = async () => {
    setShowWatermarkModal(false);
    const load = toast.loading("Applying Cryptographic Seal...");
    try {
      const { images } = await uploadFilesToBackend("watermark");
      const response = await api.post("watermark/apply/", { image_id: images[0].ImageID });

      setFiles((prev) => prev.map((f, i) => (i === 0 ? { ...f, db_id: images[0].ImageID, status: "completed", result: response.data.status || "Sealed & Protected" } : f)));
      toast.success("Seal applied successfully!", { id: load });
    } catch (err) {
      toast.error("Sealing failed", { id: load });
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-10 bg-[#050505] text-white px-4">
      <Toaster />
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-6xl font-extrabold mb-12 bg-linear-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent italic">Pixel Forensic Studio</h1>
        <div className="p-10 border-2 border-dashed rounded-xl border-gray-800 bg-gray-900/10">
          <Upload className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <input type="file" multiple accept="image/*" onChange={(e) => e.target.files && handleFileUpload(e.target.files)} className="hidden" id="multi-upload" />
          <label htmlFor="multi-upload" className="inline-block px-10 py-4 bg-white text-black rounded-full font-bold cursor-pointer hover:scale-105 transition-transform">Select Images</label>
          {files.length > 0 && (
            <div className="mt-10 space-y-3 text-left">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between bg-[#0f0f18] p-4 rounded-xl border border-gray-800">
                  <div className="flex items-center space-x-4">
                    <Clock size={20} className="text-cyan-400" />
                    <p className="text-sm font-semibold truncate max-w-[200px]">{file.name}</p>
                    {file.result && <p className="text-[10px] font-bold uppercase text-cyan-400">{file.result}</p>}
                  </div>
                  <button onClick={() => handleRemoveFile(file.id)} className="text-gray-600 hover:text-red-500"><XCircle size={20} /></button>
                </div>
              ))}
              <div className="flex justify-center gap-4 mt-10">
                <button onClick={() => setShowAnalysisModal(true)} className="px-8 py-3 bg-gray-800 border border-gray-700 rounded-xl font-bold hover:border-cyan-400">AI Scan</button>
                <button onClick={() => setShowWatermarkModal(true)} className="px-8 py-3 bg-linear-to-r from-cyan-500 to-blue-600 rounded-xl font-bold shadow-lg">Security Check</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <AnimatePresence>
        {showVerifyPopup && verificationData && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVerifyPopup(false)} className="absolute inset-0 bg-black/95 backdrop-blur-md" />
            <Motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-[#0f0f1a] border border-gray-800 rounded-3xl p-8 max-h-[90vh] overflow-y-auto shadow-[0_0_50px_-12px_rgba(34,211,238,0.3)]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold uppercase flex items-center gap-2 font-mono italic"><Fingerprint className="text-cyan-400" /> Forensic Report</h2>
                <div className="flex items-center gap-2">
                  <button disabled={!verificationData?.image_id} onClick={() => downloadSingleReport(verificationData?.image_id, verificationData?.score ?? verificationData?.correlation_score)} className="p-2.5 hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400 rounded-full transition-colors border border-transparent hover:border-cyan-500/30 disabled:opacity-60 disabled:cursor-not-allowed"><Download size={22} /></button>
                  <button onClick={() => setShowVerifyPopup(false)} className="p-2.5 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-full transition-colors border border-transparent hover:border-red-500/30"><X size={22}/></button>
                </div>
              </div>
              <div className="rounded-xl border border-gray-800 overflow-hidden bg-black text-center mb-6 min-h-[300px] flex items-center justify-center">
                {verificationData.display_image ? <img src={resolveUrl(verificationData.display_image)} className="w-full h-auto max-h-[400px] object-contain shadow-2xl" alt="Scan Result" /> : <div className="flex flex-col items-center gap-2 text-gray-600 italic"><ImageIcon size={40} className="opacity-20 animate-pulse" /><span>Processing Forensic Visualization...</span></div>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-gray-900/50 rounded-2xl border border-gray-800 text-center shadow-inner group hover:border-cyan-500/50 transition-colors">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-1 tracking-widest italic">Watermark Integrity</p>
                  <p className={`text-2xl font-black ${verificationData.status?.toLowerCase().includes('tamper') ? 'text-red-500' : 'text-green-400'}`}>{verificationData.status || "Checking..."}</p>
                </div>
                <div className="p-6 bg-gray-900/50 rounded-2xl border border-gray-800 text-center shadow-inner group hover:border-cyan-500/50 transition-colors">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-1 tracking-widest italic">AI Manipulation Score</p>
                  <p className="text-2xl font-black text-cyan-400">{verificationData.score !== undefined ? `${verificationData.score}%` : "0%"}</p>
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
                  <button onClick={() => handleMLAnalysis("gan")} className="w-full flex items-center gap-4 p-5 bg-gray-900 border border-gray-800 rounded-2xl hover:border-violet-500 transition-all group text-left">
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