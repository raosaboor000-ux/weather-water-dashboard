"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  buildCatchmentMapLabels,
  type MapLabelBounds,
} from "@/lib/risk-profile-map-labels";

type Props = {
  src: string;
  alt: string;
  caption: ReactNode;
  imgW: number;
  imgH: number;
  fontSize?: number;
  bounds?: MapLabelBounds;
  imageClassName?: string;
};

export function RiskLabeledMapCard({
  src,
  alt,
  caption,
  imgW,
  imgH,
  fontSize = 13,
  bounds,
  imageClassName = "bg-white",
}: Props) {
  const labels = useMemo(
    () => buildCatchmentMapLabels(imgW, imgH, fontSize, bounds),
    [imgW, imgH, fontSize, bounds]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="relative z-0 isolate block leading-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={`block h-auto w-full ${imageClassName}`}
        />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${imgW} ${imgH}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          {labels.map((it) => (
            <g key={it.name}>
              <rect
                x={it.x - it.boxW / 2}
                y={it.y - it.boxH / 2}
                width={it.boxW}
                height={it.boxH}
                rx={4}
                fill="rgba(10,10,10,0.62)"
              />
              <text
                x={it.x}
                y={it.y + it.fontSize * 0.32}
                textAnchor="middle"
                fontSize={it.fontSize}
                fontFamily='ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                fontWeight={600}
                fill="#fff"
              >
                {it.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="border-t border-slate-100 px-3 py-2.5 text-[12px] leading-relaxed text-ink-muted">
        {caption}
      </div>
    </div>
  );
}
