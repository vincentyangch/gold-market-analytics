"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useCallback } from "react";
import { refreshAll } from "@/lib/hooks/useMarketData";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeAgo, setTimeAgo] = useState("");

  useEffect(() => {
    setMounted(true);
    setLastRefreshed(new Date());

    // Update timestamp whenever SWR auto-refreshes data
    const onDataRefresh = () => setLastRefreshed(new Date());
    window.addEventListener("market-data-refreshed", onDataRefresh);
    return () => window.removeEventListener("market-data-refreshed", onDataRefresh);
  }, []);

  // Update the "time ago" display every 10 seconds
  useEffect(() => {
    if (!lastRefreshed) return;

    function update() {
      if (!lastRefreshed) return;
      const seconds = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000);
      if (seconds < 10) setTimeAgo("just now");
      else if (seconds < 60) setTimeAgo(`${seconds}s ago`);
      else setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
    }

    update();
    const interval = setInterval(update, 10_000);
    return () => clearInterval(interval);
  }, [lastRefreshed]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refreshAll();
    setLastRefreshed(new Date());
    // Brief visual feedback
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  return (
    <header className="border-b border-border bg-surface px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-primary">Gold Market Analytics</h1>
      </div>
      <div className="flex items-center gap-3">
        {/* Last refreshed + refresh button */}
        {mounted && lastRefreshed && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-secondary hidden sm:inline">
              Updated {timeAgo}
            </span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 rounded-md border border-border text-secondary hover:bg-hover transition-colors disabled:opacity-50"
              title="Refresh all data"
            >
              <svg
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h4.5M20 20v-5h-4.5M4.5 9A8 8 0 0119.8 7.5M19.5 15A8 8 0 014.2 16.5"
                />
              </svg>
            </button>
          </div>
        )}
        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="px-3 py-1.5 rounded-md border border-border text-sm text-secondary hover:bg-hover transition-colors"
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        )}
      </div>
    </header>
  );
}
