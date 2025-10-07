import { DiseaseDetection } from '../types';

export function detectCropDisease(file: File): Promise<DiseaseDetection>;
export async function detectCropDisease(file: File) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("http://localhost:5000/disease", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Disease detection failed");
  }

  return await response.json();
}
