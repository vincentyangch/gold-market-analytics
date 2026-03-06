"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="border-b border-border bg-surface px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-primary">Gold Market Analytics</h1>
      </div>
      <div className="flex items-center gap-4">
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
