"use client";

import { useEffect, useState } from "react";

const KEY = "gitwork-toolbox-theme";

/** Dark is the default surface; light is the paper interior of the same document. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  const apply = (next: "dark" | "light") => {
    setTheme(next);
    window.localStorage.setItem(KEY, next);
    document.documentElement.dataset.theme = next;
  };

  return (
    <button
      type="button"
      onClick={() => apply(theme === "dark" ? "light" : "dark")}
      className="label flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-mute transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--text)]"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      <span>{theme === "dark" ? "Dark" : "Paper"}</span>
      <span
        className="relative h-4 w-7 rounded-full transition-colors"
        style={{ background: theme === "dark" ? "var(--border)" : "var(--accent)" }}
      >
        <span
          className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all"
          style={{ left: theme === "dark" ? 2 : 14 }}
        />
      </span>
    </button>
  );
}

/** Applies the stored theme before paint so there is no flash. */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('${KEY}');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}})()`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
