import { CropPrice, DiseaseDetection, Alert, YieldPrediction, CommunityPost } from '../types';

export const mockCropPrices: CropPrice[] = [
  { id: '1', name: 'Wheat', currentPrice: 2150, previousPrice: 2100, change: 50, changePercent: 2.38, unit: '₹/quintal', market: 'Mandi' },
  { id: '2', name: 'Rice', currentPrice: 1850, previousPrice: 1920, change: -70, changePercent: -3.65, unit: '₹/quintal', market: 'Mandi' },
  { id: '3', name: 'Corn', currentPrice: 1650, previousPrice: 1600, change: 50, changePercent: 3.13, unit: '₹/quintal', market: 'Market Yard' },
  { id: '4', name: 'Tomato', currentPrice: 3500, previousPrice: 3200, change: 300, changePercent: 9.38, unit: '₹/quintal', market: 'Wholesale' },
  { id: '5', name: 'Onion', currentPrice: 2800, previousPrice: 3100, change: -300, changePercent: -9.68, unit: '₹/quintal', market: 'Mandi' },
  { id: '6', name: 'Potato', currentPrice: 1200, previousPrice: 1150, change: 50, changePercent: 4.35, unit: '₹/quintal', market: 'Local Market' }
];

export const mockAlerts: Alert[] = [
  { id: '1', type: 'weather', severity: 'warning', title: 'Heavy Rain Alert', message: 'Heavy rainfall expected in the next 24 hours. Consider protective measures for crops.', timestamp: '2025-01-18T14:30:00Z', read: false },
  { id: '2', type: 'pest', severity: 'critical', title: 'Aphid Infestation Risk', message: 'High aphid activity reported in nearby farms. Monitor your crops closely.', timestamp: '2025-01-18T10:15:00Z', read: false },
  { id: '3', type: 'irrigation', severity: 'info', title: 'Optimal Irrigation Time', message: 'Based on current weather conditions, evening irrigation is recommended.', timestamp: '2025-01-18T08:00:00Z', read: true },
  { id: '4', type: 'disease', severity: 'warning', title: 'Fungal Disease Alert', message: 'High humidity levels may promote fungal diseases. Apply preventive fungicides.', timestamp: '2025-01-17T16:45:00Z', read: true }
];

export const mockYieldPrediction: YieldPrediction = {
  cropName: 'Wheat',
  expectedYield: 45.2,
  confidence: 87,
  factors: {
    weather: 85,
    soil: 78,
    irrigation: 92,
    pestControl: 88
  },
  recommendations: [
    'Continue current irrigation schedule',
    'Monitor for rust diseases in the coming weeks',
    'Consider nitrogen top-dressing at flowering stage',
    'Plan harvest timing based on weather forecast'
  ]
};

export const mockCommunityPosts: CommunityPost[] = [
  { id: '1', author: 'Ravi Kumar', title: 'Best practices for organic wheat farming', content: 'I\'ve been practicing organic wheat farming for 5 years...', category: 'tip', timestamp: '2025-01-18T12:00:00Z', likes: 24, replies: 8 },
  { id: '2', author: 'Priya Sharma', title: 'How to deal with pest attacks in tomatoes?', content: 'My tomato plants are showing signs of pest damage...', category: 'question', timestamp: '2025-01-18T09:30:00Z', likes: 12, replies: 15 },
  { id: '3', author: 'Amit Singh', title: 'Record harvest this season!', content: 'Thanks to proper soil management and timely irrigation...', category: 'success', timestamp: '2025-01-17T18:20:00Z', likes: 45, replies: 12 }
];


export const getCropPrices = (): Promise<CropPrice[]> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(mockCropPrices), 800);
  });
};

export const detectCropDisease = (imageFile: File): Promise<DiseaseDetection> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        id: Date.now().toString(),
        imageName: imageFile.name,
        detectedDisease: 'Leaf Spot Disease',
        confidence: 89,
        severity: 'medium',
        treatment: 'Apply copper-based fungicide every 7-10 days',
        preventiveMeasures: [
          'Ensure proper air circulation',
          'Avoid overhead watering',
          'Remove affected leaves immediately',
          'Apply preventive fungicide sprays'
        ],
        date: new Date().toISOString()
      });
    }, 2000);
  });
};

export const getYieldPrediction = (cropName: string): Promise<YieldPrediction> => {
  return new Promise(resolve => {
    setTimeout(() => resolve({...mockYieldPrediction, cropName}), 1500);
  });
};