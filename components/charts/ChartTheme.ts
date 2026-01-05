function isDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("theme-dark");
}

export function getChartTheme() {
  const dark = isDarkMode();
  
  if (dark) {
    return {
      background: "#050814",
      grid: "rgba(255,255,255,0.06)",
      axis: "rgba(255,255,255,0.6)",
      axisLabel: "rgba(255,255,255,0.8)",
      tooltipBg: "#0b1020",
      tooltipBorder: "rgba(255,255,255,0.12)",
      tooltipText: "#ffffff",
      primary: "#4f46e5",
      secondary: "#22c55e",
      danger: "#ef4444",
      muted: "rgba(255,255,255,0.3)",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text'",
    };
  }
  
  return {
    background: "#ffffff",
    grid: "rgba(0,0,0,0.06)",
    axis: "rgba(0,0,0,0.6)",
    axisLabel: "rgba(0,0,0,0.8)",
    tooltipBg: "#ffffff",
    tooltipBorder: "rgba(0,0,0,0.12)",
    tooltipText: "#111827",
    primary: "#4f46e5",
    secondary: "#22c55e",
    danger: "#ef4444",
    muted: "rgba(0,0,0,0.2)",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text'",
  };
}

// Export a default for backward compatibility (uses current theme)
export const chartTheme = getChartTheme();
