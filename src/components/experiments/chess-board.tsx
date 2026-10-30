"use client";

import { useEffect, useRef, useState } from "react";
import type { Colour, Move } from "@/experiments/chess/rules";
import type { Scene } from "@/experiments/chess/scene";

type Markers = {
  moves: { to: number; capture: boolean }[];
  last?: [number, number] | null;
  picked?: number | null;
  check?: number;
};

type Props = {
  board: string[];
  /** The move that produced this board, so it can be played rather than cut to. */
  move: Move | null;
  /** How many half-moves deep the game is. A jump of anything but one means a new game. */
  ply: number;
  markers: Markers;
  /** Which side is at the near edge. */
  view: Colour;
  interactive: boolean;
  onPick: (square: number) => void;
};

/**
 * The canvas, and the glue between React state and the scene. three.js is imported here
 * and nowhere else, and this component is only ever loaded dynamically, so the other
 * eleven experiments do not carry it.
 */
export function ChessBoard({ board, move, ply, markers, view, interactive, onPick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const plyRef = useRef(-1);
  const [ready, setReady] = useState(false);

  // Props the pointer handlers need without re-binding a listener on every move.
  const live = useRef({ interactive, onPick });
  live.current = { interactive, onPick };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let scene: Scene | null = null;
    let stopped = false;

    import("@/experiments/chess/scene").then(({ createScene }) => {
      if (stopped || !canvasRef.current) return;
      scene = createScene(canvasRef.current);
      sceneRef.current = scene;
      // Force a full sync rather than trying to replay a history the scene never saw.
      plyRef.current = -1;
      setReady(true);
    });

    const observer = new ResizeObserver(() => scene?.resize());
    observer.observe(canvas);
    return () => {
      stopped = true;
      observer.disconnect();
      scene?.dispose();
      sceneRef.current = null;
      setReady(false);
    };
  }, []);

  // Drag to orbit, click to pick. A click is a pointerup that did not travel far — without
  // that test every attempt to look round the board moves a piece.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let down: { x: number; y: number; id: number } | null = null;
    let moved = 0;

    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, id: e.pointerId };
      moved = 0;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      moved = Math.max(moved, Math.hypot(dx, dy));
      sceneRef.current?.nudgeYaw(-dx * 0.004);
      sceneRef.current?.nudgePitch(-dy * 0.003);
      down.x = e.clientX;
      down.y = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      canvas.releasePointerCapture(e.pointerId);
      const tapped = moved < 6;
      down = null;
      if (!tapped || !live.current.interactive) return;
      const square = sceneRef.current?.pick(e.clientX, e.clientY);
      if (square !== null && square !== undefined) live.current.onPick(square);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, []);

  // One move on means play it; anything else means the board was reset or taken back.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (move && ply === plyRef.current + 1) {
      scene.animate(move.from, move.to, {
        captured: move.epCapture,
        rook: move.rook,
        promo: move.promo,
      });
    } else {
      scene.setPosition(board);
    }
    plyRef.current = ply;
  }, [board, move, ply, ready]);

  useEffect(() => {
    sceneRef.current?.setMarkers(markers);
  }, [markers, ready]);

  useEffect(() => {
    sceneRef.current?.faceSide(view);
  }, [view, ready]);

  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full touch-none rounded-[8px]"
      style={{ cursor: interactive ? "pointer" : "default" }}
    />
  );
}
