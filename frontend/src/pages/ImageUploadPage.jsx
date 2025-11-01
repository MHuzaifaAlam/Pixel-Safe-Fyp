import React, { useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  Upload,
  FileImage,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

const ImageUploadPage = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle multiple file uploads (max 10)
  const handleFileUpload = (uploadedFiles) => {
    const newFiles = Array.from(uploadedFiles)
      .slice(0, 10)
      .map((file, i) => ({
        id: `${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
        status: "pending",
      }));

    setFiles((prev) => {
      const combined = [...prev, ...newFiles];
      return combined.slice(0, 10);
    });
  };

  // Remove file
  const handleRemoveFile = (id) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  // Simulate processing
  const startProcessing = (mode) => {
    setIsProcessing(true);

    files.forEach((file, index) => {
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "processing" } : f
          )
        );

        setTimeout(() => {
          let result, confidence;

          if (mode === "gan") {
            const outcomes = ["GAN-generated", "Real"];
            result = outcomes[Math.floor(Math.random() * outcomes.length)];
            confidence = Math.floor(Math.random() * 40) + 60;
          } else if (mode === "add-watermark") {
            result = "Watermark Added";
            confidence = 100;
          } else if (mode === "check-watermark") {
            const outcomes = ["Watermarked", "Not Watermarked"];
            result = outcomes[Math.floor(Math.random() * outcomes.length)];
            confidence = Math.floor(Math.random() * 40) + 60;
          }

          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id
                ? { ...f, status: "completed", result, confidence }
                : f
            )
          );

          if (index === files.length - 1) setIsProcessing(false);
        }, 1500);
      }, index * 400);
    });
  };

  const getStatusIcon = (status, result) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-gray-400" />;
      case "processing":
        return (
          <div className="h-5 w-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        );
      case "completed":
        if (result?.includes("GAN") || result === "Watermarked")
          return <AlertTriangle className="h-5 w-5 text-orange-400" />;
        if (result === "Watermark Added")
          return <CheckCircle className="h-5 w-5 text-cyan-400" />;
        if (result === "Real" || result === "Not Watermarked")
          return <CheckCircle className="h-5 w-5 text-green-400" />;
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-20 pb-10 relative overflow-hidden bg-gradient-to-br from-[#050505] via-[#0a0a0f] to-[#111122] text-white"
    >
      {/* Animated Background */}
      <Motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            "radial-gradient(circle at 20% 30%, rgba(147,51,234,0.1), transparent 60%)",
            "radial-gradient(circle at 70% 80%, rgba(6,182,212,0.1), transparent 60%)",
            "radial-gradient(circle at 50% 50%, rgba(236,72,153,0.1), transparent 60%)",
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, repeatType: "mirror" }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
       <div className="text-center mb-12">
  <h1
    className="text-6xl font-extrabold mb-4 bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent 
    leading-[1.2] tracking-wide drop-shadow-[0_0_10px_rgba(147,51,234,0.4)]"
    style={{ paddingBottom: "0.2em" }}
  >
    Image Analysis
  </h1>
  <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
    Upload one or multiple images to detect GAN-generated content, add watermarks, or check existing ones.
  </p>
</div>


        {/* Upload Section */}
        <Motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative p-10 border-2 border-dashed rounded-xl border-gray-700 hover:border-cyan-400/50 transition-all duration-300 text-center"
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload Images</h3>
          <p className="text-gray-500 mb-4">Upload up to 10 images for simultaneous analysis.</p>

          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
            id="multi-upload"
          />
          <label
            htmlFor="multi-upload"
            className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-lg font-semibold text-white cursor-pointer hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300"
          >
            Choose Files
          </label>

          {files.length > 0 && (
            <>
              <div className="mt-8 space-y-4 text-left">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between bg-[#0f0f18]/70 p-4 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(file.status, file.result)}
                      <div>
                        <p className="font-medium text-white">{file.name}</p>
                        <p className="text-gray-400 text-sm">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {file.status === "completed" && (
                        <p className="text-cyan-400 text-sm font-medium">
                          {file.result} ({file.confidence}%)
                        </p>
                      )}
                      {file.status === "pending" && !isProcessing && (
                        <button
                          onClick={() => handleRemoveFile(file.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-4 mt-8">
                <button
                  onClick={() => startProcessing("gan")}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
                >
                  Detect GAN Image
                </button>

                <button
                  onClick={() => startProcessing("add-watermark")}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300"
                >
                  Add Watermark
                </button>

                <button
                  onClick={() => startProcessing("check-watermark")}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300"
                >
                  Check Watermark
                </button>
              </div>
            </>
          )}
        </Motion.div>
      </div>
    </Motion.div>
  );
};

export default ImageUploadPage;
