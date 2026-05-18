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

export type ChatRole = 'user' | 'assistant' | 'system';
export type ChatResponseLength = 'short' | 'balanced' | 'detailed';
export type ChatResponseTone = 'professional' | 'friendly' | 'coach';
export type WeatherUnit = 'metric' | 'imperial';
export type DensityMode = 'comfortable' | 'compact';
export type ThemeMode = 'system' | 'light' | 'dark';
export type DigestFrequency = 'never' | 'daily' | 'weekly';
export type DefaultView = 'dashboard' | 'weather' | 'disease-detection' | 'market-prices' | 'yield-prediction' | 'farm-logbook' | 'community' | 'settings';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
}

export interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
  messageCount: number;
}

export interface ChatSettings {
  streamingEnabled: boolean;
  memoryDepth: number;
  responseLength: ChatResponseLength;
  tone: ChatResponseTone;
  temperature: number;
  maxTokens: number;
  practicalBias: boolean;
}

export interface WeatherSettings {
  units: WeatherUnit;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  refreshMinutes: number;
}

export interface NotificationSettings {
  enabled: boolean;
  weatherAlerts: boolean;
  diseaseAlerts: boolean;
  marketAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  digestFrequency: DigestFrequency;
  soundEnabled: boolean;
}

export interface AppearanceSettings {
  theme: ThemeMode;
  fontScale: number;
  density: DensityMode;
  highContrast: boolean;
  reducedMotion: boolean;
}

export interface PrivacySettings {
  saveChatHistory: boolean;
  allowAnalytics: boolean;
  shareUsageData: boolean;
  autoDeleteDays: number;
}

export interface SessionSettings {
  defaultView: DefaultView;
  rememberSidebarState: boolean;
}

export interface UserSettings {
  ai: ChatSettings;
  weather: WeatherSettings;
  notifications: NotificationSettings;
  appearance: AppearanceSettings;
  privacy: PrivacySettings;
  session: SessionSettings;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  ai: {
    streamingEnabled: true,
    memoryDepth: 20,
    responseLength: 'balanced',
    tone: 'professional',
    temperature: 0.55,
    maxTokens: 700,
    practicalBias: true,
  },
  weather: {
    units: 'metric',
    locationLabel: '',
    latitude: null,
    longitude: null,
    refreshMinutes: 10,
  },
  notifications: {
    enabled: true,
    weatherAlerts: true,
    diseaseAlerts: true,
    marketAlerts: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '06:00',
    digestFrequency: 'daily',
    soundEnabled: true,
  },
  appearance: {
    theme: 'system',
    fontScale: 100,
    density: 'comfortable',
    highContrast: false,
    reducedMotion: false,
  },
  privacy: {
    saveChatHistory: true,
    allowAnalytics: true,
    shareUsageData: false,
    autoDeleteDays: 0,
  },
  session: {
    defaultView: 'dashboard',
    rememberSidebarState: true,
  },
};

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
