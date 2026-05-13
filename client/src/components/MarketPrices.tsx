import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle, ShoppingCart } from 'lucide-react';
import { CropPrice } from '../types';
import { getCropPrices } from '../services/mockApi';
import LoadingSpinner from './LoadingSpinner';
import { getTimeAgo } from '../utils/timeUtils';

const MarketPrices: React.FC = () => {
  const [prices, setPrices] = useState<CropPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchPrices = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else {
      setLoading(true);
      setError(null);
    }

    try {
      const data = await getCropPrices();
      setPrices(data);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch crop prices';
      setError(errorMsg);
      setPrices([]);
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

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col items-center justify-center h-48 text-center animate-fadeIn">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-3" />
          <p className="text-gray-600 font-medium mb-4">{error}</p>
          <button 
            onClick={() => fetchPrices(false)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (prices.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col items-center justify-center h-48 text-center animate-fadeIn">
          <ShoppingCart className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium mb-4">No market data available</p>
          <p className="text-gray-400 text-sm mb-4">Please try again later</p>
          <button 
            onClick={() => fetchPrices(false)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
         <div>
           <h3 className="text-lg md:text-xl font-bold text-gray-800">Market Prices</h3>
           <p className="text-xs md:text-sm text-gray-600">Real-time crop prices</p>
         </div>
         <button
           onClick={() => fetchPrices(true)}
           disabled={refreshing}
           className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 min-h-10 min-w-12"
         >
           <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
           <span className="text-sm font-medium">Refresh</span>
         </button>
       </div>

       <div className="space-y-3">
         {prices.map((crop) => (
           <div key={crop.id} className="border border-gray-200 rounded-lg p-3 md:p-4 hover:shadow-sm transition-shadow">
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-0">
               <div>
                 <h4 className="font-semibold text-sm md:text-base text-gray-800">{crop.name}</h4>
                 <p className="text-xs md:text-sm text-gray-600">{crop.market}</p>
               </div>
               <div className="text-right">
                 <div className="flex items-center justify-end space-x-2 mb-1">
                   <span className="text-base md:text-lg font-bold text-gray-800">
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
       <div className="mt-6 p-3 md:p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-gray-200">
         <h4 className="font-semibold text-sm md:text-base text-gray-800 mb-2">Market Insights</h4>
         <div className="space-y-2 text-xs md:text-sm text-gray-700">
           <p>• Tomato prices are trending upward due to seasonal demand</p>
           <p>• Wheat remains stable with slight positive momentum</p>
           <p>• Consider selling onions as prices may decline further</p>
         </div>
       </div>

       {/* Last Updated */}
       <div className="mt-4 text-center">
         <p className="text-xs text-gray-500">
           Last updated: {getTimeAgo(lastUpdated)}
         </p>
       </div>
     </div>
  );
};

export default MarketPrices;
