// src/services/realApi.ts
export async function detectCropDisease(file: File) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("https://agronex.onrender.com/disease", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to analyze image");
  }

  const data = await response.json();
  return data;
}
