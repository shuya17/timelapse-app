"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Gallery() {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    const { data, error } = await supabase.storage
      .from("timelapse")
      .list("frames", {
        limit: 100,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      console.error(error);
      return;
    }

    const urls = data.map((file) => {
      return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/timelapse/frames/${file.name}`;
    });

    setImages(urls);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Gallery</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {images.map((url, i) => (
          <img key={i} src={url} width={200} />
        ))}
      </div>
    </div>
  );
}