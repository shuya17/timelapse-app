"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [intervalMin, setIntervalMin] = useState(1);
  const [status, setStatus] = useState("初期化中...");
  const [isRecording, setIsRecording] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // カメラ起動
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
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

      const fileName = `frame_${Date.now()}.webp`;
      const { error } = await supabase.storage
        .from("timelapse")
        .upload(`frames/${fileName}`, blob);

      if (error) {
        console.error(error);
        setStatus("アップロード失敗");
      } else {
        setStatus(`アップロード成功: ${fileName}`);
      }
    }, "image/webp");
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

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h1>Timelapse Camera</h1>

      <video ref={videoRef} autoPlay width={400} />

      <canvas
        ref={canvasRef}
        width={400}
        height={300}
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

      <p>{status}</p>
    </div>
  );
}
