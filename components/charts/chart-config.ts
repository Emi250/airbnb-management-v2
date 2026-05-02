/** Shared Recharts configuration — single source of truth for tooltip, grid, and chart sizing. */

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
