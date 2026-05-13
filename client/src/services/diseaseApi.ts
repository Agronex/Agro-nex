import { DiseaseDetection } from '../types';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

const DISEASE_API_URL = import.meta.env.VITE_DISEASE_API_URL || 'https://agronex.onrender.com';
const REQUEST_TIMEOUT = 10000;

export function detectCropDisease(file: File): Promise<DiseaseDetection>;
export async function detectCropDisease(file: File) {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetchWithTimeout(
      `${DISEASE_API_URL}/disease`,
      {
        method: "POST",
        body: formData,
      },
      REQUEST_TIMEOUT
    );

    if (!response.ok) {
      throw new Error('Disease detection failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Disease detection API error:', error);
    throw new Error(error instanceof Error ? error.message : 'Disease detection failed');
  }
}
