import { fetchWithTimeout } from '../utils/fetchWithTimeout';

const DISEASE_API_URL = import.meta.env.VITE_DISEASE_API_URL || 'https://agronex.onrender.com';
const REQUEST_TIMEOUT = 10000;

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
      throw new Error('Failed to analyze image');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Disease detection error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to analyze image');
  }
}
