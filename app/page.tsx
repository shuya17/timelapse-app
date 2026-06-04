"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import UIButton from "./components/Button";
export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [project, setProject] = useState("experiment1");
  const [intervalMin, setIntervalMin] = useState(1);
  const [status, setStatus] = useState("初期化中...");
  const [isRecording, setIsRecording] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<any>(null);

  // --- 既存のState定義のエリアに追加 ---
  const [inputPassword, setInputPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);

  // 画面が開いた瞬間に、すでに他のページで認証済みかチェック
  useEffect(() => {
    const authStatus = sessionStorage.getItem("lab_app_authorized");
    if (authStatus === "true") {
      setIsAuthorized(true);
    }
  }, []);

  // カメラ起動
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { width: 1920, height: 1080 } })
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

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (
        wakeLockRef.current &&
        typeof wakeLockRef.current.release === "function"
      ) {
        wakeLockRef.current.release();
      }
    };
  }, []);

  // パスワードチェック関数
  const handleAuth = () => {
    if (inputPassword === process.env.NEXT_PUBLIC_APP_PASSWORD) {
      sessionStorage.setItem("lab_app_authorized", "true"); // 目印をブラウザに保存
      setIsAuthorized(true);
    } else {
      alert("パスワードが違います");
    }
  };

  const cleanupOldFrames = async () => {
    const MAX_IMAGES = 2500;

    // project一覧取得
    const { data: projects, error: projectError } = await supabase.storage
      .from("timelapse")
      .list("frames");

    if (projectError || !projects) {
      console.error(projectError);
      return;
    }

    // projectごとに処理
    for (const projectFolder of projects) {
      const projectName = projectFolder.name;

      // 日付一覧取得
      const { data: dateFolders, error: dateError } = await supabase.storage
        .from("timelapse")
        .list(`frames/${projectName}`);

      if (dateError || !dateFolders) continue;

      let allFiles: {
        path: string;
        created: string;
      }[] = [];

      // 各日付フォルダ確認
      for (const dateFolder of dateFolders) {
        const dateName = dateFolder.name;

        const { data: files, error: fileError } = await supabase.storage
          .from("timelapse")
          .list(`frames/${projectName}/${dateName}`);

        if (fileError || !files) continue;

        // ファイル追加
        files.forEach((file) => {
          allFiles.push({
            path: `frames/${projectName}/${dateName}/${file.name}`,
            created: file.created_at || file.name,
          });
        });
      }

      // 古い順
      allFiles.sort((a, b) => a.created.localeCompare(b.created));

      // 超過分削除
      if (allFiles.length > MAX_IMAGES) {
        const deleteCount = allFiles.length - MAX_IMAGES;

        const deleteTargets = allFiles
          .slice(0, deleteCount)
          .map((file) => file.path);

        console.log(`${projectName}: ${deleteCount}枚削除`);

        const { error: removeError } = await supabase.storage
          .from("timelapse")
          .remove(deleteTargets);

        if (removeError) {
          console.error(removeError);
        }
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

    const now = new Date();

    const timeText = now.toLocaleDateString() + " " + now.toLocaleTimeString();

    ctx.fillStyle = "white";
    ctx.font = "48px Arial";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;

    // 右下位置
    const x = canvas.width - 550;
    const y = canvas.height - 40;

    // 黒縁
    ctx.strokeText(timeText, x, y);

    // 白文字
    ctx.fillText(timeText, x, y);

    // Blobに変換してアップロード
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;

        // const fileName = `frame_${Date.now()}.webp`;
        const nowTime = new Date();
        const year = nowTime.getFullYear();
        const month = String(nowTime.getMonth() + 1).padStart(2, "0"); // 月は0から始まるので+1
        const date = String(nowTime.getDate()).padStart(2, "0");
        const today = `${year}-${month}-${date}`;
        const fileName = `frame_${Date.now()}.webp`;
        const filePath = `frames/${project}/${today}/${fileName}`;
        const { error } = await supabase.storage
          .from("timelapse")
          .upload(filePath, blob);

        if (error) {
          console.error(error);
          setStatus("アップロード失敗");
        } else {
          setStatus(`アップロード成功: ${project}`);
        }
      },
      "image/webp",
      0.9, //画質
    );
  };

  // スタート
  const start = async () => {
    setIsRecording(true);
    setStatus("古いフレームをクリーンアップ中...");

    if ("wakeLock" in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request(
          "screen",
        );
        console.log("スリープ防止ロックを取得しました");
      } catch (err) {
        console.error("スリープ防止の取得に失敗:", err);
      }
    }
    await cleanupOldFrames();
    setStatus("撮影を開始しました");
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

    // スリープ防止解除
    if (
      wakeLockRef.current &&
      typeof wakeLockRef.current.release === "function"
    ) {
      wakeLockRef.current
        .release()
        .then(() => {
          wakeLockRef.current = null;
          console.log("スリープ防止ロックを解除しました");
        })
        .catch((err: any) => console.error("解除エラー:", err));
    } else {
      wakeLockRef.current = null;
    }
    setStatus("停止しました");
  };


   if (!isAuthorized) {
     return (
       <div
         style={{
           textAlign: "center",
           padding: 50,
           backgroundColor: "#f5f5f5",
           minHeight: "100vh",
         }}
       >
         <h2>🔒 研究室専用タイムラプスアプリ</h2>
         <p>アクセスするには共通パスワードを入力してください</p>
         <input
           type="password"
           value={inputPassword}
           onChange={(e) => setInputPassword(e.target.value)}
           style={{
             padding: 10,
             fontSize: 18,
             borderRadius: 8,
             border: "2px solid #ccc",
             marginRight: 10,
             outline: "none",
           }}
         />
         <UIButton onClick={handleAuth}>認証</UIButton>
       </div>
     );
   }

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h1
        style={{
          fontSize: 36,
          marginBottom: 20,
        }}
      >
        📷 撮影ページ
      </h1>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <Link href="/">
          <UIButton>📷 撮影ページ</UIButton>
        </Link>

        <Link href="/gallery">
          <UIButton>ギャラリー</UIButton>
        </Link>
      </div>

      <div
        style={{
          marginBottom: 30,
          display: "flex",
          alignItems: "center",
          gap: 20,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: "bold",
          }}
        >
          実験名:
        </div>

        <input
          type="text"
          value={project}
          onChange={(e) =>
            setProject(
              e.target.value.replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase(),
            )
          }
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: "2px solid #d1d5db",
            backgroundColor: "white",
            fontSize: 24,
            width: 500,
            outline: "none",
          }}
        />
      </div>

      <video
        ref={videoRef}
        autoPlay
        style={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          maxWidth: 1300,
          boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
        }}
      />

      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        style={{ display: "none" }}
      />

      <div
        style={{
          marginTop: 40,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 20,
        }}
      >
        <input
          type="number"
          value={intervalMin}
          onChange={(e) => setIntervalMin(Number(e.target.value))}
          style={{
            padding: "12px 16px",
            border: "2px solid #d1d5db",
            backgroundColor: "white",
            fontSize: 24,
            width: 120,
            textAlign: "center",
            outline: "none",
          }}
        />

        <div
          style={{
            fontSize: 28,
            fontWeight: "bold",
          }}
        >
          分ごとに撮影
        </div>
      </div>

      {/* START STOP */}
      <div
        style={{
          marginTop: 40,
          display: "flex",
          justifyContent: "center",
          gap: 30,
        }}
      >
        <UIButton onClick={start} disabled={isRecording}>
          START
        </UIButton>

        <UIButton onClick={stop} color="red">
          STOP
        </UIButton>
      </div>

      {/* ステータス */}
      <div
        style={{
          marginTop: 30,
          fontSize: 24,
          fontWeight: "bold",
          color: status.includes("エラー") ? "#dc2626" : "#16a34a",
        }}
      >
        {status}
      </div>
    </div>
  );
}
