import { useCallback, useEffect, useRef, useState } from "react";

export type CameraState = "idle" | "requesting" | "ready" | "error";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");

  const start = useCallback(
    async (mode: "user" | "environment" = facing) => {
      setState("requesting");
      setError(null);
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setFacing(mode);
        setState("ready");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Camera unavailable";
        setError(msg);
        setState("error");
      }
    },
    [facing],
  );

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState("idle");
  }, []);

  const flip = useCallback(() => {
    start(facing === "user" ? "environment" : "user");
  }, [facing, start]);

  const capture = useCallback(
    (cssFilter: string): string | null => {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return null;
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.save();
      // Mirror selfie cam
      if (facing === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.filter = cssFilter;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      return canvas.toDataURL("image/jpeg", 0.92);
    },
    [facing],
  );

  useEffect(() => () => stop(), [stop]);

  return { videoRef, state, error, facing, start, stop, flip, capture };
}
