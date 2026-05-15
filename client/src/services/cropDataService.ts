/**
 * cropDataService.ts
 * Handles real API calls for crop market prices and yield prediction estimates.
 * Note: Yield prediction uses curated estimates (no live data source exists for India).
 */
import { CropPrice, YieldPrediction } from '../types';

// ── Market Prices ─────────────────────────────────────────────────────────────
const PRIORITY_COMMODITIES = [
  'Wheat', 'Rice', 'Onion', 'Tomato', 'Potato',
  'Corn', 'Mustard', 'Sugarcane', 'Paddy', 'Maize',
];

export async function getCropPrices(): Promise<CropPrice[]> {
  const url =
    'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070' +
    '?api-key=579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b' +
    '&format=json&limit=50&filters[state]=Tamil%20Nadu';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`Market API error: ${response.status}`);

    const result = await response.json();
    if (!Array.isArray(result.records)) throw new Error('Invalid market API response');

    const formatted: CropPrice[] = result.records.map((item: any, index: number) => {
      const currentPrice  = parseFloat(item.modal_price) || 0;
      const previousPrice = parseFloat(item.min_price)   || 0;
      const change        = currentPrice - previousPrice;
      const changePercent = previousPrice
        ? parseFloat(((change / previousPrice) * 100).toFixed(2))
        : 0;

      return {
        id:             String(index),
        name:           item.commodity || 'Unknown',
        currentPrice,
        previousPrice,
        change,
        changePercent,
        unit:           '₹/quintal',
        market:         item.market || 'Market',
      };
    });

    // Sort priority commodities first
    return formatted.sort((a, b) => {
      const ap = PRIORITY_COMMODITIES.includes(a.name) ? 0 : 1;
      const bp = PRIORITY_COMMODITIES.includes(b.name) ? 0 : 1;
      return ap - bp;
    });
  } catch (err) {
    clearTimeout(timeout);
    console.error('[MarketPrices] Fetch failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

// ── Yield Prediction (curated estimates) ──────────────────────────────────────
const YIELD_ESTIMATES: YieldPrediction[] = [
  { cropName: 'Wheat',     expectedYield: 45.2, confidence: 87, factors: { weather: 85, soil: 78, irrigation: 92, pestControl: 88 }, recommendations: ['Continue current irrigation schedule', 'Monitor for rust diseases', 'Consider nitrogen top-dressing at flowering', 'Plan harvest timing based on forecast'] },
  { cropName: 'Rice',      expectedYield: 52.1, confidence: 90, factors: { weather: 88, soil: 80, irrigation: 95, pestControl: 85 }, recommendations: ['Maintain water level at optimal height', 'Apply balanced fertilization', 'Monitor for leaf blast disease', 'Prepare for harvesting based on forecast'] },
  { cropName: 'Corn',      expectedYield: 38.7, confidence: 85, factors: { weather: 82, soil: 77, irrigation: 90, pestControl: 86 }, recommendations: ['Monitor for common rust and gray leaf spot', 'Maintain soil moisture', 'Apply fungicides if necessary', 'Ensure proper fertilization'] },
  { cropName: 'Tomato',    expectedYield: 24.5, confidence: 88, factors: { weather: 80, soil: 75, irrigation: 93, pestControl: 90 }, recommendations: ['Maintain drip irrigation schedule', 'Monitor for aphid infestation', 'Apply organic pesticides if needed', 'Harvest when fruits are mature'] },
  { cropName: 'Onion',     expectedYield: 30.2, confidence: 86, factors: { weather: 83, soil: 78, irrigation: 89, pestControl: 84 }, recommendations: ['Monitor for thrips', 'Maintain soil moisture', 'Apply balanced fertilization', 'Harvest according to bulb maturity'] },
  { cropName: 'Potato',    expectedYield: 42.8, confidence: 87, factors: { weather: 85, soil: 80, irrigation: 92, pestControl: 88 }, recommendations: ['Ensure proper hilling and spacing', 'Monitor for late blight', 'Apply fungicides early', 'Maintain soil moisture'] },
  { cropName: 'Cotton',    expectedYield: 35.6, confidence: 84, factors: { weather: 80, soil: 76, irrigation: 88, pestControl: 82 }, recommendations: ['Monitor for bollworm', 'Ensure proper irrigation', 'Apply balanced fertilization', 'Follow integrated pest management'] },
  { cropName: 'Sugarcane', expectedYield: 95.3, confidence: 89, factors: { weather: 87, soil: 81, irrigation: 94, pestControl: 86 }, recommendations: ['Maintain proper irrigation schedule', 'Monitor for pest infestation', 'Ensure balanced fertilization', 'Prepare for harvesting based on growth stage'] },
];

export function getYieldPrediction(cropName: string): Promise<YieldPrediction> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const prediction = YIELD_ESTIMATES.find(
        (p) => p.cropName.toLowerCase() === cropName.toLowerCase()
      );
      if (prediction) resolve(prediction);
      else reject(new Error(`No yield data for crop: ${cropName}`));
    }, 1000); // Simulated latency
  });
}
