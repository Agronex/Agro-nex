import React, { useState, useCallback } from "react";
import { Camera, Upload, AlertTriangle, X, CheckCircle, Microscope } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";
import { fetchWithRetry } from "../utils/retryFetch";
import { addActivity } from "../utils/activityStore";
import { invalidateAlertCache } from "../services/alertService";

/** Shape of the enriched response from our Python ML service */
interface MLPrediction {
  label: string;         // e.g. "rice__Brown_spot"
  score: number;         // 0-1
  crop: string;          // e.g. "rice"
  disease: string;       // e.g. "Brown spot"
  confidence: number;    // 0-1
  severity: "healthy" | "warning" | "critical";
  details: string;
  preventive: string;
  top5: Array<{ label: string; score: number; crop: string; disease: string }>;
  gradcam: string | null; // base64 PNG
  device: string;
}

const CROP_EMOJI: Record<string, string> = {
  rice: "🌾",
  cotton: "🌿",
  sugarcane: "🎋",
  unknown: "🌱",
};

const CROP_COLOR: Record<string, string> = {
  rice: "#4CAF50",
  cotton: "#2196F3",
  sugarcane: "#FF9800",
  unknown: "#9E9E9E",
};

const getSeverityStyle = (severity: string) => {
  switch (severity) {
    case "healthy":   return "text-green-700 bg-green-50 border-green-300";
    case "critical":  return "text-red-700 bg-red-50 border-red-300";
    case "warning":   return "text-orange-700 bg-orange-50 border-orange-300";
    default:          return "text-gray-700 bg-gray-50 border-gray-300";
  }
};

const getSeverityIcon = (severity: string) => {
  if (severity === "healthy") return <CheckCircle className="w-6 h-6 mt-0.5" />;
  return <AlertTriangle className="w-6 h-6 mt-0.5" />;
};

const CropDiseaseDetection: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState<MLPrediction | null>(null);
  const [fileError, setFileError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [showGradCAM, setShowGradCAM] = useState(true);

  const validateFile = (file: File): string[] => {
    const errors: string[] = [];
    if (!file.type.startsWith("image/")) errors.push("Please upload an image file (JPG, PNG, etc.)");
    if (file.size > 10 * 1024 * 1024) errors.push("File size must be less than 10MB");
    return errors;
  };

  const setFile = (file: File) => {
    const errors = validateFile(file);
    if (errors.length > 0) {
      setFileError(errors.join(" • "));
      setSelectedFile(null);
      setPreviewUrl(null);
      setResult(null);
      return;
    }
    setFileError("");
    setUploadError("");
    setSelectedFile(file);
    setResult(null);
    // Create preview URL and revoke old one
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const analyzeImage = async () => {
    if (!selectedFile || detecting) return;
    setDetecting(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const diseaseApiUrl = import.meta.env.VITE_DISEASE_API_URL || "http://localhost:5000";
      const response = await fetchWithRetry(`${diseaseApiUrl}/disease`, { method: "POST", body: formData }, 3);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Server error. Please try again.");
      }

      const data: MLPrediction = await response.json();
      setResult(data);

      // Log to activity store
      addActivity({
        type: "disease_scan",
        title: "Disease scan completed",
        detail: `${data.crop.charAt(0).toUpperCase() + data.crop.slice(1)} — ${data.disease} (${(data.confidence * 100).toFixed(1)}%)`,
        color: data.severity === "healthy" ? "green" : data.severity === "critical" ? "red" : "yellow",
      });

      // Invalidate alert cache so next dashboard load gets fresh alerts
      invalidateAlertCache();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to analyze image";
      setUploadError(msg);
    } finally {
      setDetecting(false);
    }
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setFileError("");
    setUploadError("");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 w-full min-h-screen flex flex-col items-center">
      <div className="flex items-center space-x-3 mb-5 self-start">
        <Microscope className="w-6 h-6 text-green-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800">Crop Disease Detection</h3>
      </div>

      {/* Supported crops badge */}
      <div className="w-full max-w-3xl mb-4 flex flex-wrap gap-2">
        {["🌾 Rice", "🌿 Cotton", "🎋 Sugarcane"].map((c) => (
          <span key={c} className="px-3 py-1 bg-green-50 border border-green-200 text-green-700 text-xs font-medium rounded-full">
            {c}
          </span>
        ))}
        <span className="px-3 py-1 bg-gray-50 border border-gray-200 text-gray-500 text-xs rounded-full">
          EfficientNetV2-S Model
        </span>
      </div>

      <div className="w-full max-w-3xl">
        {/* Upload zone — shown when no file selected */}
        {!selectedFile && !result && (
          <div
            className={`border-2 border-dashed rounded-xl p-6 sm:p-10 text-center transition-all cursor-pointer
              ${dragActive ? "border-green-500 bg-green-50" : "border-gray-300 bg-white hover:border-green-400 hover:bg-gray-50"}`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onClick={() => document.getElementById("image-upload")?.click()}
          >
            <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-base sm:text-lg font-semibold text-gray-700 mb-1">Drag & drop or tap to browse</h4>
            <p className="text-sm text-gray-500 mb-3">Upload a plant leaf image for AI disease detection</p>
            {fileError && (
              <p className="text-red-500 mb-3 p-2 bg-red-50 rounded text-sm">{fileError}</p>
            )}
            {uploadError && (
              <p className="text-red-500 mb-3 p-2 bg-red-50 rounded text-sm">{uploadError}</p>
            )}
            <p className="text-gray-400 text-xs">JPG, PNG — max 10MB</p>
            <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" id="image-upload" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); document.getElementById("image-upload")?.click(); }}
              className="mt-4 inline-flex items-center px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors text-sm font-medium min-h-[44px]"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Image
            </button>
          </div>
        )}

        {/* Image preview + analyze button */}
        {selectedFile && !result && (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <img
                src={previewUrl || ""}
                alt="Selected leaf"
                className="w-full object-contain max-h-[280px] sm:max-h-[420px]"
              />
              <button
                onClick={reset}
                className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <p className="text-red-500 p-3 bg-red-50 rounded-lg text-sm border border-red-200">{uploadError}</p>
            )}

            <div className="text-center">
              <p className="text-gray-500 text-sm mb-3">Image ready for AI analysis</p>
              <button
                onClick={analyzeImage}
                disabled={detecting || !!fileError}
                className="inline-flex items-center px-6 sm:px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium min-h-[48px] shadow-sm text-sm sm:text-base"
              >
                {detecting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Analyze Image
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-5">
            {/* Image + Main Result — stacked on mobile, side-by-side on md+ */}
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
              {/* Uploaded image */}
              <div className="w-full md:w-2/5">
                <img
                  src={previewUrl || ""}
                  alt="Analyzed leaf"
                  className="w-full rounded-xl shadow object-cover max-h-[220px] sm:max-h-[280px] md:max-h-none"
                />
              </div>

              {/* Result card */}
              <div className="w-full md:w-3/5 space-y-3">
                {/* Prediction badge */}
                <div className={`rounded-xl border-2 p-4 ${getSeverityStyle(result.severity)}`}>
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(result.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xl">{CROP_EMOJI[result.crop] || "🌱"}</span>
                        <h4 className="text-lg sm:text-xl font-bold truncate">{result.disease}</h4>
                      </div>
                      <p className="text-sm font-medium opacity-80 capitalize">
                        Crop: <strong>{result.crop}</strong>
                      </p>
                      {/* Confidence bar */}
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1 opacity-70">
                          <span>Confidence</span>
                          <span>{(result.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2.5 bg-black bg-opacity-10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${result.confidence * 100}%`,
                              backgroundColor: CROP_COLOR[result.crop] || "#4CAF50",
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-xs mt-2 opacity-60">Device: {result.device?.toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                {/* Disease details */}
                {result.severity !== "healthy" && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <h5 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">🧪 Disease Details</h5>
                    <p className="text-sm text-gray-700 leading-relaxed">{result.details}</p>
                  </div>
                )}

                {/* Preventive measures */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
                  <h5 className="font-semibold text-green-800 mb-2 text-sm sm:text-base">
                    {result.severity === "healthy" ? "✅ Keep It Up" : "🛡️ Preventive Measures"}
                  </h5>
                  <p className="text-sm text-green-700 leading-relaxed">{result.preventive}</p>
                </div>
              </div>
            </div>

            {/* Top-5 predictions */}
            {result.top5 && result.top5.length > 1 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h5 className="font-semibold text-gray-700 mb-3 text-sm">📊 Top-5 Predictions</h5>
                <div className="space-y-2">
                  {result.top5.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs w-5 text-gray-400 font-mono">{i + 1}.</span>
                      <span className="text-xs text-gray-600 w-32 sm:w-40 truncate capitalize">
                        {p.disease} ({p.crop})
                      </span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${p.score * 100}%`,
                            backgroundColor: CROP_COLOR[p.crop] || "#9E9E9E",
                            opacity: i === 0 ? 1 : 0.6,
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-12 text-right">
                        {(p.score * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GradCAM heatmap */}
            {result.gradcam && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowGradCAM((prev) => !prev)}
                  className="w-full flex items-center justify-between p-3 sm:p-4 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors min-h-[48px]"
                >
                  <span>🔬 GradCAM Attention Heatmap</span>
                  <span className="text-gray-400 text-xs">{showGradCAM ? "Hide" : "Show"}</span>
                </button>
                {showGradCAM && (
                  <div className="p-3 sm:p-4 pt-0">
                    <p className="text-xs text-gray-500 mb-2">Regions the model focused on for this prediction:</p>
                    <img
                      src={`data:image/png;base64,${result.gradcam}`}
                      alt="GradCAM heatmap"
                      className="w-full rounded-lg"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Bottom actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={reset}
                className="flex-1 px-5 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-800 active:bg-gray-900 transition-colors text-sm font-medium min-h-[48px]"
              >
                Analyze Another Image
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CropDiseaseDetection;
