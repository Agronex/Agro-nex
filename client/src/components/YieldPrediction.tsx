import React, { useState } from 'react';
import { BarChart3, Target, TrendingUp } from 'lucide-react';
import { YieldPrediction as YieldPredictionType } from '../types';
import { getYieldPrediction } from '../services/mockApi';
import LoadingSpinner from './LoadingSpinner';

const YieldPrediction: React.FC = () => {
  const [cropName, setCropName] = useState('');
  const [prediction, setPrediction] = useState<YieldPredictionType | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    if (!cropName.trim()) return;

    setLoading(true);
    try {
      const result = await getYieldPrediction(cropName);
      setPrediction(result);
    } catch (error) {
      console.error('Yield prediction failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFactorColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-yellow-500';
    if (score >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getFactorLabel = (factor: string) => {
    switch (factor) {
      case 'weather': return 'Weather Conditions';
      case 'soil': return 'Soil Quality';
      case 'irrigation': return 'Irrigation System';
      case 'pestControl': return 'Pest Control';
      default: return factor;
    }
  };

  const cropOptions = [
    'Wheat', 'Rice', 'Corn', 'Tomato', 'Onion', 'Potato', 'Cotton', 'Sugarcane'
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <BarChart3 className="w-6 h-6 text-green-600" />
        <h3 className="text-xl font-bold text-gray-800">Yield Prediction</h3>
      </div>

      {/* Crop Selection */}
      <div className="mb-6">
        <label htmlFor="crop-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Crop
        </label>
        <div className="flex space-x-2">
          <select
            id="crop-select"
            value={cropName}
            onChange={(e) => setCropName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Choose a crop</option>
            {cropOptions.map((crop) => (
              <option key={crop} value={crop}>{crop}</option>
            ))}
          </select>
          <button
            onClick={handlePredict}
            disabled={!cropName.trim() || loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              'Predict'
            )}
          </button>
        </div>
      </div>

      {/* Prediction Results */}
      {prediction && (
        <div className="space-y-6">
          {/* Main Prediction */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
            <div className="text-center">
              <Target className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h4 className="text-2xl font-bold text-gray-800 mb-2">
                {prediction.expectedYield.toFixed(1)} quintals/hectare
              </h4>
              <p className="text-gray-600">Expected yield for {prediction.cropName}</p>
              <div className="mt-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  prediction.confidence >= 80 ? 'bg-green-100 text-green-800' : 
                  prediction.confidence >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                  {prediction.confidence}% confidence
                </span>
              </div>
            </div>
          </div>

          {/* Factors Analysis */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-4">Contributing Factors</h4>
            <div className="space-y-3">
              {Object.entries(prediction.factors).map(([factor, score]) => (
                <div key={factor} className="flex items-center space-x-3">
                  <span className="w-32 text-sm text-gray-700">{getFactorLabel(factor)}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getFactorColor(score)}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className="w-12 text-sm font-medium text-gray-800">{score}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Recommendations to Improve Yield
            </h4>
            <ul className="space-y-2">
              {prediction.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start text-sm text-blue-700">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>

          {/* Additional Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h5 className="font-semibold text-yellow-800 mb-2">Best Case Scenario</h5>
              <p className="text-sm text-yellow-700">
                With optimal conditions: {(prediction.expectedYield * 1.2).toFixed(1)} quintals/hectare
              </p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h5 className="font-semibold text-orange-800 mb-2">Conservative Estimate</h5>
              <p className="text-sm text-orange-700">
                With current practices: {(prediction.expectedYield * 0.85).toFixed(1)} quintals/hectare
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!prediction && !loading && (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-600 mb-2">Select a crop to get started</h4>
          <p className="text-gray-500">
            Choose your crop from the dropdown above to receive AI-powered yield predictions
          </p>
        </div>
      )}
    </div>
  );
};

export default YieldPrediction;