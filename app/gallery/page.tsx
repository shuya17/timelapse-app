"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import UIButton from "../components/Button";

export default function Gallery() {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(200);
  const [project, setProject] = useState("experiment1");
  const [projects, setProjects] = useState<string[]>([]);
  const today = new Date().toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [inputPassword, setInputPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const authStatus = sessionStorage.getItem("lab_app_authorized");
    if (authStatus === "true") {
      setIsAuthorized(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    fetchImages();
  }, [startDate, endDate, project, isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) return;
    fetchProjects();
  }, [isAuthorized]);

  useEffect(() => {
    if (!isPlaying || images.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        // 最後まで行ったら停止
        if (prev >= images.length - 1) {
          clearInterval(interval);
          setIsPlaying(false);
          return prev;
        }

        return prev + 1;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [isPlaying, images, speed]);

  // パスワードチェック関数
  const handleAuth = () => {
    if (inputPassword === process.env.NEXT_PUBLIC_APP_PASSWORD) {
      sessionStorage.setItem("lab_app_authorized", "true"); // 目印をブラウザに保存
      setIsAuthorized(true);
    } else {
      alert("パスワードが違います");
    }
  };

  const fetchImages = async () => {
    // 指定された期間の日付文字列（YYYY-MM-DD）の配列を先に作成
    const dateList: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dateList.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    // すべての日付のStorageリクエストを配列に
    const fetchPromises = dateList.map(async (dateString) => {
      const { data, error } = await supabase.storage
        .from("timelapse")
        .list(`frames/${project}/${dateString}`, {
          sortBy: {
            column: "name",
            order: "asc",
          },
        });

      if (error || !data) return [];

      // 各ファイルのパブリックURLを生成して返す
      return data.map((file) => {
        const { data: publicUrlData } = supabase.storage
          .from("timelapse")
          .getPublicUrl(`frames/${project}/${dateString}/${file.name}`);
        return publicUrlData.publicUrl;
      });
    });

    try {
      // Promise.allですべての日付のデータを同時に一斉取得
      const results = await Promise.all(fetchPromises);

      // 二次元配列になっている結果を一つの配列に結合
      const allUrls = results.flat();

      setImages(allUrls);
      setCurrentIndex(0);
    } catch (err) {
      console.error("画像の取得中にエラーが発生しました:", err);
    }
  };

  const downloadImage = async (url: string, index: number) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `image_${index}.webp`;

    a.click();

    URL.revokeObjectURL(blobUrl);
  };

  const fetchProjects = async () => {
    const { data, error } = await supabase.storage
      .from("timelapse")
      .list("frames");

    if (error) {
      console.error(error);
      return;
    }

    if (!data) return;

    const names = data
      .map((folder) => folder.name)
      .filter((name) => !name.startsWith("."));

    setProjects(names);
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
        <h2>🔒 研究室専用タイムラプスアプリ (ギャラリー)</h2>
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
    <div
      style={{
        textAlign: "center",
        padding: 20,
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: 36,
          marginBottom: 20,
        }}
      >
        ギャラリー
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

      {/* 期間選択 */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 30,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: "bold",
              marginBottom: 5,
              fontSize: 18,
            }}
          >
            開始日
          </div>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "2px solid #d1d5db",
              fontSize: 16,
              backgroundColor: "white",
            }}
          />
        </div>

        <div>
          <div
            style={{
              fontWeight: "bold",
              marginBottom: 5,
              fontSize: 18,
            }}
          >
            終了日
          </div>

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "2px solid #d1d5db",
              fontSize: 16,
              backgroundColor: "white",
            }}
          />
        </div>
      </div>

      <h2
        style={{
          fontSize: 48,
          fontWeight: "bold",
          marginBottom: 40,
          textAlign: "center",
        }}
      >
        Timelapse
      </h2>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 30,
          marginBottom: 50,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight: "bold",
          }}
        >
          実験名:
        </div>

        <select
          value={project}
          onChange={(e) => setProject(e.target.value)}
          style={{
            padding: "18px 24px",
            borderRadius: 16,
            border: "2px solid #d1d5db",
            backgroundColor: "white",

            fontSize: 18,
            width: 500,

            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            outline: "none",
            cursor: "pointer",
          }}
        >
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 30,
          marginBottom: 40,
        }}
      >
        {images.length > 0 && (
          <div
            style={{
              width: "80%",
              maxWidth: 1400,
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <img
              src={images[currentIndex]}
              style={{
                width: "100%",
                display: "block",
                objectFit: "contain",
              }}
            />
          </div>
        )}
      </div>

      {/*操作UI*/}
      <div
        style={{
          marginTop: 40,
          display: "flex",
          justifyContent: "center",
          gap: 30,
        }}
      >
        <UIButton
          onClick={() => {
            setCurrentIndex(0);
            setIsPlaying(true);
          }}
        >
          ▶ 再生
        </UIButton>
        <UIButton onClick={() => setIsPlaying(false)} color="red">
          ⏸ 停止
        </UIButton>
      </div>

      <div
        style={{
          marginTop: 30,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: "bold",
          }}
        >
          速度(ms):
        </div>
        <input
          type="number"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: "2px solid #d1d5db",
            backgroundColor: "white",
            fontSize: 22,
            width: 140,
            textAlign: "center",
            outline: "none",
          }}
        />
      </div>

      <h2
        style={{
          marginTop: 40,
          marginBottom: 20,
          fontSize: 36,
          fontWeight: "bold",
        }}
      >
        Images
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 15,
        }}
      >
        {images.map((url, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <img
              src={url}
              width={200}
              onLoad={(e) => (e.currentTarget.style.opacity = "1")}
              style={{
                opacity: 0,
                borderRadius: 8,
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                transition: "0.2s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            />

            <div style={{ marginTop: 5 }}>
              <button onClick={() => downloadImage(url, i)}>⬇ DL</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
