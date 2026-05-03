import type React from "react";

export const CHART_HEIGHT = 300;

export const tooltipStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

export const gridProps = {
  strokeDasharray: "3 3",
  stroke: "var(--border)",
  vertical: false,
} as const;

export const verticalGridProps = {
  strokeDasharray: "3 3",
  stroke: "var(--border)",
  vertical: true,
  horizontal: false,
} as const;
