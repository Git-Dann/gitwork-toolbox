"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A pentatonic scale over three octaves. Snapping to it is the difference between an
 * instrument and a siren: anywhere you put the pointer sounds deliberate.
 */
const STEPS = [0, 2, 4, 7, 9];
const BASE = 220;
const NOTES = ["A", "B", "C♯", "E", "F♯"];
const SHAPES: OscillatorType[] = ["sine", "triangle", "square", "sawtooth"];

function scale(index: number) {
  const octave = Math.floor(index / STEPS.length);
  const semitone = STEPS[((index % STEPS.length) + STEPS.length) % STEPS.length];
  return { hz: BASE * Math.pow(2, octave + semitone / 12), name: `${NOTES[((index % STEPS.length) + STEPS.length) % STEPS.length]}${octave + 3}` };
}

/**
 * Press and drag to play: across for pitch, up for brightness. One oscillator through a
 * low-pass filter and a gain, with an analyser drawing the actual waveform rather than a
 * decorative sine — what you see is what came out.
 *
 * The audio graph is built on the first press, because a browser will not start an
 * AudioContext before someone asks it to, and it is torn down on the way out.
 */
export function Theremin() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<{
    ctx: AudioContext;
    osc: OscillatorNode;
    gain: GainNode;
    filter: BiquadFilterNode;
    analyser: AnalyserNode;
  } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState("—");
  const [shape, setShape] = useState<OscillatorType>("triangle");
  const shapeRef = useRef(shape);
  shapeRef.current = shape;

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.gain.gain.cancelScheduledValues(audio.ctx.currentTime);
    audio.gain.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.05);
    setPlaying(false);
  }, []);

  useEffect(
    () => () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.osc.stop();
      void audio.ctx.close();
      audioRef.current = null;
    },
    [],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.osc.type = shape;
  }, [shape]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let box = { w: 0, h: 0 };
    let colours = { bg: "#0c0c18", ink: "#f2ede4", accent: "#6b52ff", faint: "#7c7a8c" };
    let frame = 0;
    let held = false;
    let pointer = { x: 0, y: 0 };
    const wave = new Uint8Array(1024);

    const readPalette = () => {
      const style = getComputedStyle(document.documentElement);
      const get = (name: string, fallback: string) =>
        style.getPropertyValue(name).trim() || fallback;
      colours = {
        bg: get("--bg", "#0c0c18"),
        ink: get("--text", "#f2ede4"),
        accent: get("--accent", "#6b52ff"),
        faint: get("--text-mute", "#7c7a8c"),
      };
    };

    const layout = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      box = { w: Math.max(320, rect.width), h: Math.max(320, rect.height) };
      canvas.width = Math.round(box.w * dpr);
      canvas.height = Math.round(box.h * dpr);
      canvas.style.width = `${box.w}px`;
      canvas.style.height = `${box.h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const build = () => {
      if (audioRef.current) return audioRef.current;
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const context = new Ctor();
      const osc = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      const analyser = context.createAnalyser();
      osc.type = shapeRef.current;
      osc.frequency.value = 440;
      gain.gain.value = 0;
      filter.type = "lowpass";
      filter.frequency.value = 2000;
      analyser.fftSize = 2048;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(analyser);
      analyser.connect(context.destination);
      osc.start();
      audioRef.current = { ctx: context, osc, gain, filter, analyser };
      return audioRef.current;
    };

    const play = () => {
      const audio = build();
      void audio.ctx.resume();
      held = true;
      setPlaying(true);
      shift();
      audio.gain.gain.setTargetAtTime(0.16, audio.ctx.currentTime, 0.02);
    };

    const shift = () => {
      const audio = audioRef.current;
      if (!audio) return;
      const across = Math.max(0, Math.min(1, pointer.x / box.w));
      const up = 1 - Math.max(0, Math.min(1, pointer.y / box.h));
      // Fifteen steps across the width: pentatonic, so any landing is in key.
      const step = Math.round(across * (STEPS.length * 3 - 1));
      const { hz, name } = scale(step);
      audio.osc.frequency.setTargetAtTime(hz, audio.ctx.currentTime, 0.02);
      audio.filter.frequency.setTargetAtTime(300 + up * 6000, audio.ctx.currentTime, 0.04);
      setNote(name);
    };

    const draw = () => {
      frame = requestAnimationFrame(draw);
      ctx.fillStyle = colours.bg;
      ctx.fillRect(0, 0, box.w, box.h);

      // The keyboard, as faint verticals: one per step.
      const steps = STEPS.length * 3;
      ctx.strokeStyle = colours.faint;
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 1;
      for (let i = 1; i < steps; i++) {
        const x = Math.round((box.w / steps) * i) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, box.h * 0.18);
        ctx.lineTo(x, box.h * 0.82);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      const audio = audioRef.current;
      if (audio) {
        audio.analyser.getByteTimeDomainData(wave);
        ctx.strokeStyle = held ? colours.accent : colours.faint;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < wave.length; i++) {
          const x = (i / (wave.length - 1)) * box.w;
          const y = box.h / 2 + ((wave[i] - 128) / 128) * box.h * 0.3;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        ctx.strokeStyle = colours.faint;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, box.h / 2);
        ctx.lineTo(box.w, box.h / 2);
        ctx.stroke();
      }

      if (held) {
        ctx.fillStyle = colours.accent;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    readPalette();
    layout();
    frame = requestAnimationFrame(draw);

    const observer = new ResizeObserver(layout);
    observer.observe(wrap);
    const theme = new MutationObserver(readPalette);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const locate = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onDown = (event: PointerEvent) => {
      locate(event);
      play();
    };
    const onMove = (event: PointerEvent) => {
      locate(event);
      if (held) shift();
    };
    const onUp = () => {
      held = false;
      stop();
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onUp);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      theme.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onUp);
    };
  }, [stop]);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} aria-hidden className="block h-full w-full cursor-crosshair" />

      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <p className="display text-6xl" style={{ opacity: playing ? 1 : 0.25 }}>
          {note}
        </p>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5"
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--bg) 94%, transparent), transparent)",
        }}
      >
        <p className="label text-mute">
          Press and drag · across for pitch, up for brightness · pentatonic, so it cannot
          go wrong
        </p>
        <div className="pointer-events-auto flex items-center gap-2">
          {SHAPES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setShape(option)}
              className="label rounded-full border px-3.5 py-2"
              style={
                option === shape
                  ? { borderColor: "var(--accent)", color: "var(--accent-soft)" }
                  : { borderColor: "var(--border)", color: "var(--text-mute)" }
              }
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
