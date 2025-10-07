export interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  uvIndex: number;
  condition: string;
  forecast: WeatherForecast[];
}

export interface WeatherForecast {
  date: string;
  temperature: {
    max: number;
    min: number;
  };
  condition: string;
  rainfall: number;
}

export interface CropPrice {
  id: string;
  name: string;
  currentPrice: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  unit: string;
  market: string;
}

export interface CropRecord {
  id: string;
  cropName: string;
  variety: string;
  plantingDate: string;
  expectedHarvest: string;
  area: number;
  location: string;
  status: 'planted' | 'growing' | 'harvested';
  notes: string;
}

export interface DiseaseDetection {
  suggestions: any;
  plantName: any;
  similarImage: any;
  id: string;
  imageName: string;
  detectedDisease: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  treatment: string;
  preventiveMeasures: string[];
  date: string;
}

export interface Alert {
  id: string;
  type: 'weather' | 'pest' | 'disease' | 'irrigation';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface YieldPrediction {
  cropName: string;
  expectedYield: number;
  confidence: number;
  factors: {
    weather: number;
    soil: number;
    irrigation: number;
    pestControl: number;
  };
  recommendations: string[];
}

// src/types.ts
export interface CommunityPost {
  id: string; 
  author: string; // user displayName or email
  title: string;
  content: string;
  category: 'question' | 'tip' | 'success' | 'alert';
  timestamp: any; // Firestore timestamp (serverTimestamp) or ISO string
  likes: number;
  replies: number;
}
