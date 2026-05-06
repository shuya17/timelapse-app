"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [intervalMin, setIntervalMin] = useState(1);
  const [status, setStatus] = useState("初期化中...");
  const [isRecording, setIsRecording] = useState(false);

  const [blobs, setBlobs] = useState<Blob[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // カメラ起動
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video:{ width:1920, height:1080 },})
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus("カメラ接続完了");
      })
      .catch(() => {
        setStatus("カメラエラー");
      });
  }, []);


  const cleanupOldData = async () => {
    const { data } = await supabase.storage
      .from("timelapse")
      .list("frames");

    if (!data) return;

    const now = new Date();

    for (const folder of data) {
      const folderDate = new Date(folder.name);
      const diff =
        (now.getTime() - folderDate.getTime()) /
        (1000 * 60 * 60 * 24);

      if (diff > 5) {
        const { data: files } = await supabase.storage
          .from("timelapse")
          .list(`frames/${folder.name}`);

        if (!files) continue;

        const paths = files.map(
          (f) => `frames/${folder.name}/${f.name}`
        );

        await supabase.storage
          .from("timelapse")
          .remove(paths);
      }
    }
  };

  // 撮影（まだ保存しない）
  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;



    //カメラ描画
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Blobに変換してアップロード
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      // ローカル保存用
      setBlobs((prev) => [...prev, blob]);

      // const fileName = `frame_${Date.now()}.webp`;
      const today = new Date().toISOString().split("T")[0];
      const fileName = `frame_${Date.now()}.webp`;
      const filePath = `frames/${today}/${fileName}`;
      const { error } = await supabase.storage
      .from("timelapse")
      .upload(filePath, blob);
      
      if (error) {
        console.error(error);
        setStatus("アップロード失敗");
      } else {
        setStatus(`アップロード成功: ${fileName}`);
      }


      await cleanupOldData();
    },
    "image/webp",
    0.7 //画質
  );
  };


  // スタート
  const start = () => {
    setIsRecording(true);
    captureFrame();

    intervalRef.current = setInterval(
      () => {
        captureFrame();
      },
      intervalMin * 60 * 1000,
    );
  };

  // ストップ
  const stop = () => {
    setIsRecording(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus("停止しました");
  };

  // ローカル保存
  const downloadAll = () => {
    blobs.forEach((blob, i) => {
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `frame_${i}.webp`;
      a.click();

      URL.revokeObjectURL(url);
    });
  };

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h1>Timelapse Camera</h1>

      <video ref={videoRef} autoPlay width={1920} />

      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        style={{ display: "none" }}
      />

      <div style={{ marginTop: 20 }}>
        <input
          type="number"
          value={intervalMin}
          onChange={(e) => setIntervalMin(Number(e.target.value))}
        />
        分ごとに撮影
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={start} disabled={isRecording}>
          START
        </button>
        <button onClick={stop}>STOP</button>
      </div>


      <div style={{ marginTop: 20 }}>
        <button onClick={downloadAll}>
          ローカルに保存
        </button>
      </div>

      <p>{status}</p>
    </div>
  );
}
