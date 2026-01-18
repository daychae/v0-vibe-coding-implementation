"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  RefreshCw,
  Sparkles,
  Download,
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  Check,
  LayoutGrid,
  Play,
  ImageIcon,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LayoutType = "4cut" | "4cut-vertical";
type FilterType = "none" | "vintage" | "bw" | "warm" | "cool" | "soft";
type FrameTheme = "coral" | "peach" | "sunset" | "cream" | "mint" | "sage" | "rose" | "lavender" | "sky" | "ocean" | "mono" | "dark";
type Step = "landing" | "camera" | "layout" | "filter" | "capture" | "result";

const FILTERS: { id: FilterType; name: string; icon: string; style: string }[] = [
  { id: "none", name: "원본", icon: "✨", style: "" },
  { id: "vintage", name: "빈티지", icon: "📷", style: "sepia(0.4) contrast(1.1) brightness(0.95)" },
  { id: "bw", name: "흑백", icon: "⚫", style: "grayscale(1) contrast(1.2)" },
  { id: "warm", name: "따뜻", icon: "🌅", style: "sepia(0.2) saturate(1.3) brightness(1.05)" },
  { id: "cool", name: "시원", icon: "❄️", style: "saturate(0.9) brightness(1.05) hue-rotate(10deg)" },
  { id: "soft", name: "부드러움", icon: "🌸", style: "contrast(0.9) brightness(1.1) saturate(0.9)" },
];

const FRAME_THEMES: { id: FrameTheme; name: string; icon: string; gradient: string; textColor: string }[] = [
  { id: "coral", name: "코랄", icon: "🌺", gradient: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)", textColor: "#d63384" },
  { id: "peach", name: "피치", icon: "🍑", gradient: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)", textColor: "#e85d04" },
  { id: "sunset", name: "선셋", icon: "🌇", gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", textColor: "#d00000" },
  { id: "cream", name: "크림", icon: "🍦", gradient: "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)", textColor: "#6c757d" },
  { id: "mint", name: "민트", icon: "🌱", gradient: "linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)", textColor: "#2d6a4f" },
  { id: "sage", name: "세이지", icon: "🌿", gradient: "linear-gradient(135deg, #c1dfc4 0%, #deecdd 100%)", textColor: "#40916c" },
  { id: "rose", name: "로즈", icon: "🌹", gradient: "linear-gradient(135deg, #ffc3a0 0%, #ffafbd 100%)", textColor: "#c9184a" },
  { id: "lavender", name: "라벤더", icon: "💜", gradient: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)", textColor: "#7209b7" },
  { id: "sky", name: "스카이", icon: "☁️", gradient: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)", textColor: "#0077b6" },
  { id: "ocean", name: "오션", icon: "🌊", gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", textColor: "#ffffff" },
  { id: "mono", name: "모노", icon: "⬜", gradient: "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)", textColor: "#424242" },
  { id: "dark", name: "다크", icon: "⬛", gradient: "linear-gradient(135deg, #434343 0%, #000000 100%)", textColor: "#ffffff" },
];

const STEPS = [
  { id: "camera", name: "카메라", icon: "📹" },
  { id: "layout", name: "레이아웃", icon: "🖼️" },
  { id: "filter", name: "필터", icon: "✨" },
  { id: "capture", name: "촬영", icon: "📸" },
  { id: "result", name: "완료", icon: "🎉" },
];

export default function PhotoboothApp() {
  const [step, setStep] = useState<Step>("landing");
  const [layout, setLayout] = useState<LayoutType>("4cut");
  const [filter, setFilter] = useState<FilterType>("none");
  const [frameTheme, setFrameTheme] = useState<FrameTheme>("peach");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [delayTime, setDelayTime] = useState(5);
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const autoCapturingRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const maxPhotos = 4;

  const startCamera = useCallback(async () => {
    setCameraError(null);

    // If stream already exists and is active, just attach to video
    if (streamRef.current && streamRef.current.active) {
      if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        try {
          await videoRef.current.play();
          setIsStreamReady(true);
        } catch (err) {
          if (err instanceof Error && err.name !== "AbortError") {
            console.error("Video play error:", err);
          }
        }
      }
      return;
    }

    setIsStreamReady(false);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraPermission("granted");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
            setIsStreamReady(true);
          } catch (err) {
            if (err instanceof Error && err.name !== "AbortError") {
              console.error("Video play error:", err);
            }
          }
        };
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraPermission("denied");
          setCameraError("카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.");
        } else if (err.name === "NotFoundError") {
          setCameraError("카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.");
        } else if (err.name === "NotReadableError") {
          setCameraError("카메라가 다른 앱에서 사용 중입니다.");
        } else {
          setCameraError(`카메라 오류: ${err.message}`);
        }
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreamReady(false);
  }, []);

  useEffect(() => {
    if (step === "camera" || step === "layout" || step === "filter" || step === "capture") {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [step, startCamera, stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isStreamReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const photoData = canvas.toDataURL("image/png");
    setPhotos((prev) => [...prev, photoData]);
  }, [isStreamReady]);

  const startCountdown = useCallback((onComplete: () => void) => {
    setIsCapturing(true);
    setCountdown(delayTime);

    let currentCount = delayTime;
    const timer = setInterval(() => {
      currentCount -= 1;
      if (currentCount <= 0) {
        clearInterval(timer);
        setCountdown(null);
        setIsCapturing(false);
        onComplete();
      } else {
        setCountdown(currentCount);
      }
    }, 1000);

    return timer;
  }, [delayTime]);

  const handleManualCapture = useCallback(() => {
    if (isCapturing || photos.length >= maxPhotos || isAutoCapturing) return;
    startCountdown(capturePhoto);
  }, [isCapturing, photos.length, maxPhotos, isAutoCapturing, startCountdown, capturePhoto]);

  const handleAutoCapture = useCallback(() => {
    if (isAutoCapturing || photos.length >= maxPhotos) return;
    
    setIsAutoCapturing(true);
    autoCapturingRef.current = true;
    
    const captureNext = (currentPhotos: number) => {
      if (!autoCapturingRef.current || currentPhotos >= maxPhotos) {
        setIsAutoCapturing(false);
        autoCapturingRef.current = false;
        return;
      }
      
      setIsCapturing(true);
      setCountdown(delayTime);
      
      let currentCount = delayTime;
      const timer = setInterval(() => {
        currentCount -= 1;
        if (currentCount <= 0) {
          clearInterval(timer);
          setCountdown(null);
          setIsCapturing(false);
          
          if (videoRef.current && canvasRef.current && isStreamReady) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            
            if (ctx) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
              ctx.drawImage(video, 0, 0);
              const photoData = canvas.toDataURL("image/png");
              
              setPhotos((prev) => {
                const newPhotos = [...prev, photoData];
                setTimeout(() => captureNext(newPhotos.length), 500);
                return newPhotos;
              });
            }
          }
        } else {
          setCountdown(currentCount);
        }
      }, 1000);
    };
    
    captureNext(photos.length);
  }, [isAutoCapturing, photos.length, maxPhotos, delayTime, isStreamReady]);

  const stopAutoCapture = useCallback(() => {
    autoCapturingRef.current = false;
    setIsAutoCapturing(false);
    setIsCapturing(false);
    setCountdown(null);
  }, []);

  const resetPhotos = () => {
    setPhotos([]);
    stopAutoCapture();
  };

  const downloadResult = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const padding = 30;
    const photoWidth = 280;
    const photoHeight = 360;
    const gap = 12;
    const topPadding = 60;
    const bottomPadding = 50;

    if (layout === "4cut") {
      canvas.width = photoWidth * 2 + gap + padding * 2;
      canvas.height = photoHeight * 2 + gap + padding * 2 + topPadding + bottomPadding;
    } else {
      canvas.width = photoWidth * 2 + gap + padding * 2;
      canvas.height = photoHeight * 3 + gap * 2 + padding * 2 + topPadding + bottomPadding;
    }

    const theme = FRAME_THEMES.find((t) => t.id === frameTheme);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    
    if (frameTheme === "dark") {
      gradient.addColorStop(0, "#434343");
      gradient.addColorStop(1, "#000000");
    } else if (frameTheme === "ocean") {
      gradient.addColorStop(0, "#667eea");
      gradient.addColorStop(1, "#764ba2");
    } else if (frameTheme === "peach") {
      gradient.addColorStop(0, "#ffecd2");
      gradient.addColorStop(1, "#fcb69f");
    } else if (frameTheme === "coral") {
      gradient.addColorStop(0, "#ff9a9e");
      gradient.addColorStop(1, "#fecfef");
    } else if (frameTheme === "mint") {
      gradient.addColorStop(0, "#d4fc79");
      gradient.addColorStop(1, "#96e6a1");
    } else if (frameTheme === "lavender") {
      gradient.addColorStop(0, "#e0c3fc");
      gradient.addColorStop(1, "#8ec5fc");
    } else if (frameTheme === "sky") {
      gradient.addColorStop(0, "#a1c4fd");
      gradient.addColorStop(1, "#c2e9fb");
    } else {
      gradient.addColorStop(0, "#ffecd2");
      gradient.addColorStop(1, "#fcb69f");
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const filterStyle = FILTERS.find((f) => f.id === filter)?.style || "";

    const loadPromises = photos.map((photo, index) => {
      return new Promise<void>((resolve) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const col = index % 2;
          const row = Math.floor(index / 2);
          const x = padding + col * (photoWidth + gap);
          const y = padding + topPadding + row * (photoHeight + gap);

          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, photoWidth, photoHeight, 6);
          ctx.clip();
          
          if (filterStyle) {
            ctx.filter = filterStyle;
          }
          
          const imgRatio = img.width / img.height;
          const targetRatio = photoWidth / photoHeight;
          let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
          
          if (imgRatio > targetRatio) {
            sWidth = img.height * targetRatio;
            sx = (img.width - sWidth) / 2;
          } else {
            sHeight = img.width / targetRatio;
            sy = (img.height - sHeight) / 2;
          }
          
          ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, photoWidth, photoHeight);
          ctx.restore();
          resolve();
        };
        img.src = photo;
      });
    });

    Promise.all(loadPromises).then(() => {
      ctx.fillStyle = theme?.textColor || "#e85d04";
      ctx.textAlign = "center";
      
      // Top logo
      ctx.font = "bold 28px 'Geist', sans-serif";
      ctx.fillText("Moment In", canvas.width / 2, padding + 35);
      
      // Bottom date in MM/DD/YYYY format
      const now = new Date();
      const dateStr = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;
      ctx.font = "500 16px 'Geist', sans-serif";
      ctx.fillText(dateStr, canvas.width / 2, canvas.height - 20);

      const link = document.createElement("a");
      link.download = `moment-in-${layout}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  };

  const getStepIndex = (s: Step): number => {
    const stepOrder: Step[] = ["camera", "layout", "filter", "capture", "result"];
    return stepOrder.indexOf(s);
  };

  const currentStepIndex = getStepIndex(step);

  const StepIndicator = () => (
    <div className="bg-white rounded-3xl shadow-lg p-4 mb-6">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 z-0" />
        <div 
          className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-pink-500 to-purple-500 -translate-y-1/2 z-0 transition-all duration-300"
          style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
        />
        {STEPS.map((s, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          return (
            <div key={s.id} className="flex flex-col items-center z-10">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all",
                  isCompleted && "bg-gradient-to-r from-pink-500 to-purple-500 text-white",
                  isCurrent && "bg-gradient-to-r from-pink-500 to-purple-500 text-white ring-4 ring-purple-200",
                  !isCompleted && !isCurrent && "bg-gray-100 text-gray-400"
                )}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : s.icon}
              </div>
              <span className={cn(
                "text-xs mt-2 font-medium",
                (isCompleted || isCurrent) ? "text-purple-600" : "text-gray-400"
              )}>
                {s.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const CameraPreview = ({ showRefresh = true }: { showRefresh?: boolean }) => (
    <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-[3/4]">
      {cameraError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-white text-sm">{cameraError}</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          {!isStreamReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="text-8xl font-bold text-white animate-pulse">{countdown}</span>
            </div>
          )}
        </>
      )}
      {showRefresh && (
        <button
          onClick={startCamera}
          className="absolute top-3 right-3 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
        >
          <RefreshCw className="w-5 h-5 text-gray-700" />
        </button>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  const PhotoGrid = ({ showNumbers = false }: { showNumbers?: boolean }) => {
    const isVertical = layout === "4cut-vertical";
    
    return (
      <div className={cn(
        "grid gap-2",
        isVertical ? "grid-cols-1" : "grid-cols-2"
      )}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "bg-gray-100 rounded-lg overflow-hidden relative",
              isVertical ? "aspect-[4/3]" : "aspect-[3/4]"
            )}
          >
            {photos[index] ? (
              <img
                src={photos[index] || "/placeholder.svg"}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
                style={{ filter: FILTERS.find((f) => f.id === filter)?.style || "" }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                <Camera className="w-8 h-8 mb-1" />
                {showNumbers && <span className="text-sm">{index + 1}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Landing Page
  if (step === "landing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-4">
            <div className="w-28 h-28 mx-auto border-4 border-pink-400 rounded-3xl flex items-center justify-center bg-white/50">
              <Camera className="w-14 h-14 text-pink-500" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              Moment In
            </h1>
            <p className="text-gray-600 text-lg">
              언제 어디서나 특별한 순간을 담아보세요
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-center text-gray-800 flex items-center justify-center gap-2">
              <span>📸</span> 시작하기 전에
            </h2>

            <div className="space-y-3">
              <div className="bg-pink-50 rounded-2xl p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-pink-600">카메라 권한 허용</h3>
                  <p className="text-gray-500 text-sm">브라우저에서 카메라 사용 권한을 요청하면 "허용"을 눌러주세요.</p>
                </div>
              </div>

              <div className="bg-purple-50 rounded-2xl p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-purple-600">카메라 확인</h3>
                  <p className="text-gray-500 text-sm">카메라가 정상적으로 작동하는지 확인하세요.</p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-blue-600">프레임 설정 & 촬영</h3>
                  <p className="text-gray-500 text-sm">레이아웃과 필터를 선택하고 촬영하세요.</p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setStep("camera")}
              className="w-full py-6 text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-2xl shadow-lg"
            >
              <Camera className="w-5 h-5 mr-2" />
              카메라 시작하기
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

          <p className="text-center text-gray-400 text-sm">
            💡 팁: 조용한 곳에서 충분한 조명 아래 촬영하면 더 좋은 결과를 얻을 수 있어요!
          </p>
        </div>
      </div>
    );
  }

  // Camera Check Step
  if (step === "camera") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-100 to-pink-100 p-6">
        <div className="max-w-4xl mx-auto">
          <StepIndicator />
          
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setStep("landing")}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              처음으로
            </button>
            <h2 className="text-xl font-bold text-gray-800">카메라 확인</h2>
            <div className="w-20" />
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
            <CameraPreview />
            
            <p className="text-center text-gray-500 text-sm">
              카메라가 정상적으로 작동하는지 확인하세요
            </p>

            <div className={cn(
              "rounded-2xl p-4 flex items-center gap-3",
              isStreamReady ? "bg-green-50" : "bg-yellow-50"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                isStreamReady ? "bg-green-100" : "bg-yellow-100"
              )}>
                {isStreamReady ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Camera className="w-5 h-5 text-yellow-600" />
                )}
              </div>
              <div>
                <h3 className={cn(
                  "font-semibold",
                  isStreamReady ? "text-green-700" : "text-yellow-700"
                )}>
                  {isStreamReady ? "카메라 연결됨" : "카메라 연결 중..."}
                </h3>
                <p className={cn(
                  "text-sm",
                  isStreamReady ? "text-green-600" : "text-yellow-600"
                )}>
                  {isStreamReady ? "화면에 자신이 보이면 정상입니다" : "잠시만 기다려주세요"}
                </p>
              </div>
            </div>

            <Button
              onClick={() => setStep("layout")}
              disabled={!isStreamReady}
              className="w-full py-6 text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-2xl shadow-lg disabled:opacity-50"
            >
              레이아웃 선택하기
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Layout Selection
  if (step === "layout") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-100 to-pink-100 p-6">
        <div className="max-w-5xl mx-auto">
          <StepIndicator />
          
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setStep("camera")}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              카메라 확인
            </button>
            <h2 className="text-xl font-bold text-gray-800">레이아웃 선택</h2>
            <div className="w-24" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl shadow-xl p-4 relative">
              <CameraPreview />
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-800">레이아웃 선택</h3>
              </div>
              <p className="text-gray-500 text-sm">원하는 레이아웃을 선택하세요</p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setLayout("4cut")}
                  className={cn(
                    "p-6 rounded-2xl border-2 transition-all",
                    layout === "4cut"
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="grid grid-cols-2 gap-1.5 mb-4 mx-auto w-fit">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-8 h-10 bg-pink-200 rounded" />
                    ))}
                  </div>
                  <p className="font-bold text-gray-800">4컷</p>
                  <p className="text-xs text-gray-500">클래식</p>
                </button>

                <button
                  onClick={() => setLayout("4cut-vertical")}
                  className={cn(
                    "p-6 rounded-2xl border-2 transition-all",
                    layout === "4cut-vertical"
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex flex-col gap-1 mb-4 mx-auto w-fit">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-12 h-5 bg-blue-200 rounded" />
                    ))}
                  </div>
                  <p className="font-bold text-gray-800">4컷</p>
                  <p className="text-xs text-gray-500">세로 일렬</p>
                </button>
              </div>

              <Button
                onClick={() => setStep("filter")}
                className="w-full py-6 text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-2xl shadow-lg"
              >
                필터 선택하기
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Filter Selection
  if (step === "filter") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-100 to-pink-100 p-6">
        <div className="max-w-5xl mx-auto">
          <StepIndicator />
          
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setStep("layout")}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              레이아웃 선택
            </button>
            <h2 className="text-xl font-bold text-gray-800">필터 선택</h2>
            <div className="w-24" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl shadow-xl p-4 relative">
              <div className={cn(
                "grid grid-cols-2 gap-2",
                layout === "6cut" && "gap-1.5"
              )}>
                {Array.from({ length: maxPhotos }).map((_, index) => (
                  <div key={index} className="aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden relative">
                    {isStreamReady ? (
                      <video
                        ref={index === 0 ? videoRef : undefined}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{ 
                          transform: "scaleX(-1)",
                          filter: FILTERS.find((f) => f.id === filter)?.style || ""
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-bold text-gray-300">{index + 1}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl font-bold text-white/50">{index + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={startCamera}
                className="absolute top-7 right-7 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
              >
                <RefreshCw className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-800">필터 선택</h3>
              </div>
              <p className="text-gray-500 text-sm">원하는 필터를 선택하세요</p>

              <div className="grid grid-cols-3 gap-3">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                      filter === f.id
                        ? "border-purple-500 bg-gradient-to-br from-pink-100 to-purple-100"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <span className="text-2xl">{f.icon}</span>
                    <span className={cn(
                      "text-sm font-medium",
                      filter === f.id ? "text-purple-600" : "text-gray-600"
                    )}>
                      {f.name}
                    </span>
                  </button>
                ))}
              </div>

              <Button
                onClick={() => setStep("capture")}
                className="w-full py-6 text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-2xl shadow-lg"
              >
                촬영 시작하기
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Capture Step
  if (step === "capture") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-100 to-pink-100 p-6">
        <div className="max-w-5xl mx-auto">
          <StepIndicator />
          
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                resetPhotos();
                setStep("filter");
              }}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              프레임 설정
            </button>
            <h2 className="text-xl font-bold text-gray-800">촬영 중</h2>
            <div className="w-24" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="relative rounded-3xl overflow-hidden bg-gray-900 aspect-[3/4]">
                {cameraError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                    <p className="text-white text-sm">{cameraError}</p>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ 
                        transform: "scaleX(-1)",
                        filter: FILTERS.find((f) => f.id === filter)?.style || ""
                      }}
                    />
                    {!isStreamReady && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                    {countdown !== null && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="text-9xl font-bold text-white animate-pulse">{countdown}</span>
                      </div>
                    )}
                  </>
                )}
                <button
                  onClick={startCamera}
                  className="absolute top-3 right-3 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                >
                  <RefreshCw className="w-5 h-5 text-gray-700" />
                </button>
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <Button
                onClick={handleManualCapture}
                disabled={isCapturing || !isStreamReady || photos.length >= maxPhotos || isAutoCapturing}
                className="w-full py-5 text-lg bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white rounded-2xl shadow-lg disabled:opacity-50"
              >
                <Camera className="w-5 h-5 mr-2" />
                수동 촬영 ({photos.length}/{maxPhotos})
              </Button>

              <Button
                onClick={isAutoCapturing ? stopAutoCapture : handleAutoCapture}
                disabled={!isStreamReady || photos.length >= maxPhotos}
                variant="outline"
                className={cn(
                  "w-full py-5 text-lg rounded-2xl",
                  isAutoCapturing
                    ? "bg-red-50 border-red-300 text-red-600 hover:bg-red-100"
                    : "bg-purple-50 border-purple-300 text-purple-600 hover:bg-purple-100"
                )}
              >
                <Play className="w-5 h-5 mr-2" />
                {isAutoCapturing ? "자동 촬영 중지" : "자동 촬영 시작"}
              </Button>

              <div className="flex items-center justify-center gap-2">
                <span className="text-gray-500 text-sm">대기 시간:</span>
                {[3, 5, 7].map((time) => (
                  <button
                    key={time}
                    onClick={() => setDelayTime(time)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all",
                      delayTime === time
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {time}초
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-800">촬영 결과</h3>
                <span className="text-gray-400 text-sm">({photos.length}/{maxPhotos})</span>
              </div>

              <PhotoGrid showNumbers />

              {photos.length >= maxPhotos && (
                <Button
                  onClick={() => setStep("result")}
                  className="w-full py-5 text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-2xl shadow-lg"
                >
                  <PartyPopper className="w-5 h-5 mr-2" />
                  완료하기
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              )}

              {photos.length > 0 && photos.length < maxPhotos && (
                <Button
                  onClick={resetPhotos}
                  variant="outline"
                  className="w-full py-3 text-gray-600 rounded-2xl bg-transparent"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  다시 촬영하기
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Result Step
  if (step === "result") {
    const selectedTheme = FRAME_THEMES.find((t) => t.id === frameTheme);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-100 to-pink-100 p-6">
        <div className="max-w-md mx-auto">
          <StepIndicator />
          
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setStep("capture")}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              다시 촬영
            </button>
            <h2 className="text-xl font-bold text-gray-800">미리보기</h2>
            <div className="w-20" />
          </div>

          <div className="space-y-6">
            <div 
              className="rounded-3xl shadow-xl p-4"
              style={{ background: selectedTheme?.gradient }}
            >
              <p 
                className="text-center mb-3 font-bold text-2xl"
                style={{ color: selectedTheme?.textColor }}
              >
                Moment In
              </p>
              <div className={cn(
                "grid grid-cols-2 gap-2",
                layout === "6cut" && "gap-1.5"
              )}>
                {photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo || "/placeholder.svg"}
                    alt={`Photo ${index + 1}`}
                    className="w-full aspect-[3/4] object-cover rounded-md"
                    style={{ filter: FILTERS.find((f) => f.id === filter)?.style || "" }}
                  />
                ))}
              </div>
              <p 
                className="text-center mt-3 text-sm font-medium"
                style={{ color: selectedTheme?.textColor }}
              >
                {new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
              </p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span>🎨</span>
                <h3 className="font-bold text-gray-800">프레임 테마</h3>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {FRAME_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setFrameTheme(theme.id)}
                    className={cn(
                      "flex flex-col items-center p-2 rounded-xl transition-all",
                      frameTheme === theme.id
                        ? "ring-2 ring-purple-500 bg-purple-50"
                        : "hover:bg-gray-50"
                    )}
                  >
                    <div 
                      className="w-10 h-10 rounded-lg mb-1 flex items-center justify-center text-lg"
                      style={{ background: theme.gradient }}
                    >
                      {theme.icon}
                    </div>
                    <span className="text-xs text-gray-600">{theme.name}</span>
                    {frameTheme === theme.id && (
                      <Check className="w-3 h-3 text-purple-500 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={downloadResult}
              className="w-full py-6 text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-2xl shadow-lg"
            >
              <Download className="w-5 h-5 mr-2" />
              사진 다운로드
            </Button>

            <Button
              onClick={() => {
                resetPhotos();
                setFilter("none");
                setStep("landing");
              }}
              variant="outline"
              className="w-full py-5 text-gray-600 rounded-2xl bg-transparent"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              새로 촬영하기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
