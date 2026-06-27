import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useCamera } from "@/hooks/use-camera";
import {
  FILTERS,
  FRAME_COLORS,
  LAYOUTS,
  MODES,
  type FilterId,
  type LayoutId,
  type ModeId,
  type Session,
  saveSession,
} from "@/lib/photobooth";
import { downloadDataUrl, renderStrip } from "@/lib/render-strip";
import { StripPreview } from "./strip-preview";

type CountdownSec = 3 | 5 | 10;

export function PhotoBooth() {
  const cam = useCamera();
  const [mode, setMode] = useState<ModeId>("solo");
  const [layoutId, setLayoutId] = useState<LayoutId>("strip4");
  const [filter, setFilter] = useState<FilterId>("none");
  const [frameId, setFrameId] = useState<string>("white");
  const [countdownSec, setCountdownSec] = useState<CountdownSec>(3);
  const [caption, setCaption] = useState("");
  const [shots, setShots] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturingIndex, setCapturingIndex] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stamp, setStamp] = useState<number | null>(null);
  const cancelRef = useRef(false);

  const layout = useMemo(() => LAYOUTS.find((l) => l.id === layoutId)!, [layoutId]);
  const frame = useMemo(() => FRAME_COLORS.find((f) => f.id === frameId)!, [frameId]);
  const filterCss = useMemo(() => FILTERS.find((f) => f.id === filter)?.css ?? "none", [filter]);

  // Auto-pick a sensible layout when mode changes
  useEffect(() => {
    if (mode === "couple") setLayoutId("couple");
    else if (mode === "friends" || mode === "group") setLayoutId("collage");
    else setLayoutId("strip4");
  }, [mode]);

  const allDone = shots.length >= layout.shots;

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const id = setInterval(() => {
        if (cancelRef.current) {
          clearInterval(id);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(id);
        resolve();
      }, ms);
    });

  const captureOne = useCallback(
    async (index: number) => {
      setCapturingIndex(index);
      for (let n = countdownSec; n > 0; n--) {
        if (cancelRef.current) return;
        setCountdown(n);
        await wait(1000);
      }
      setCountdown(null);
      setFlash(true);
      setTimeout(() => setFlash(false), 350);
      const data = cam.capture(filterCss);
      if (data) {
        setShots((prev) => [...prev, data]);
      }
      setCapturingIndex(null);
    },
    [cam, countdownSec, filterCss],
  );

  const runSession = useCallback(async () => {
    if (cam.state !== "ready") {
      await cam.start();
    }
    cancelRef.current = false;
    setShots([]);
    setStamp(Date.now());
    setBusy(true);
    for (let i = 0; i < layout.shots; i++) {
      if (cancelRef.current) break;
      await captureOne(i);
      if (i < layout.shots - 1) await wait(700);
    }
    setBusy(false);
    setCapturingIndex(null);
  }, [cam, layout.shots, captureOne]);

  const cancel = () => {
    cancelRef.current = true;
    setBusy(false);
    setCountdown(null);
    setCapturingIndex(null);
  };

  const retake = () => {
    cancel();
    setShots([]);
  };

  const handleUpload = (files: FileList | null) => {
    if (!files) return;
    const remaining = layout.shots - shots.length;
    const list = Array.from(files).slice(0, remaining);
    Promise.all(
      list.map(
        (f) =>
          new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.readAsDataURL(f);
          }),
      ),
    ).then((urls) => {
      setShots((prev) => [...prev, ...urls].slice(0, layout.shots));
      if (!stamp) setStamp(Date.now());
    });
  };

  const exportPng = async () => {
    if (!allDone) return;
    const data = await renderStrip({
      shots,
      layout: layout.id,
      filter,
      frameColor: frame.value,
      frameText: frame.text,
      caption: caption || undefined,
      stamp: stamp ?? Date.now(),
      scale: 3,
    });
    downloadDataUrl(data, `snapframe-${Date.now()}.png`);
  };

  const saveToGallery = () => {
    if (!allDone) return;
    const s: Session = {
      id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: stamp ?? Date.now(),
      mode,
      layout: layout.id,
      filter,
      frameColor: frame.value,
      caption: caption || undefined,
      shots,
    };
    saveSession(s);
  };

  return (
    <main className="min-h-screen bg-background text-foreground font-sans selection:bg-accent/20">
      {/* Flash overlay */}
      <div
        className={`fixed inset-0 bg-white z-[60] pointer-events-none transition-opacity duration-300 ${
          flash ? "opacity-90" : "opacity-0"
        }`}
      />

      <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8 min-w-0">
          <Link to="/" className="font-display italic text-2xl tracking-tight shrink-0">
            SnapFrame
          </Link>
          <div className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/" className="text-foreground">Studio</Link>
            <Link to="/gallery" className="hover:text-foreground transition-colors">Gallery</Link>
            <a href="#templates" className="hover:text-foreground transition-colors">Templates</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            KR / SEOUL
          </span>
          <button
            onClick={runSession}
            disabled={busy}
            className="bg-foreground text-background px-5 py-2 rounded-full text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50"
          >
            {busy ? "In session…" : "Print Now"}
          </button>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-10 lg:gap-12 p-4 sm:p-6 md:p-10">
        {/* Left: Camera Stage */}
        <div className="space-y-8 animate-reveal min-w-0">
          {/* Mode Selector */}
          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
              Mode
            </h3>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`px-4 py-2 rounded-full border text-xs font-medium transition-colors ${
                    mode === m.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Capture Preview */}
          <div className="relative aspect-[4/3] bg-stone-900 rounded-3xl overflow-hidden ring-1 ring-black/5">
            <video
              ref={cam.videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{
                filter: filterCss,
                transform: cam.facing === "user" ? "scaleX(-1)" : undefined,
              }}
            />

            {/* Idle / error overlays */}
            {cam.state !== "ready" && (
              <div className="absolute inset-0 grid place-items-center bg-stone-900 text-stone-300 p-8 text-center">
                <div className="space-y-5 max-w-sm">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-stone-500">
                    {cam.state === "error" ? "Camera blocked" : "Camera off"}
                  </p>
                  <h2 className="font-display italic text-3xl text-paper">
                    {cam.state === "error"
                      ? "We couldn't reach your camera."
                      : "Step into the booth."}
                  </h2>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    {cam.state === "error"
                      ? cam.error ?? "Check your browser permissions or upload photos instead."
                      : "Allow camera access to capture your photostrip, or upload photos from your device."}
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center pt-2">
                    <button
                      onClick={() => cam.start()}
                      className="bg-paper text-ink px-5 py-2.5 rounded-full text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {cam.state === "requesting" ? "Connecting…" : "Enable camera"}
                    </button>
                    <label className="border border-stone-700 text-stone-200 px-5 py-2.5 rounded-full text-xs font-semibold cursor-pointer hover:border-stone-300 transition-colors">
                      Upload photos
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleUpload(e.target.files)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* HUD */}
            {cam.state === "ready" && (
              <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between pointer-events-none">
                <div className="flex justify-between items-start">
                  <div className="bg-black/30 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[10px] font-mono tracking-tighter uppercase">
                    {busy ? `Capturing ${Math.min(shots.length + 1, layout.shots)} / ${layout.shots}` : "Live"}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="size-2 rounded-full bg-accent animate-pulse" />
                    <span className="bg-black/30 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-tighter">
                      {countdownSec}s
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-6">
                  {countdown !== null ? (
                    <div className="text-white font-display italic text-7xl sm:text-8xl drop-shadow-2xl animate-pop">
                      {countdown}
                    </div>
                  ) : (
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/70 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      {allDone ? "Strip complete" : "Tap below to start"}
                    </p>
                  )}

                  <button
                    onClick={busy ? cancel : runSession}
                    className="pointer-events-auto size-16 sm:size-20 rounded-full border-4 border-white flex items-center justify-center group hover:scale-105 transition-transform"
                    aria-label={busy ? "Cancel capture" : "Start capture"}
                  >
                    <div
                      className={`size-12 sm:size-14 rounded-full transition-all ${
                        busy ? "bg-accent rounded-md" : "bg-white group-hover:scale-90"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action bar under camera */}
          <div className="flex flex-wrap items-center gap-3 -mt-2">
            <button
              onClick={cam.flip}
              disabled={cam.state !== "ready"}
              className="text-xs font-medium px-4 py-2 border border-border rounded-full hover:border-foreground transition-colors disabled:opacity-40"
            >
              Flip camera
            </button>
            <button
              onClick={retake}
              disabled={shots.length === 0 && !busy}
              className="text-xs font-medium px-4 py-2 border border-border rounded-full hover:border-foreground transition-colors disabled:opacity-40"
            >
              Retake all
            </button>
            <label className="text-xs font-medium px-4 py-2 border border-border rounded-full hover:border-foreground transition-colors cursor-pointer">
              Upload
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
            </label>

            <div className="ml-auto flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Timer
              </span>
              {([3, 5, 10] as CountdownSec[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setCountdownSec(s)}
                  className={`size-9 rounded-full text-xs font-medium transition-colors ${
                    countdownSec === s
                      ? "bg-foreground text-background"
                      : "border border-border hover:border-foreground"
                  }`}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>

          {/* Customization rails */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 min-w-0">
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Filter Palette
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`shrink-0 flex flex-col items-center gap-2 group`}
                  >
                    <div
                      className={`size-16 rounded-xl transition-all ${
                        filter === f.id
                          ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                          : "ring-1 ring-border group-hover:ring-foreground/40"
                      }`}
                      style={{ background: f.swatch }}
                    />
                    <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">
                      {f.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 min-w-0" id="templates">
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Layout
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setLayoutId(l.id);
                      setShots((prev) => prev.slice(0, l.shots));
                    }}
                    className={`shrink-0 px-4 py-3 rounded-xl border text-left transition-colors min-w-[140px] ${
                      layoutId === l.id
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground"
                    }`}
                  >
                    <p className="text-xs font-semibold">{l.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{l.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Frame & caption */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Frame Color
              </h3>
              <div className="flex flex-wrap gap-3">
                {FRAME_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setFrameId(c.id)}
                    title={c.label}
                    aria-label={c.label}
                    className={`size-9 rounded-full border transition-transform hover:scale-110 ${
                      frameId === c.id ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "border-border"
                    }`}
                    style={{ background: c.value }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Caption (optional)
              </h3>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 160))}
                placeholder="A small dedication or note…"
                rows={2}
                className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm font-display italic placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground transition-colors"
              />
              <p className="text-[10px] font-mono tracking-tight text-muted-foreground text-right">
                {caption.length} / 160
              </p>
            </div>
          </div>
        </div>

        {/* Right: Strip preview + actions */}
        <aside className="space-y-6">
          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-tight">Live Strip</h2>
                <p className="text-xs text-muted-foreground">
                  {allDone ? "Ready to print" : `${shots.length} / ${layout.shots} captured`}
                </p>
              </div>
              <button
                onClick={exportPng}
                disabled={!allDone}
                className="text-xs font-medium text-accent hover:underline underline-offset-4 disabled:opacity-40 disabled:no-underline"
              >
                Export HQ
              </button>
            </div>

            <StripPreview
              shots={shots}
              layout={layout}
              filter={filter}
              frame={frame}
              caption={caption}
              capturing={busy}
              capturingIndex={capturingIndex ?? undefined}
              stamp={stamp ?? undefined}
            />

            <div className="space-y-3">
              <button
                onClick={exportPng}
                disabled={!allDone}
                className="w-full py-4 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 transition-all disabled:opacity-40"
              >
                Download PNG · 300 DPI
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={saveToGallery}
                  disabled={!allDone}
                  className="py-3 border border-border text-xs font-medium rounded-xl hover:border-foreground transition-all disabled:opacity-40"
                >
                  Save to Gallery
                </button>
                <button
                  onClick={async () => {
                    if (!allDone) return;
                    const data = await renderStrip({
                      shots,
                      layout: layout.id,
                      filter,
                      frameColor: frame.value,
                      frameText: frame.text,
                      caption: caption || undefined,
                      stamp: stamp ?? Date.now(),
                      scale: 2,
                    });
                    const blob = await (await fetch(data)).blob();
                    const file = new File([blob], "snapframe.png", { type: "image/png" });
                    if (navigator.share && (navigator.canShare?.({ files: [file] }) ?? false)) {
                      navigator.share({ files: [file], title: "SnapFrame", text: caption || "My photostrip" }).catch(() => {});
                    } else {
                      downloadDataUrl(data, `snapframe-${Date.now()}.png`);
                    }
                  }}
                  disabled={!allDone}
                  className="py-3 border border-border text-xs font-medium rounded-xl hover:border-foreground transition-all disabled:opacity-40"
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <footer className="border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="font-display italic text-lg">SnapFrame</p>
            <p className="text-xs text-muted-foreground">Made for soft afternoons in Seongsu-dong.</p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            © {new Date().getFullYear()} SnapFrame Studio
          </p>
        </div>
      </footer>
    </main>
  );
}
