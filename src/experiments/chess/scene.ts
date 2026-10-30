import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildPiece, type PieceKind } from "./models";

/**
 * The 3D board. Owns the renderer, the lighting and every piece mesh, and knows nothing
 * about chess rules — it is told which piece sits on which square and asked to animate a
 * move from one square to another.
 *
 * Two decisions carry most of the look. The first is an image-based environment: a
 * MeshStandardMaterial lit only by lamps has no specular reflection to speak of and reads
 * as plastic, so the scene gets a generated room as its environment map and the pieces a
 * clearcoat, which is what makes lacquered boxwood look like lacquered boxwood. The second
 * is that the playing surface is one textured plane rather than 64 meshes — the grain is
 * drawn into the texture, so no two squares share a pattern, and a click is resolved by
 * arithmetic on the hit point instead of by hit-testing 64 objects.
 *
 * It renders on demand. A chess board is still almost all of the time, and a WebGL canvas
 * that redraws 60 times a second to show nothing moving is a flat battery for no reason.
 */

const LIGHT_SQUARE = "#c0ab86";
const DARK_SQUARE = "#44584c";
const LIGHT_PIECE = "#cdb88e";
/**
 * The dark side is the brand's own deep violet rather than ebony. It is `--color-violet-deep`
 * from globals.css; the accent itself (#6b52ff) is too light to read as the dark side on a
 * board whose light squares are a warm tan.
 */
const DARK_PIECE = "#2a2176";
const TRAY = "#3a2b20";

/** How far the board can be turned and tilted — and so how much wider the frame must be. */
const YAW_RANGE = 0.2;
const PITCH_LOW = 0.86;
const PITCH_HIGH = 0.99;

export const worldOf = (square: number) => ({
  x: (square & 7) - 3.5,
  z: 3.5 - (square >> 3),
});

/** The square under a point on the board surface, or null if the point is off the board. */
const squareAt = (x: number, z: number) => {
  const file = Math.floor(x + 4);
  const rank = Math.floor(4 - z);
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return rank * 8 + file;
};

type Live = { mesh: THREE.Group; piece: string; square: number };

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Deterministic noise, so the grain is the same every reload rather than flickering. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Draws the chequer with its grain. Grain runs along the board for the light squares and
 * across it for the dark ones, which is how a made board is veneered and the reason a real
 * one does not look like a printed grid.
 */
function boardTexture(): HTMLCanvasElement {
  const cell = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = cell * 8;
  const g = canvas.getContext("2d")!;
  const random = rng(0x5eed);

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const rank = 7 - row;
      const light = ((col + rank) & 1) === 1;
      const x = col * cell;
      const y = row * cell;
      g.fillStyle = light ? LIGHT_SQUARE : DARK_SQUARE;
      g.fillRect(x, y, cell, cell);

      g.save();
      g.beginPath();
      g.rect(x, y, cell, cell);
      g.clip();
      g.lineWidth = 1;
      const across = !light;
      for (let i = 0; i < 46; i++) {
        const at = random() * cell;
        const wobble = 3 + random() * 7;
        const phase = random() * Math.PI * 2;
        g.strokeStyle = `rgb(0 0 0 / ${(0.03 + random() * 0.07).toFixed(3)})`;
        if (random() > 0.72) g.strokeStyle = `rgb(255 255 255 / ${(0.02 + random() * 0.05).toFixed(3)})`;
        g.beginPath();
        for (let t = 0; t <= cell; t += 8) {
          const drift = Math.sin(phase + t * 0.035) * wobble;
          const u = across ? x + at + drift : x + t;
          const v = across ? y + t : y + at + drift;
          if (t === 0) g.moveTo(u, v);
          else g.lineTo(u, v);
        }
        g.stroke();
      }
      // The join between squares, which on a veneered board is a visible seam.
      g.strokeStyle = "rgb(0 0 0 / 0.22)";
      g.lineWidth = 2;
      g.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
      g.restore();
    }
  }
  return canvas;
}

/** The board's coordinates, in Fraunces rather than a system face. */
const COORD_FACE = 'Fraunces, "Playfair Display", Georgia, serif';
const COORD_WEIGHT = 500;
const COORD_SHEET =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&display=swap";

/**
 * Fetches Fraunces, once, when a board is first built. It is used by one canvas in a room
 * you have to unlock, so it has no business on the critical path of every page — and the
 * stylesheet the rest of the site loads is shared across the whole app.
 */
function coordFont(): Promise<unknown> {
  if (typeof document === "undefined") return Promise.resolve(null);
  // The stylesheet has to be parsed before the face it declares can be asked for. Calling
  // fonts.load() straight after appending the link resolves instantly against no face at
  // all, and the board then redraws in the fallback and never hears about the real one.
  const parsed = new Promise<void>((resolve) => {
    let link = document.querySelector<HTMLLinkElement>(`link[href="${COORD_SHEET}"]`);
    if (link?.sheet) {
      resolve();
      return;
    }
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = COORD_SHEET;
      document.head.append(link);
    }
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => resolve(), { once: true });
  });
  return parsed.then(() =>
    document.fonts?.load ? document.fonts.load(`${COORD_WEIGHT} 24px Fraunces`) : null,
  );
}

/** The frame the board sits in: darker timber, grain running the long way, plus coordinates. */
function trayTexture(canvas = document.createElement("canvas")): HTMLCanvasElement {
  const size = 1024;
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const random = rng(0x1d0c);
  g.fillStyle = TRAY;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 420; i++) {
    const at = random() * size;
    const phase = random() * Math.PI * 2;
    g.strokeStyle = `rgb(0 0 0 / ${(0.03 + random() * 0.09).toFixed(3)})`;
    g.lineWidth = 1 + random();
    g.beginPath();
    for (let t = 0; t <= size; t += 16) {
      const v = at + Math.sin(phase + t * 0.006) * (4 + random() * 10);
      if (t === 0) g.moveTo(t, v);
      else g.lineTo(t, v);
    }
    g.stroke();
  }

  // Coordinates, set into the border either side of the playing surface.
  const inset = size * 0.0426; // the tray overhangs the 8-unit board by 0.4 of a square
  const play = size - inset * 2;
  g.fillStyle = "rgb(230 219 193 / 0.72)";
  g.font = `${COORD_WEIGHT} ${Math.round(size * 0.024)}px ${COORD_FACE}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (let i = 0; i < 8; i++) {
    const along = inset + play * ((i + 0.5) / 8);
    const file = "abcdefgh"[i];
    const rank = String(8 - i);
    g.fillText(file, along, inset * 0.5);
    g.fillText(file, along, size - inset * 0.5);
    g.fillText(rank, inset * 0.5, along);
    g.fillText(rank, size - inset * 0.5, along);
  }
  return canvas;
}

export function createScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0b0a0e");

  // The environment map. Without one the only specular highlight comes from the lamps,
  // which is what makes an untextured MeshStandardMaterial look like a shape rather than
  // an object: there is nothing for the polish to reflect.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.52;
  room.dispose();

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

  // Key, fill and rim. The key is the only caster: two shadow maps on a board this size
  // fight each other and the pieces end up sitting in mud.
  const key = new THREE.DirectionalLight("#fff4e2", 2.5);
  key.position.set(-5.5, 7.8, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 26;
  key.shadow.bias = -0.0011;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 1.7;
  scene.add(key);

  const rim = new THREE.DirectionalLight("#8fa8ff", 0.6);
  rim.position.set(5, 3.2, -6.5);
  scene.add(rim);

  // A dim ground well below the board so nothing floats in a void.
  const floorMat = new THREE.MeshStandardMaterial({ color: "#09080c", roughness: 1 });
  const floorGeo = new THREE.PlaneGeometry(80, 80);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.42;
  floor.receiveShadow = true;
  scene.add(floor);

  const board = new THREE.Group();
  scene.add(board);

  const trayCanvas = trayTexture();
  const trayMap = new THREE.CanvasTexture(trayCanvas);
  trayMap.colorSpace = THREE.SRGBColorSpace;
  trayMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const trayGeo = new THREE.BoxGeometry(8.8, 0.34, 8.8);
  const trayMat = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.02 });
  const trayTop = new THREE.MeshStandardMaterial({ map: trayMap, roughness: 0.4, metalness: 0.02 });
  // Only the top face carries the coordinates; the sides get the plain timber.
  const tray = new THREE.Mesh(trayGeo, [trayMat, trayMat, trayTop, trayMat, trayMat, trayMat]);
  trayMat.color.set(TRAY);
  tray.position.y = -0.18;
  tray.receiveShadow = true;
  tray.castShadow = true;
  board.add(tray);

  const surfaceMap = new THREE.CanvasTexture(boardTexture());
  surfaceMap.colorSpace = THREE.SRGBColorSpace;
  surfaceMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const surfaceGeo = new THREE.PlaneGeometry(8, 8);
  const surfaceMat = new THREE.MeshStandardMaterial({
    map: surfaceMap,
    roughness: 0.34,
    metalness: 0.02,
    envMapIntensity: 0.45,
  });
  const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = -0.008;
  surface.receiveShadow = true;
  board.add(surface);

  // Markers: a disc for a quiet move, a ring for a capture, a wash for the last move.
  const markers = new THREE.Group();
  board.add(markers);
  const dotGeo = new THREE.CircleGeometry(0.16, 30);
  const ringGeo = new THREE.RingGeometry(0.37, 0.46, 36);
  const washGeo = new THREE.PlaneGeometry(1, 1);
  const dotMat = new THREE.MeshBasicMaterial({ color: "#14131a", transparent: true, opacity: 0.32 });
  const ringMat = new THREE.MeshBasicMaterial({ color: "#14131a", transparent: true, opacity: 0.38 });
  const washMat = new THREE.MeshBasicMaterial({ color: "#e2b83d", transparent: true, opacity: 0.26 });
  const pickMat = new THREE.MeshBasicMaterial({ color: "#e2b83d", transparent: true, opacity: 0.4 });
  const checkMat = new THREE.MeshBasicMaterial({ color: "#ff5a50", transparent: true, opacity: 0.42 });

  const piece = (colour: string, side: THREE.Side) =>
    new THREE.MeshPhysicalMaterial({
      color: colour,
      roughness: 0.42,
      metalness: 0,
      clearcoat: 0.35,
      clearcoatRoughness: 0.32,
      envMapIntensity: 0.7,
      side,
      shadowSide: THREE.FrontSide,
    });
  const pieceMats = {
    w: piece(LIGHT_PIECE, THREE.FrontSide),
    b: piece(DARK_PIECE, THREE.FrontSide),
  };
  // The bishop's mitre halves are open surfaces, so you need to see their inside faces.
  const openMats = {
    w: piece(LIGHT_PIECE, THREE.DoubleSide),
    b: piece(DARK_PIECE, THREE.DoubleSide),
  };

  const prototypes = new Map<PieceKind, THREE.Group>();
  const prototypeFor = (kind: PieceKind) => {
    let p = prototypes.get(kind);
    if (!p) {
      p = buildPiece(kind);
      prototypes.set(kind, p);
    }
    return p;
  };

  function spawn(code: string, square: number): THREE.Group {
    const kind = code.toLowerCase() as PieceKind;
    const white = code === code.toUpperCase();
    const clone = prototypeFor(kind).clone(true);
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = (o.userData.doubleSided ? openMats : pieceMats)[white ? "w" : "b"];
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    // Knights face the other player. Dead square-on they read as a slab from behind your
    // own back rank, so each one is turned towards the near corner it stands by — which is
    // how a set ends up looking on a real board anyway.
    if (kind === "n") {
      clone.rotation.y = (white ? 0 : Math.PI) + ((square & 7) < 4 ? -0.62 : 0.62);
    } else if (kind === "b") {
      // The mitre's slit faces the players, which is the only angle it can be seen from.
      clone.rotation.y = (white ? 0 : Math.PI) + (Math.random() - 0.5) * 0.24;
    } else {
      // Turned timber has no front, so the grain may as well land differently each time.
      clone.rotation.y = Math.random() * Math.PI * 2;
    }
    return clone;
  }

  let live: Live[] = [];
  const pieces = new THREE.Group();
  board.add(pieces);

  function clearPieces() {
    for (const l of live) pieces.remove(l.mesh);
    for (const f of fading) pieces.remove(f.mesh);
    fading.length = 0;
    tween.length = 0;
    live = [];
  }

  function setPosition(boardArray: string[]) {
    clearPieces();
    for (let s = 0; s < 64; s++) {
      const code = boardArray[s];
      if (!code) continue;
      const mesh = spawn(code, s);
      const { x, z } = worldOf(s);
      mesh.position.set(x, 0, z);
      pieces.add(mesh);
      live.push({ mesh, piece: code, square: s });
    }
    invalidate();
  }

  const tween: {
    mesh: THREE.Group; from: THREE.Vector3; to: THREE.Vector3; lift: number;
    began: number; ms: number; done?: () => void;
  }[] = [];
  const fading: { mesh: THREE.Group; began: number; ms: number }[] = [];

  const reduced = () =>
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function glide(mesh: THREE.Group, to: number, ms: number, lift: number, done?: () => void) {
    const { x, z } = worldOf(to);
    tween.push({
      mesh,
      from: mesh.position.clone(),
      to: new THREE.Vector3(x, 0, z),
      lift: reduced() ? 0 : lift,
      began: performance.now(),
      ms: reduced() ? 0 : ms,
      done,
    });
    invalidate();
  }

  /** Moves a piece and, where there is one, removes what it landed on. */
  function animate(
    from: number,
    to: number,
    opts: { captured?: number; rook?: { from: number; to: number }; promo?: string },
    done?: () => void,
  ) {
    const mover = live.find((l) => l.square === from);
    if (!mover) {
      done?.();
      return;
    }
    const victimSquare = opts.captured ?? to;
    const victim = live.find((l) => l.square === victimSquare && l !== mover);
    if (victim) {
      live = live.filter((l) => l !== victim);
      fading.push({ mesh: victim.mesh, began: performance.now(), ms: reduced() ? 0 : 300 });
    }
    // A knight hops; everything else slides. The lift is what makes the board feel solid.
    const isKnight = mover.piece.toLowerCase() === "n";
    glide(mover.mesh, to, isKnight ? 460 : 360, isKnight ? 1.2 : 0.3, () => {
      if (opts.promo) {
        pieces.remove(mover.mesh);
        const grown = spawn(opts.promo, to);
        const { x, z } = worldOf(to);
        grown.position.set(x, 0, z);
        pieces.add(grown);
        mover.mesh = grown;
        mover.piece = opts.promo;
        invalidate();
      }
      done?.();
    });
    mover.square = to;

    if (opts.rook) {
      const rook = live.find((l) => l.square === opts.rook!.from);
      if (rook) {
        glide(rook.mesh, opts.rook.to, 400, 0.2);
        rook.square = opts.rook.to;
      }
    }
  }

  let marks: THREE.Mesh[] = [];
  function setMarkers(opts: {
    moves: { to: number; capture: boolean }[];
    last?: [number, number] | null;
    picked?: number | null;
    check?: number;
  }) {
    for (const m of marks) markers.remove(m);
    marks = [];
    const lay = (square: number, geo: THREE.BufferGeometry, mat: THREE.Material, y: number) => {
      const mesh = new THREE.Mesh(geo, mat);
      const { x, z } = worldOf(square);
      mesh.position.set(x, y, z);
      mesh.rotation.x = -Math.PI / 2;
      markers.add(mesh);
      marks.push(mesh);
    };
    if (opts.last) for (const s of opts.last) lay(s, washGeo, washMat, 0.002);
    if (opts.picked !== null && opts.picked !== undefined) lay(opts.picked, washGeo, pickMat, 0.004);
    if (opts.check !== undefined && opts.check >= 0) lay(opts.check, washGeo, checkMat, 0.006);
    for (const m of opts.moves) lay(m.to, m.capture ? ringGeo : dotGeo, m.capture ? ringMat : dotMat, 0.008);
    invalidate();
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  /**
   * The square under the pointer. Pieces are tested first and resolved back to the square
   * they stand on, because a tall piece covers the square behind it and clicking a king's
   * crown should pick the king, not whatever is two ranks further back.
   */
  function pick(clientX: number, clientY: number): number | null {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const onPiece = raycaster.intersectObject(pieces, true)[0];
    const onBoard = raycaster.intersectObject(surface, false)[0];
    if (onPiece && (!onBoard || onPiece.distance <= onBoard.distance)) {
      let node: THREE.Object3D | null = onPiece.object;
      while (node && node.parent !== pieces) node = node.parent;
      const found = node && live.find((l) => l.mesh === node);
      if (found) return found.square;
    }
    if (!onBoard) return null;
    const local = board.worldToLocal(onBoard.point.clone());
    return squareAt(local.x, local.z);
  }

  // Camera. Orbits a little on drag so the board can be read from either side, and swings
  // round when you change colour rather than cutting, so you keep your bearings.
  let home = 0;
  let yaw = 0;
  let targetYaw = 0;
  let pitch = 0.92;
  let distance = 14;
  /** The height the camera is pointed at; `recentre` tunes it to the frame. */
  let aim = 0.35;

  /**
   * Pulls the camera back until everything is inside the frame. Guessing a distance works
   * at one aspect ratio and crops the near rank at every other one, and a board with its
   * first rank cut off is useless — so the corners of what is actually on the table are
   * projected and the distance is bisected until they all land inside the margin.
   *
   * Two boxes, not one: the tray's full footprint sits low, and the pieces stand within it.
   * Fitting a single box tall enough for a king across the whole tray wastes a third of the
   * frame on air above corners nothing ever occupies.
   */
  const CORNERS = (() => {
    const out: THREE.Vector3[] = [];
    const box = (half: number, low: number, high: number) => {
      for (const x of [-half, half]) for (const y of [low, high]) for (const z of [-half, half]) {
        out.push(new THREE.Vector3(x, y, z));
      }
    };
    box(4.45, -0.36, 0.02);
    box(3.9, 0, 1.58);
    return out;
  })();
  const projected = new THREE.Vector3();
  /**
   * Every camera the orbit can reach. The frame is cut to hold all of them at once, so the
   * board keeps one size however you turn it — refitting as the camera moves makes it
   * breathe in and out under the cursor, which is far worse than a slightly wider margin.
   */
  const ORBIT: [number, number][] = [];
  for (const y of [-YAW_RANGE, 0, YAW_RANGE]) for (const p of [PITCH_LOW, PITCH_HIGH]) {
    ORBIT.push([y, p]);
  }

  /** Runs `check` at every camera in the orbit, restoring where the camera actually is. */
  function sweep(check: () => boolean) {
    const heldYaw = yaw;
    const heldPitch = pitch;
    let ok = true;
    for (const [offset, angle] of ORBIT) {
      yaw = home + offset;
      pitch = angle;
      placeCamera();
      camera.updateMatrixWorld();
      if (!check()) {
        ok = false;
        break;
      }
    }
    yaw = heldYaw;
    pitch = heldPitch;
    placeCamera();
    return ok;
  }

  function fits() {
    return sweep(() => {
      for (const c of CORNERS) {
        projected.copy(c).project(camera);
        if (Math.abs(projected.x) > 0.985 || Math.abs(projected.y) > 0.985) return false;
      }
      return true;
    });
  }
  function bisect() {
    let near = 7;
    let far = 46;
    for (let i = 0; i < 16; i++) {
      distance = (near + far) / 2;
      if (fits()) far = distance;
      else near = distance;
    }
    distance = far;
  }
  /**
   * Raises or lowers where the camera is pointed so the board sits in the middle of the
   * frame. Aiming at a fixed height leaves a band of empty table above it, because the
   * board is below the point being looked at and the pieces only reach up on one side.
   */
  function recentre() {
    let low = Infinity;
    let high = -Infinity;
    sweep(() => {
      for (const c of CORNERS) {
        projected.copy(c).project(camera);
        low = Math.min(low, projected.y);
        high = Math.max(high, projected.y);
      }
      return true;
    });
    aim = THREE.MathUtils.clamp(aim + ((low + high) / 2) * 1.4, -0.6, 1.8);
  }
  function fit() {
    for (let pass = 0; pass < 3; pass++) {
      bisect();
      recentre();
    }
    bisect();
    placeCamera();
  }

  function placeCamera() {
    camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * distance,
      Math.sin(pitch) * distance,
      Math.cos(yaw) * Math.cos(pitch) * distance,
    );
    camera.lookAt(0, aim, 0);
  }
  function faceSide(side: "w" | "b") {
    home = side === "w" ? 0 : Math.PI;
    targetYaw = home;
    if (reduced()) yaw = targetYaw;
    invalidate();
  }
  function nudgeYaw(delta: number) {
    targetYaw = THREE.MathUtils.clamp(targetYaw + delta, home - YAW_RANGE, home + YAW_RANGE);
    if (reduced()) yaw = targetYaw;
    invalidate();
  }
  function nudgePitch(delta: number) {
    pitch = THREE.MathUtils.clamp(pitch + delta, PITCH_LOW, PITCH_HIGH);
    invalidate();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Pull back on a narrow screen, or the board runs off the sides.
    camera.fov = w / h < 0.95 ? 42 : 34;
    camera.updateProjectionMatrix();
    fit();
    invalidate();
  }

  let raf = 0;
  let dead = false;
  function invalidate() {
    if (!raf && !dead) raf = requestAnimationFrame(loop);
  }

  function loop() {
    raf = 0;
    const now = performance.now();

    for (let i = tween.length - 1; i >= 0; i--) {
      const t = tween[i];
      const k = t.ms <= 0 ? 1 : Math.min(1, (now - t.began) / t.ms);
      t.mesh.position.lerpVectors(t.from, t.to, easeInOut(k));
      t.mesh.position.y = Math.sin(Math.PI * k) * t.lift;
      if (k >= 1) {
        t.mesh.position.copy(t.to);
        tween.splice(i, 1);
        t.done?.();
      }
    }

    for (let i = fading.length - 1; i >= 0; i--) {
      const f = fading[i];
      const k = f.ms <= 0 ? 1 : Math.min(1, (now - f.began) / f.ms);
      f.mesh.scale.setScalar(1 - k);
      f.mesh.position.y = -k * 0.3;
      if (k >= 1) {
        pieces.remove(f.mesh);
        fading.splice(i, 1);
      }
    }

    const swing = targetYaw - yaw;
    if (Math.abs(swing) > 0.0004) yaw += swing * 0.1;
    else yaw = targetYaw;

    placeCamera();
    renderer.render(scene, camera);

    // Only keep the loop alive while something is actually moving.
    if (tween.length || fading.length || yaw !== targetYaw) invalidate();
  }

  // Canvas 2D takes whatever the font stack resolves to at the moment it draws, and silently
  // falls back if a webfont has not arrived — so the coordinates are drawn twice: once now,
  // and once more when Fraunces is actually available.
  coordFont()
    .then(() => {
      if (dead) return;
      trayTexture(trayCanvas);
      trayMap.needsUpdate = true;
      invalidate();
    })
    .catch(() => {
      // The fallback serif is already on the board; nothing to recover.
    });

  resize();

  return {
    setPosition,
    animate,
    setMarkers,
    pick,
    faceSide,
    nudgeYaw,
    nudgePitch,
    resize,
    get busy() {
      return tween.length > 0;
    },
    dispose() {
      dead = true;
      cancelAnimationFrame(raf);
      clearPieces();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) mesh.geometry?.dispose();
      });
      for (const p of prototypes.values()) {
        p.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      }
      for (const m of [
        ...Object.values(pieceMats), ...Object.values(openMats),
        dotMat, ringMat, washMat, pickMat, checkMat,
        surfaceMat, trayMat, trayTop, floorMat,
      ]) m.dispose();
      for (const g of [dotGeo, ringGeo, washGeo, surfaceGeo, trayGeo, floorGeo]) g.dispose();
      surfaceMap.dispose();
      trayMap.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}

export type Scene = ReturnType<typeof createScene>;
