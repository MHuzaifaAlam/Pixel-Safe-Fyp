import React, { useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import api from "../api";
import {
  Upload,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ShieldCheck,
  Search,
  Zap,
  Flame,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const ImageUploadPage = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  const handleFileUpload = (uploadedFiles) => {
    const fileArray = Array.from(uploadedFiles).slice(0, 10);
    const newFiles = fileArray.map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file: file,
      name: file.name,
      size: file.size,
      status: "pending",
      result: null,
      confidence: null,
    }));
    setFiles((prev) => [...prev, ...newFiles].slice(0, 10));
  };

  const handleRemoveFile = (id) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const uploadFilesToBackend = async () => {
    const formData = new FormData();
    files.forEach((f) => formData.append("image", f.file));
    if (files.length > 1) formData.append("batch_name", `Batch_${Date.now()}`);

    const response = await api.post("images/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return Array.isArray(response.data.images) ? response.data.images : [response.data];
  };

  // 1. Protection: Apply Watermark
  const handleApplyWatermark = async () => {
    setShowWatermarkModal(false);
    setIsProcessing(true);
    const load = toast.loading("Applying digital protection...");

    try {
      const uploadedData = await uploadFilesToBackend();
      
      const promises = uploadedData.map((img) => {
        // Correctly capture ID based on Django Serializer key 'ImageID'
        const id = img.ImageID || img.id;
        if (!id) throw new Error("Server returned no Image ID");
        return api.post("watermark/apply/", { image_id: id });
      });
      
      await Promise.all(promises);

      setFiles((prev) => prev.map((f) => ({ ...f, status: "completed", result: "Protected" })));
      toast.success("Images protected successfully!", { id: load });
    } catch (err) {
      console.error("Watermark Application Error:", err);
      // ✅ FIXED: Removed {err} object from first argument to prevent crash
      const errorMsg = err.response?.data?.detail || "Protection failed";
      toast.error(errorMsg, { id: load });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Protection: Verify Watermark
  const handleVerifyWatermark = async () => {
    setShowWatermarkModal(false);
    setIsProcessing(true);
    const load = toast.loading("Scanning for seals...");

    try {
      const promises = files.map((f) => {
        const fd = new FormData();
        fd.append("image", f.file);
        return api.post("watermark/auto-verify/", fd);
      });
      const results = await Promise.all(promises);

      setFiles((prev) => prev.map((f, i) => ({
        ...f,
        status: "completed",
        result: results[i].data.status || "Verified"
      })));
      toast.success("Verification complete", { id: load });
    } catch (err) {
      console.error("Verification Error:", err);
      // ✅ FIXED: Removed {err} object
      toast.error("Verification failed", { id: load });
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Analysis: Standard AI & Heatmap Detection
  const handleAnalysis = async (mode) => {
    setShowAnalysisModal(false);
    setIsProcessing(true);
    const load = toast.loading(mode === "gan" ? "Analyzing pixels..." : "Generating heatmap...");

    try {
      const formData = new FormData();
      files.forEach(f => formData.append("image", f.file));
      formData.append("action_mode", mode);

      const res = await api.post("images/", formData);
      const results = Array.isArray(res.data.images) ? res.data.images : [res.data];

      setFiles(prev => prev.map((f, i) => ({
        ...f,
        status: "completed",
        result: results[i]?.metadata?.detection_result || "Analyzed",
      })));
      toast.success("Analysis complete", { id: load });
    } catch (err) {
      console.error("Analysis Error:", err);
      // ✅ FIXED: Removed {err} object
      toast.error("Analysis failed", { id: load });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status, result) => {
    if (status === "pending") return <Clock className="h-5 w-5 text-gray-400" />;
    if (result === "Protected" || result?.toLowerCase().includes("real") || result?.toLowerCase().includes("complete")) return <CheckCircle className="h-5 w-5 text-green-400" />;
    return <AlertTriangle className="h-5 w-5 text-orange-400" />;
  };

  return (
    <div className="min-h-screen pt-20 pb-10 bg-[#050505] text-white">
      <Toaster />
      <div className="max-w-5xl mx-auto px-4 relative">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold mb-4 bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            Pixel-Safe Studio
          </h1>
          <p className="text-gray-400 text-lg">Upload images to detect AI manipulation or apply protection.</p>
        </div>

        <Motion.div className="p-10 border-2 border-dashed rounded-xl border-gray-800 text-center bg-gray-900/10 backdrop-blur-md">
          <Upload className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <input type="file" multiple accept="image/*" onChange={(e) => e.target.files && handleFileUpload(e.target.files)} className="hidden" id="multi-upload" />
          <label htmlFor="multi-upload" className="inline-block px-10 py-4 bg-white text-black rounded-full font-bold cursor-pointer hover:scale-105 transition-transform active:scale-95">
            Select Images
          </label>

          {files.length > 0 && (
            <div className="mt-10 space-y-3 text-left">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between bg-[#0f0f18] p-4 rounded-xl border border-gray-800">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(file.status, file.result)}
                    <div>
                      <p className="text-sm font-semibold">{file.name}</p>
                      {file.result && <p className="text-xs text-cyan-400 font-bold uppercase tracking-tighter">{file.result}</p>}
                    </div>
                  </div>
                  <button onClick={() => handleRemoveFile(file.id)} className="text-gray-600 hover:text-red-500 transition-colors"><XCircle size={20} /></button>
                </div>
              ))}

              <div className="flex flex-wrap justify-center gap-4 mt-10">
                <button onClick={() => setShowAnalysisModal(true)} disabled={isProcessing} className="px-8 py-3 bg-gray-800 border border-gray-700 rounded-xl font-bold hover:border-cyan-400 transition-all disabled:opacity-50">
                   Analyze Images
                </button>
                <button onClick={() => setShowWatermarkModal(true)} disabled={isProcessing} className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all disabled:opacity-50">
                  Protect Content
                </button>
              </div>
            </div>
          )}
        </Motion.div>
      </div>

      <AnimatePresence>
        {(showWatermarkModal || showAnalysisModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowWatermarkModal(false); setShowAnalysisModal(false); }} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
            <Motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-md bg-[#0f0f1a] border border-gray-800 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-center mb-6">
                {showAnalysisModal ? "Select Analysis Type" : "Digital Protection"}
              </h2>
              <div className="space-y-4">
                {showAnalysisModal ? (
                  <>
                    <button onClick={() => handleAnalysis("gan")} className="w-full flex items-center gap-4 p-5 bg-gray-900 border border-gray-800 rounded-2xl hover:border-violet-500 transition-all text-left group">
                      <div className="p-3 bg-violet-500/10 rounded-xl group-hover:bg-violet-500/20"><Zap className="text-violet-400" /></div>
                      <div><p className="font-bold">AI Detection</p><p className="text-xs text-gray-500">Scan for AI Generated content</p></div>
                    </button>
                    <button onClick={() => handleAnalysis("heatmap")} className="w-full flex items-center gap-4 p-5 bg-gray-900 border border-gray-800 rounded-2xl hover:border-orange-500 transition-all text-left group">
                      <div className="p-3 bg-orange-500/10 rounded-xl group-hover:bg-orange-500/20"><Flame className="text-orange-400" /></div>
                      <div><p className="font-bold">Heatmap Mapping</p><p className="text-xs text-gray-500">Analyze pixel manipulation intensity</p></div>
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={handleApplyWatermark} className="w-full flex items-center gap-4 p-5 bg-gray-900 border border-gray-800 rounded-2xl hover:border-green-500 transition-all text-left group">
                      <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20"><ShieldCheck className="text-green-400" /></div>
                      <div><p className="font-bold">Apply Seal</p><p className="text-xs text-gray-500">Inject invisible ownership code</p></div>
                    </button>
                    <button onClick={handleVerifyWatermark} className="w-full flex items-center gap-4 p-5 bg-gray-900 border border-gray-800 rounded-2xl hover:border-cyan-500 transition-all text-left group">
                      <div className="p-3 bg-cyan-500/10 rounded-xl group-hover:bg-cyan-500/20"><Search className="text-cyan-400" /></div>
                      <div><p className="font-bold">Verify Ownership</p><p className="text-xs text-gray-500">Check for existing digital seals</p></div>
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