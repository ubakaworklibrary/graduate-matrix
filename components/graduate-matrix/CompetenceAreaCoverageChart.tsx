"use client";

import { useEffect, useState } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from "recharts";
import type { CompetenceAreaCoverageDatum } from "@/lib/graduate-matrix/competence-area-coverage";

interface CompetenceAreaCoverageChartProps {
  data: CompetenceAreaCoverageDatum[];
}

type AngleTickProps = {
  x?: string | number;
  y?: string | number;
  cx?: string | number;
  cy?: string | number;
  textAnchor?: "start" | "middle" | "end" | "inherit";
  payload?: { value?: string };
};

// Approved BL–L5 progression colours (see app/globals.css :root) — banded from the
// centre (L1) out to the edge (L5) so the chart itself communicates level the same
// way level-pill chips do elsewhere in the app.
const LEVEL_BANDS: { key: "zoneL5" | "zoneL4" | "zoneL3" | "zoneL2" | "zoneL1"; color: string; opacity: number }[] = [
  { key: "zoneL5", color: "#3F6F63", opacity: 0.16 },
  { key: "zoneL4", color: "#DCE5CD", opacity: 0.55 },
  { key: "zoneL3", color: "#F3E2B5", opacity: 0.55 },
  { key: "zoneL2", color: "#F5DDC8", opacity: 0.55 },
  { key: "zoneL1", color: "#F6DEDC", opacity: 0.55 },
];
// Labels sit this many pixels further out than Recharts' default tick position.
const LABEL_PUSH_OUT = 16;

function splitAreaLabel(area: string): [string, string?] {
  const words = area.split(" ");
  let first = "";
  let second = "";
  for (const word of words) {
    if (!second && `${first} ${word}`.trim().length <= 22) first = `${first} ${word}`.trim();
    else second = `${second} ${word}`.trim();
  }
  if (second.length > 24) second = `${second.slice(0, 23).trimEnd()}…`;
  return second ? [first, second] : [first];
}

function formatLevel(value: number) {
  return value === 0 ? "Not started" : `L${value.toFixed(1)}`;
}

function CoverageDetails({ datum }: { datum: CompetenceAreaCoverageDatum }) {
  return (
    <div className="dashboard-radar-tooltip">
      <strong>{datum.area}</strong>
      <span>Current average: {formatLevel(datum.current)}</span>
      <span>Target average: {formatLevel(datum.target)}</span>
      <span>Gap: {datum.gap.toFixed(1)} levels</span>
      <span>Competencies included: {datum.competencyCount}</span>
    </div>
  );
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload.length) return null;
  const datum = payload[0]?.payload as CompetenceAreaCoverageDatum | undefined;
  return datum ? <CoverageDetails datum={datum} /> : null;
}

export default function CompetenceAreaCoverageChart({ data }: CompetenceAreaCoverageChartProps) {
  const [focusedArea, setFocusedArea] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  if (!data.length) {
    return <div className="dashboard-radar-empty">Competence-area data is unavailable for this candidate.</div>;
  }

  const focusedDatum = focusedArea ? data.find((datum) => datum.area === focusedArea) ?? null : null;
  const zonedData = data.map((datum) => ({ ...datum, zoneL1: 1, zoneL2: 2, zoneL3: 3, zoneL4: 4, zoneL5: 5 }));
  const renderAngleTick = ({ x = 0, y = 0, cx = 0, cy = 0, textAnchor = "middle", payload }: AngleTickProps) => {
    const numericX = Number(x);
    const numericY = Number(y);
    const numericCx = Number(cx);
    const numericCy = Number(cy);
    // Push the label further out along its own angle so it clears the chart edge —
    // Recharts' default tick position sits right against the polygon and is hard to read.
    const dx = numericX - numericCx;
    const dy = numericY - numericCy;
    const distance = Math.hypot(dx, dy) || 1;
    const pushedX = numericX + (dx / distance) * LABEL_PUSH_OUT;
    const pushedY = numericY + (dy / distance) * LABEL_PUSH_OUT;
    const area = payload?.value ?? "";
    const datum = data.find((item) => item.area === area);
    const [first, second] = splitAreaLabel(area);
    return (
      <g
        tabIndex={0}
        role="img"
        aria-label={datum ? `${area}. Current ${formatLevel(datum.current)}. Target ${formatLevel(datum.target)}. Gap ${datum.gap.toFixed(1)} levels. ${datum.competencyCount} competencies included.` : area}
        onFocus={() => setFocusedArea(area)}
        onBlur={() => setFocusedArea(null)}
        onMouseEnter={() => setFocusedArea(area)}
        onMouseLeave={() => setFocusedArea(null)}
      >
        <text x={pushedX} y={pushedY} textAnchor={textAnchor} fill="#555" fontSize="9" fontWeight="700">
          <tspan x={pushedX} dy={second ? "-0.3em" : "0.3em"}>{first}</tspan>
          {second ? <tspan x={pushedX} dy="1.15em">{second}</tspan> : null}
        </text>
      </g>
    );
  };

  return (
    <div
      className="dashboard-radar-chart"
      role="img"
      aria-label="Radar chart comparing area-averaged current and target competency levels on an L1 to L5 scale."
    >
      {focusedDatum ? <div className="dashboard-radar-focus-tooltip"><CoverageDetails datum={focusedDatum} /></div> : null}
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={zonedData} outerRadius="58%" accessibilityLayer>
          {LEVEL_BANDS.map((band) => (
            <Radar key={band.key} dataKey={band.key} stroke="none" fill={band.color} fillOpacity={band.opacity} isAnimationActive={false} dot={false} activeDot={false} legendType="none" />
          ))}
          <PolarGrid stroke="#dde2ea" />
          <PolarAngleAxis dataKey="area" tick={renderAngleTick} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            tickFormatter={(value: number) => value === 0 ? "" : `L${value}`}
            tick={{ fill: "#888", fontSize: 9 }}
            axisLine={false}
          />
          <Radar name="Target" dataKey="target" stroke="#00a786" strokeWidth={1.5} strokeDasharray="5 4" fill="#00a786" fillOpacity={0.08} isAnimationActive={!reducedMotion} />
          <Radar name="Current" dataKey="current" stroke="#1a1a2e" strokeWidth={2} fill="#1a1a2e" fillOpacity={0.14} dot={{ r: 3, fill: "#1a1a2e" }} isAnimationActive={!reducedMotion} />
          <Tooltip content={ChartTooltip} />
          <Legend verticalAlign="bottom" iconType="square" wrapperStyle={{ color: "#555", fontSize: 10 }} />
        </RadarChart>
      </ResponsiveContainer>
      <div className="sr-only">
        {data.map((datum) => <p key={datum.area}>{datum.area}: current {formatLevel(datum.current)}, target {formatLevel(datum.target)}, gap {datum.gap.toFixed(1)} levels, {datum.competencyCount} competencies.</p>)}
      </div>
    </div>
  );
}
