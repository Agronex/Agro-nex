import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { CropPrice } from '../types';
import { getCropPrices } from '../services/mockApi';
import LoadingSpinner from './LoadingSpinner';

const MarketPrices: React.FC = () => {
  const [prices, setPrices] = useState<CropPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPrices = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getCropPrices();
      setPrices(data);
    } catch (error) {
      console.error('Failed to fetch crop prices:', error);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600 bg-green-50';
    if (change < 0) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-48">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Market Prices</h3>
          <p className="text-sm text-gray-600">Real-time crop prices</p>
        </div>
        <button
          onClick={() => fetchPrices(true)}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">Refresh</span>
        </button>
      </div>

      <div className="space-y-3">
        {prices.map((crop) => (
          <div key={crop.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-800">{crop.name}</h4>
                <p className="text-sm text-gray-600">{crop.market}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-gray-800">
                    {crop.currentPrice.toLocaleString()} {crop.unit.split('/')[0]}
                  </span>
                  <span className="text-xs text-gray-500">/{crop.unit.split('/')[1]}</span>
                </div>
                <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getTrendColor(crop.change)}`}>
                  {getTrendIcon(crop.change)}
                  <span>
                    {crop.change > 0 ? '+' : ''}{crop.change} ({crop.changePercent > 0 ? '+' : ''}{crop.changePercent}%)
                  </span>
                </div>
              </div>
            </div>
            
            {/* Previous Price */}
            <div className="mt-2 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Previous: {crop.previousPrice.toLocaleString()} {crop.unit.split('/')[0]}/{crop.unit.split('/')[1]}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Market Insights */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-2">Market Insights</h4>
        <div className="space-y-2 text-sm text-gray-700">
          <p>• Tomato prices are trending upward due to seasonal demand</p>
          <p>• Wheat remains stable with slight positive momentum</p>
          <p>• Consider selling onions as prices may decline further</p>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default MarketPrices;