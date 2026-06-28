import type { FilterId, FrameColor, Layout, LayoutId } from "@/lib/photobooth";
import { FILTERS, formatStamp } from "@/lib/photobooth";

type Props = {
  shots: string[];
  layout: Layout;
  filter: FilterId;
  frame: FrameColor;
  caption?: string;
  capturing?: boolean;
  capturingIndex?: number;
  stamp?: number;
};

export function StripPreview({
  shots,
  layout,
  filter,
  frame,
  caption,
  capturing,
  capturingIndex,
  stamp,
}: Props) {
  const filterCss = FILTERS.find((f) => f.id === filter)?.css ?? "none";

  return (
    <div
      className="animate-strip shadow-[0_30px_60px_-20px_rgba(0,0,0,0.25)] rounded-sm w-full max-w-[300px] mx-auto p-4"
      style={{ backgroundColor: frame.value, color: frame.text }}
    >
      <CellLayout
        layoutId={layout.id}
        slots={layout.shots}
        shots={shots}
        filterCss={filterCss}
        capturingIndex={capturing ? capturingIndex : undefined}
      />

      <div
        className="mt-5 pt-4 border-t border-dashed flex flex-col items-center gap-2"
        style={{ borderColor: `${frame.text}33` }}
      >
        <div className="text-center">
          <p className="font-display italic text-xl leading-none">SnapFrame</p>
          <p className="font-mono text-[8px] uppercase tracking-[0.3em] mt-1.5 opacity-60">
            {stamp ? formatStamp(stamp) : "Memories of Today"}
          </p>
        </div>
        {caption ? (
          <p className="font-display italic text-sm text-center mt-1 px-2 leading-snug">
            {caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CellLayout({
  layoutId,
  slots,
  shots,
  filterCss,
  capturingIndex,
}: {
  layoutId: LayoutId;
  slots: number;
  shots: string[];
  filterCss: string;
  capturingIndex?: number;
}) {
  const cells = Array.from({ length: slots }, (_, i) => i);

  if (layoutId === "strip4") {
    return (
      <div className="space-y-2.5">
        {cells.map((i) => (
          <Cell
            key={i}
            ratio="aspect-[4/3]"
            src={shots[i]}
            filterCss={filterCss}
            active={capturingIndex === i}
          />
        ))}
      </div>
    );
  }
  if (layoutId === "grid2x2") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {cells.map((i) => (
          <Cell
            key={i}
            ratio="aspect-square"
            src={shots[i]}
            filterCss={filterCss}
            active={capturingIndex === i}
          />
        ))}
      </div>
    );
  }
  if (layoutId === "polaroid") {
    return (
      <Cell
        ratio="aspect-square"
        src={shots[0]}
        filterCss={filterCss}
        active={capturingIndex === 0}
      />
    );
  }
  if (layoutId === "couple") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {cells.map((i) => (
          <Cell
            key={i}
            ratio="aspect-[3/4]"
            src={shots[i]}
            filterCss={filterCss}
            active={capturingIndex === i}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {cells.map((i) => (
        <Cell
          key={i}
          ratio="aspect-[4/3]"
          src={shots[i]}
          filterCss={filterCss}
          active={capturingIndex === i}
        />
      ))}
    </div>
  );
}

function Cell({
  ratio,
  src,
  filterCss,
  active,
}: {
  ratio: string;
  src?: string;
  filterCss: string;
  active?: boolean;
}) {
  return (
    <div className={`${ratio} bg-stone-900/90 overflow-hidden relative`}>
      {src ? (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover animate-pop"
          style={{ filter: filterCss }}
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center text-[9px] font-mono tracking-[0.2em] uppercase ${
            active ? "text-accent" : "text-stone-500"
          }`}
        >
          {active ? "Capturing…" : "—"}
        </div>
      )}
    </div>
  );
}
