"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Gallery() {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(200);
  const [data, setDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchImages();
  }, [data]);

  useEffect(() => {
    if (!isPlaying || images.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, speed);

    return () => clearInterval(interval);
  }, [isPlaying, images, speed]);

  const fetchImages = async () => {
    const { data, error } = await supabase.storage
    .from("timelapse")
    .list(`frames/${date}`);

    if (error) {
      console.error(error);
      return;
    }

    if (!data) return;

    // URL生成
    const urls = data.map((file) => {
      const { data: publicUrlData } = supabase.storage
        .from("timelapse")
        .getPublicUrl(`frames/${data}/${file.name}`);

      return publicUrlData.publicUrl;
    });

    setImages(urls);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Gallery</h1>

      <h2>Timelapse</h2>

      {images.length > 0 && (
        <img src={images[currentIndex]} width={400} />
      )}

      {/*操作UI*/}
      <div style={{ marginTop: 20 }}>
        <button onClick={() => setIsPlaying(true)}>▶ 再生</button>
        <button onClick={() => setIsPlaying(false)}>⏸ 停止</button>
      </div>

      <div style={{ marginTop: 10 }}>
        速度(ms):
        <input
          type="number"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
      </div>

      <h2 style={{ marginTop: 30 }}>Images</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}
      >
        {images.map((url, i) => (
          <img 
            key={i} 
            src={url} 
            width={200} 
            onLoad={(e) => (e.currentTarget.style.opacity = "1")} 
            style={{opacity:0}}/>
        ))}
      </div>
    </div>
  );
}