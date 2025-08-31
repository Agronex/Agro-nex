import React, { useState, useCallback } from 'react';
import { Camera, Upload, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { DiseaseDetection } from '../types';
import { detectCropDisease } from '../services/mockApi';
import LoadingSpinner from './LoadingSpinner';

const CropDiseaseDetection: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState<DiseaseDetection | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setResult(null);
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;

    setDetecting(true);
    try {
      const detection = await detectCropDisease(selectedFile);
      setResult(detection);
    } catch (error) {
      console.error('Disease detection failed:', error);
    } finally {
      setDetecting(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Camera className="w-6 h-6 text-green-600" />
        <h3 className="text-xl font-bold text-gray-800">Crop Disease Detection</h3>
      </div>

      {!selectedFile && !result && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-green-500 bg-green-50' : 'border-gray-300'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-700 mb-2">Upload Plant Image</h4>
          <p className="text-gray-600 mb-4">
            Drag and drop an image of your crop or click to browse
          </p>
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

      {selectedFile && !result && (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={URL.createObjectURL(selectedFile)}
              alt="Selected crop"
              className="w-full max-h-64 object-cover rounded-lg"
            />
            <button
              onClick={() => setSelectedFile(null)}
              className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center">
            <p className="text-gray-600 mb-4">Image ready for analysis</p>
            <button
              onClick={analyzeImage}
              disabled={detecting}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {result && (
        <div className="space-y-6">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-800">Detection Results</h4>
            <button
              onClick={() => {
                setResult(null);
                setSelectedFile(null);
              }}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Disease Detection */}
          <div className={`rounded-lg border p-4 ${getSeverityColor(result.severity)}`}>
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 mt-1" />
              <div>
                <h5 className="font-semibold mb-1">{result.detectedDisease}</h5>
                <p className="text-sm opacity-90">
                  Confidence: {result.confidence}% | Severity: {result.severity.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Treatment */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-semibold text-blue-800 mb-2 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Recommended Treatment
            </h5>
            <p className="text-blue-700 text-sm">{result.treatment}</p>
          </div>

          {/* Preventive Measures */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h5 className="font-semibold text-green-800 mb-3">Preventive Measures</h5>
            <ul className="space-y-2">
              {result.preventiveMeasures.map((measure, index) => (
                <li key={index} className="flex items-start text-sm text-green-700">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  {measure}
                </li>
              ))}
            </ul>
          </div>

          {/* New Analysis Button */}
          <div className="text-center pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setResult(null);
                setSelectedFile(null);
              }}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Analyze Another Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CropDiseaseDetection;