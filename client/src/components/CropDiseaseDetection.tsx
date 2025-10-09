import React, { useState, useCallback } from "react";
import { Camera, Upload, AlertTriangle, X } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

const preventiveMeasures: Record<string, string> = {
  "Corn___Common_Rust": "Plant resistant varieties, remove infected debris, avoid overhead irrigation, monitor moisture levels.",
  "Corn___Gray_Leaf_Spot": "Rotate crops, control weeds, remove infected plant debris, apply fungicides if necessary.",
  "Corn___Leaf_Blight": "Use disease-free seeds, maintain proper spacing, apply fungicides, remove infected leaves.",
  "Corn___Healthy": "Your corn appears healthy. Maintain proper watering and fertilization practices.",
  "Potato___Early_Blight": "Remove infected leaves, rotate crops, avoid overhead irrigation, and apply copper-based fungicides if needed.",
  "Potato___Late_Blight": "Remove and destroy infected plants, ensure proper drainage, use resistant varieties, apply fungicides early.",
  "Potato___Healthy": "Your potato crop looks healthy. Keep monitoring and follow good agricultural practices.",
  "Rice___Brown_Spot": "Apply balanced fertilization, avoid excessive nitrogen, rotate crops, and treat soil if needed.",
  "Rice___Leaf_Blast": "Use resistant rice varieties, maintain proper water levels, and apply fungicides on early infection.",
  "Rice___Healthy": "Your rice crop appears healthy. Continue good cultivation practices.",
  "Wheat___Brown_Rust": "Plant resistant wheat varieties, avoid dense planting, remove infected plants, apply fungicides if necessary.",
  "Wheat___Yellow_Rust": "Use resistant varieties, remove volunteer wheat, ensure crop rotation, and apply fungicides if needed.",
  "Wheat___Healthy": "Your wheat crop looks healthy. Maintain optimal soil and irrigation management.",
  "Invalid": "Please upload a valid image file.",
  "Default": "Follow good agricultural practices.",
};

const diseaseDetails: Record<string, string> = {
  "Corn___Common_Rust": "A fungal disease caused by *Puccinia sorghi*, forming reddish-brown pustules on leaves that reduce photosynthesis and yield.",
  "Corn___Gray_Leaf_Spot": "Caused by *Cercospora zeae-maydis*, it creates rectangular gray lesions that limit photosynthesis and weaken the plant.",
  "Corn___Leaf_Blight": "A foliar disease that leads to elongated brown lesions, causing premature leaf death and yield loss.",
  "Corn___Healthy": "Your corn appears healthy. No visible symptoms of disease detected.",
  "Potato___Early_Blight": "Caused by *Alternaria solani*, it forms dark concentric spots on older leaves, leading to leaf drop and reduced yield.",
  "Potato___Late_Blight": "Caused by *Phytophthora infestans*, it produces water-soaked lesions that turn brown, affecting both leaves and tubers severely.",
  "Potato___Healthy": "Your potato crop is healthy. No signs of early or late blight observed.",
  "Rice___Brown_Spot": "Caused by *Bipolaris oryzae*, it forms brown oval lesions on leaves and grains, reducing plant vigor and grain quality.",
  "Rice___Leaf_Blast": "A major fungal disease by *Magnaporthe oryzae*, causing spindle-shaped lesions that lead to leaf death and yield loss.",
  "Rice___Healthy": "Your rice plants appear healthy with no disease symptoms.",
  "Wheat___Brown_Rust": "Caused by *Puccinia triticina*, it creates small orange-brown pustules on leaves, reducing photosynthesis and grain filling.",
  "Wheat___Yellow_Rust": "Caused by *Puccinia striiformis*, it forms yellow stripes on leaves, leading to stunted growth and lower yield.",
  "Wheat___Healthy": "Your wheat crop looks healthy. No rust or leaf spots observed.",
  "Invalid": "Invalid input image. Please upload a clear image of a crop leaf.",
  "Default": "No detailed information available for this disease.",
};

interface Prediction {
  label: string;
  score: number;
}

const CropDiseaseDetection: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith("image/")) {
      setSelectedFile(files[0]);
      setPredictions([]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPredictions([]);
    }
  };

  // 🔄 Function to call your backend API
  const analyzeImage = async () => {
  if (!selectedFile) return;
  setDetecting(true);

  try {
    const formData = new FormData();
    formData.append("image", selectedFile);

    // ✅ Matches your Express route setup
    const response = await fetch("https://agronex.onrender.com/disease", {
  method: "POST",
  body: formData,
});


    if (!response.ok) throw new Error("Server error. Please try again.");

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const top = data.sort((a, b) => b.score - a.score)[0];
      setPredictions([top]);
    } else {
      setPredictions([]);
    }
  } catch (err) {
    console.error("Error analyzing image:", err);
    alert("⚠️ Failed to analyze image. Please try again.");
  } finally {
    setDetecting(false);
  }
};

  const majorDiseases = [
    "Corn___Leaf_Blight",
    "Potato___Late_Blight",
    "Rice___Leaf_Blast",
    "Wheat___Brown_Rust",
    "Wheat___Yellow_Rust",
    "Invalid",
  ];
  const healthy = [
    "Healthy",
    "Potato___Healthy",
    "Corn___Healthy",
    "Rice___Healthy",
    "Wheat___Healthy",
  ];
  const minorDiseases = [
    "Corn___Common_Rust",
    "Corn___Gray_Leaf_Spot",
    "Potato___Early_Blight",
    "Rice___Brown_Spot",
  ];

  const getSeverityColor = (label: string) => {
    if (healthy.includes(label))
      return "text-green-600 bg-green-50 border-green-200";
    if (majorDiseases.includes(label))
      return "text-red-600 bg-red-50 border-red-200";
    if (minorDiseases.includes(label))
      return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full min-h-screen flex flex-col items-center">
      <div className="flex items-center space-x-3 mb-6">
        <Camera className="w-6 h-6 text-green-600" />
        <h3 className="text-xl font-bold text-gray-800">Crop Disease Detection</h3>
      </div>

      <div className="w-full max-w-4xl">
        {!selectedFile && predictions.length === 0 && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive ? "border-green-500 bg-green-50" : "border-gray-300"
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => e.preventDefault()}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">Upload Plant Image</h4>
            <p className="text-gray-600 mb-4">Drag and drop or click to browse</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Image
            </label>
          </div>
        )}

        {selectedFile && predictions.length === 0 && (
          <div className="space-y-4 mt-4">
            <div className="relative">
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Selected crop"
                className="w-full object-contain max-h-[500px] rounded-lg"
              />
              <button
                onClick={() => setSelectedFile(null)}
                className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center">
              <p className="text-gray-600 mb-4">Image ready for analysis</p>
              <button
                onClick={analyzeImage}
                disabled={detecting}
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {detecting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Analyze Image
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {predictions.length > 0 && (
  <div className="flex justify-center w-full mt-8">
    <div className="w-full max-w-4xl bg-gray-50 rounded-xl shadow-lg p-6 border border-gray-200">
      {/* Image Preview */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="w-full md:w-1/2">
          <img
            src={URL.createObjectURL(selectedFile as File)}
            alt="Uploaded crop"
            className="w-full rounded-lg shadow-md object-cover"
          />
        </div>

        {/* Result Details */}
        <div className="w-full md:w-1/2 space-y-4">
          {predictions.map((pred, index) => {
            const preventive =
              preventiveMeasures[pred.label] || preventiveMeasures["Default"];
            const details =
              diseaseDetails[pred.label] || diseaseDetails["Default"];

            return (
              <div key={index} className="space-y-4">
                <div
                  className={`rounded-lg border p-4 ${getSeverityColor(
                    pred.label
                  )} shadow-sm`}
                >
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-6 h-6 mt-1" />
                    <div>
                      <h5 className="text-lg font-semibold mb-1">
                        {pred.label.replace(/_/g, " ")}
                      </h5>
                    </div>
                  </div>
                </div>

                {/* Disease Details */}
                {!pred.label.includes("Healthy") && (
                  <div className="border rounded-lg bg-white shadow-sm p-4">
                    <h6 className="font-semibold mb-2 text-gray-800">
                      🧪 Disease Details
                    </h6>
                    <p className="text-sm text-gray-700">{details}</p>
                  </div>
                )}

                {/* Preventive Measures */}
                <div className="border rounded-lg bg-green-50 p-4 shadow-sm">
                  <h6 className="font-semibold mb-2 text-green-800">
                    🛡 Preventive Measures
                  </h6>
                  <p className="text-sm text-green-700">{preventive}</p>
                </div>

                {/* Recommended Treatments (only for diseased cases) */}
                {!pred.label.includes("Healthy") && (
                  <div className="border rounded-lg bg-blue-50 p-4 shadow-sm">
                    <h6 className="font-semibold mb-2 text-blue-800">
                      💊 Recommended Treatments
                    </h6>
                    <ul className="list-disc list-inside text-sm text-blue-700">
                      {preventive
                        .split(",")
                        .map((item, idx) => (
                          <li key={idx} className="mb-1">
                            {item.trim()}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Button */}
      <div className="text-center pt-6 border-t mt-6">
        <button
          onClick={() => {
            setSelectedFile(null);
            setPredictions([]);
          }}
          className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Analyze Another Image
        </button>
      </div>
    </div>
  </div>
)}

      </div>
    </div>
  );
};

export default CropDiseaseDetection;
