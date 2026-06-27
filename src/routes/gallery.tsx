import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  FILTERS,
  LAYOUTS,
  type Session,
  deleteSession,
  formatStamp,
  loadSessions,
} from "@/lib/photobooth";
import { downloadDataUrl, renderSessionStrip } from "@/lib/render-strip";
import { StripPreview } from "@/components/strip-preview";
import { FRAME_COLORS } from "@/lib/photobooth";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — SnapFrame" },
      { name: "description", content: "Your saved SnapFrame photostrips, ready to revisit, share or re-print." },
      { property: "og:title", content: "Gallery — SnapFrame" },
      { property: "og:description", content: "Your saved SnapFrame photostrips." },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const refresh = () => setSessions(loadSessions());

  return (
    <main className="min-h-screen bg-background text-foreground font-sans">
      <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8 min-w-0">
          <Link to="/" className="font-display italic text-2xl tracking-tight shrink-0">
            SnapFrame
          </Link>
          <div className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Studio</Link>
            <Link to="/gallery" className="text-foreground">Gallery</Link>
          </div>
        </div>
        <Link
          to="/"
          className="bg-foreground text-background px-5 py-2 rounded-full text-xs font-semibold hover:bg-accent transition-colors"
        >
          New Session
        </Link>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-10 sm:py-14">
        <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
              Saved sessions
            </p>
            <h1 className="font-display italic text-4xl sm:text-5xl tracking-tight">
              Your photostrip archive
            </h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-md leading-relaxed">
              Every strip you save lives here, locally on this device. Download, share or revisit anytime.
            </p>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {sessions.length} {sessions.length === 1 ? "strip" : "strips"}
          </p>
        </header>

        {sessions.length === 0 ? (
          <div className="border border-dashed border-border rounded-3xl py-20 px-6 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
              Empty archive
            </p>
            <h2 className="font-display italic text-2xl mb-3">No strips yet.</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Capture your first photostrip in the studio, then save it to see it here.
            </p>
            <Link
              to="/"
              className="inline-block bg-foreground text-background px-5 py-2.5 rounded-full text-xs font-semibold hover:bg-accent transition-colors"
            >
              Start a session
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} onChange={refresh} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function SessionCard({ session, onChange }: { session: Session; onChange: () => void }) {
  const layout = LAYOUTS.find((l) => l.id === session.layout) ?? LAYOUTS[0];
  const filter = FILTERS.find((f) => f.id === session.filter)?.id ?? "none";
  const frame =
    FRAME_COLORS.find((f) => f.value.toLowerCase() === session.frameColor.toLowerCase()) ??
    FRAME_COLORS[0];

  const download = async () => {
    const data = await renderSessionStrip(session, 3);
    downloadDataUrl(data, `snapframe-${session.id}.png`);
  };

  return (
    <div className="space-y-4">
      <StripPreview
        shots={session.shots}
        layout={layout}
        filter={filter}
        frame={frame}
        caption={session.caption}
        stamp={session.createdAt}
      />
      <div className="flex flex-col gap-2 max-w-[300px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {formatStamp(session.createdAt)}
          </p>
          <p className="text-[10px] font-medium text-muted-foreground">{layout.label}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={download}
            className="py-2.5 bg-foreground text-background text-xs font-medium rounded-lg hover:bg-foreground/90 transition-colors"
          >
            Download
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this strip?")) {
                deleteSession(session.id);
                onChange();
              }
            }}
            className="py-2.5 border border-border text-xs font-medium rounded-lg hover:border-destructive hover:text-destructive transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
