"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Dark to light. The densest glyph stands in for the brightest pixel. */
const RAMP = " .·:-=+*x#%@";
const SIZES = [
  { label: "Coarse", font: 18 },
  { label: "Medium", font: 12 },
  { label: "Fine", font: 8 },
];
const FPS = 24;

type Status = "idle" | "asking" | "live" | "denied" | "unsupported";

/**
 * Your own face, in the site's mono font. The frame is drawn into a tiny offscreen canvas
 * — one pixel per character cell, which is the browser's own downscaler doing the
 * averaging for free — and each row is painted as a single string rather than a glyph at a
 * time, because a monospace row aligns itself and 9,000 fillText calls a frame does not.
 *
 * Nothing leaves the browser: there is no upload, no recording, and the stream stops the
 * moment you leave.
 */
export function AsciiMirror() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [size, setSize] = useState(1);
  const [mirror, setMirror] = useState(true);
  const [grid, setGrid] = useState({ cols: 0, rows: 0 });

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    setStatus("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      videoRef.current = video;
      setStatus("live");
    } catch {
      setStatus("denied");
    }
  }, []);

  // Whatever happens, the camera goes off when this unmounts.
  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (status !== "live") return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!wrap || !canvas || !video) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // One pixel per character. The browser averages the frame down into it for us.
    const sampler = document.createElement("canvas");
    const sctx = sampler.getContext("2d", { willReadFrequently: true });
    if (!sctx) return;

    const font = SIZES[size].font;
    const face = `${font}px "JetBrains Mono", ui-monospace, monospace`;
    // Measured rather than assumed: if the mono font has not loaded, the fallback's
    // advance width is different and everything below depends on this number.
    ctx.font = face;
    const cellW = ctx.measureText("0").width || font * 0.6;
    const cellH = font * 1.02;
    // A cell is about six tenths as wide as it is tall, so a grid of them is not square.
    // Without this the picture comes out stretched vertically by about 1.7.
    const cellAspect = cellH / cellW;
    let cols = 0;
    let rows = 0;
    let ink = "#f2ede4";
    let bg = "#0c0c18";
    let frame = 0;
    let last = 0;

    const layout = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(320, rect.width);
      const h = Math.max(320, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(20, Math.floor(w / cellW));
      rows = Math.max(12, Math.floor(h / cellH));
      sampler.width = cols;
      sampler.height = rows;
      setGrid({ cols, rows });
      const style = getComputedStyle(document.documentElement);
      ink = style.getPropertyValue("--text").trim() || ink;
      bg = style.getPropertyValue("--bg").trim() || bg;
    };

    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (now - last < 1000 / FPS) return;
      last = now;
      if (!video.videoWidth) return;

      // Cover the grid, in cell space rather than pixel space: the video is treated as
      // `cellAspect` times wider than it is so that one sampled pixel per non-square cell
      // still comes out in proportion.
      const wide = video.videoWidth * cellAspect;
      const tall = video.videoHeight;
      const scale = Math.max(cols / wide, rows / tall);
      const dw = wide * scale;
      const dh = tall * scale;
      sctx.save();
      if (mirror) {
        sctx.translate(cols, 0);
        sctx.scale(-1, 1);
      }
      sctx.drawImage(video, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
      sctx.restore();

      const { data } = sctx.getImageData(0, 0, cols, rows);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = ink;
      ctx.font = face;
      ctx.textBaseline = "top";

      for (let y = 0; y < rows; y++) {
        let line = "";
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          // Rec. 601 luma, which tracks perceived brightness better than an average.
          const luma =
            (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
          // Sensor noise in a dim room lands on the second glyph and speckles the whole
          // frame, so the bottom of the range is pushed to blank.
          const level = Math.max(0, Math.min(1, (luma - 0.1) / 0.82));
          line += RAMP[Math.min(RAMP.length - 1, Math.floor(level * RAMP.length))];
        }
        ctx.fillText(line, 0, y * cellH);
      }
    };

    layout();
    frame = requestAnimationFrame(render);
    const observer = new ResizeObserver(layout);
    observer.observe(wrap);
    const theme = new MutationObserver(layout);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      theme.disconnect();
    };
  }, [status, size, mirror]);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} aria-hidden className="block h-full w-full" />

      {status !== "live" ? (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <div className="max-w-md">
            <p className="display text-2xl">
              {status === "denied"
                ? "No camera, then."
                : status === "unsupported"
                  ? "This browser will not do it."
                  : "You, in JetBrains Mono."}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-soft">
              {status === "denied"
                ? "The browser turned the request down. Allow the camera for this site and press it again — or leave it, the other three experiments do not point anything at you."
                : status === "unsupported"
                  ? "getUserMedia is not available here. It needs a secure context and a camera."
                  : "The camera feed is turned into characters in the browser and thrown away frame by frame. Nothing is uploaded, nothing is recorded, and the camera stops the moment you leave this experiment."}
            </p>
            {status !== "unsupported" ? (
              <button
                type="button"
                onClick={start}
                disabled={status === "asking"}
                className="label mt-6 rounded-full px-5 py-3 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
              >
                {status === "asking" ? "Asking…" : "Turn the camera on"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5"
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--bg) 94%, transparent), transparent)",
        }}
      >
        <p className="label text-mute">
          {status === "live"
            ? `${grid.cols}×${grid.rows} characters · ${FPS} fps · nothing leaves the browser`
            : "Camera off"}
        </p>
        {status === "live" ? (
          <div className="pointer-events-auto flex items-center gap-2">
            {SIZES.map((option, index) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setSize(index)}
                className="label rounded-full border px-3.5 py-2"
                style={
                  index === size
                    ? { borderColor: "var(--accent)", color: "var(--accent-soft)" }
                    : { borderColor: "var(--border)", color: "var(--text-mute)" }
                }
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMirror((value) => !value)}
              className="label rounded-full border px-3.5 py-2"
              style={{ borderColor: "var(--border)", color: "var(--text-mute)" }}
            >
              {mirror ? "Mirrored" : "Not mirrored"}
            </button>
            <button
              type="button"
              onClick={() => {
                stop();
                setStatus("idle");
              }}
              className="label rounded-full px-4 py-2.5"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              Camera off
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
