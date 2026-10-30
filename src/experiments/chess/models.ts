import * as THREE from "three";

/**
 * The pieces, turned rather than drawn.
 *
 * A real chess piece is made on a lathe: a profile is cut into a spinning blank, and the
 * shape you recognise is that profile swept through a full revolution. Doing the same
 * thing here — a list of radius-and-height points fed to LatheGeometry — gives genuine
 * turned forms with continuous surfaces, which is what catches the light. Two pieces are
 * exceptions, because they are carved and not turned: the knight is an extruded
 * silhouette with a bevelled edge on a turned collar, and the bishop's mitre is two half
 * lathes set a slit apart, which is how the slit gets cut all the way through instead of
 * being a dark line painted on.
 *
 * Proportions follow a tournament Staunton set against a 1-unit square: king 1.55 high on
 * a 0.75-wide base, descending to a 0.82 pawn. Getting this wrong is the single thing that
 * makes a 3D set look like toys — squat pieces on a full-size board read as draughts.
 *
 * All profiles are original. Nothing here is traced from an existing set.
 */

const V = (x: number, y: number) => new THREE.Vector2(x, y);

/**
 * Rounds a profile's corners so the lathe reads as turned timber, not stacked tins. The
 * spline overshoots at the sharp corner where the base meets the board, so the result is
 * clamped — an overshoot there dips the foot below the square and z-fights with it.
 */
function smooth(points: THREE.Vector2[], divisions = 6): THREE.Vector2[] {
  const curve = new THREE.SplineCurve(points);
  return curve.getPoints(points.length * divisions).map((p) => V(Math.max(0.001, p.x), Math.max(0, p.y)));
}

function lathe(points: THREE.Vector2[], segments = 72, phiStart = 0, phiLength = Math.PI * 2) {
  const geometry = new THREE.LatheGeometry(smooth(points), segments, phiStart, phiLength);
  geometry.computeVertexNormals();
  return geometry;
}

/** The foot every piece stands on: a weighted base with a chamfer and a small collar. */
function foot(radius: number): THREE.Vector2[] {
  return [
    V(0.001, 0),
    V(radius, 0),
    V(radius, 0.04),
    V(radius * 0.94, 0.08),
    V(radius * 0.7, 0.115),
    V(radius * 0.55, 0.15),
  ];
}

/**
 * A bevelled extrusion of a flat outline, centred on its own depth. An optional taper
 * squeezes the thickness per vertex, which is the difference between a carving and a
 * biscuit cutter: a knight's muzzle is half the width of its skull, and extruded flat it
 * reads as a slab from every angle you would actually play from.
 */
function carve(shape: THREE.Shape, depth: number, taper?: (x: number, y: number) => number) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 5,
    curveSegments: 26,
  });
  geometry.translate(0, 0, -depth / 2);
  if (taper) {
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const scale = taper(position.getX(i), position.getY(i));
      position.setZ(i, position.getZ(i) * scale);
    }
    position.needsUpdate = true;
  }
  geometry.computeVertexNormals();
  return geometry;
}

export type PieceKind = "p" | "n" | "b" | "r" | "q" | "k";

export function buildPiece(kind: PieceKind): THREE.Group {
  const group = new THREE.Group();
  const add = (geometry: THREE.BufferGeometry, y = 0) => {
    const mesh = new THREE.Mesh(geometry);
    mesh.position.y = y;
    group.add(mesh);
    return mesh;
  };

  if (kind === "p") {
    add(
      lathe([
        ...foot(0.3),
        V(0.125, 0.23),
        V(0.108, 0.37),
        V(0.155, 0.425),
        V(0.168, 0.46),
        V(0.108, 0.49),
        V(0.097, 0.525),
        V(0.05, 0.535),
        V(0.001, 0.54),
      ]),
    );
    add(new THREE.SphereGeometry(0.152, 40, 28), 0.668);
  }

  if (kind === "r") {
    add(
      lathe([
        ...foot(0.335),
        V(0.2, 0.25),
        V(0.188, 0.52),
        V(0.218, 0.58),
        V(0.256, 0.645),
        V(0.256, 0.82),
        V(0.196, 0.82),
        V(0.196, 0.72),
        V(0.001, 0.72),
      ]),
    );
    // Battlements: six blocks on the rim. Real ones are milled out of the rim, but at this
    // size the only difference you can see is whether the gaps read as gaps, and they do.
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const mesh = add(new THREE.BoxGeometry(0.105, 0.13, 0.085), 0.885);
      mesh.position.x = Math.cos(angle) * 0.226;
      mesh.position.z = Math.sin(angle) * 0.226;
      mesh.rotation.y = -angle;
    }
  }

  if (kind === "b") {
    add(
      lathe([
        ...foot(0.335),
        V(0.168, 0.25),
        V(0.147, 0.43),
        V(0.228, 0.495),
        V(0.248, 0.55),
        V(0.162, 0.59),
        V(0.148, 0.635),
        V(0.08, 0.645),
        V(0.001, 0.65),
      ]),
    );
    // The mitre, halved so the slit goes right through it. Each half is an open surface, so
    // it is drawn on both sides and you see into the cut, which is what a slit looks like.
    const profile = [
      V(0.001, 0.6),
      V(0.152, 0.63),
      V(0.216, 0.71),
      V(0.222, 0.81),
      V(0.176, 0.95),
      V(0.102, 1.07),
      V(0.042, 1.135),
      V(0.001, 1.155),
    ];
    for (const sign of [1, -1]) {
      const half = add(lathe(profile, 48, sign > 0 ? 0 : Math.PI, Math.PI));
      half.position.z = sign * 0.031;
      half.userData.doubleSided = true;
    }
    add(new THREE.SphereGeometry(0.066, 28, 20), 1.155);
  }

  if (kind === "n") {
    add(lathe([...foot(0.33), V(0.21, 0.25), V(0.196, 0.355), V(0.222, 0.4), V(0.13, 0.412), V(0.001, 0.418)]));
    // A carved head: drawn once in profile, extruded across and bevelled at the edges. The
    // muzzle overhangs the collar, as it does on a real knight — that overhang is most of
    // what makes the piece readable from above.
    const shape = new THREE.Shape();
    shape.moveTo(-0.2, 0);
    shape.lineTo(0.105, 0);
    shape.bezierCurveTo(0.098, 0.115, 0.082, 0.205, 0.094, 0.268); // the throat
    shape.bezierCurveTo(0.132, 0.335, 0.2, 0.378, 0.276, 0.402); // the jaw, coming forward
    shape.bezierCurveTo(0.33, 0.418, 0.378, 0.432, 0.399, 0.452); // under the muzzle
    shape.bezierCurveTo(0.412, 0.472, 0.405, 0.492, 0.378, 0.502); // round the nose
    shape.bezierCurveTo(0.33, 0.516, 0.282, 0.525, 0.244, 0.538); // back along the bridge
    shape.bezierCurveTo(0.212, 0.556, 0.193, 0.582, 0.186, 0.615); // the brow
    shape.lineTo(0.176, 0.705); // the near ear
    shape.lineTo(0.118, 0.622); // the notch between them
    shape.lineTo(0.074, 0.714); // the far ear
    shape.lineTo(0.032, 0.598); // the back of the skull
    shape.bezierCurveTo(-0.04, 0.578, -0.118, 0.53, -0.168, 0.448); // the nape
    shape.bezierCurveTo(-0.222, 0.345, -0.232, 0.2, -0.2, 0); // the mane, down the back
    shape.closePath();
    const mesh = add(
      carve(shape, 0.3, (x, y) => {
        const muzzle = THREE.MathUtils.smoothstep(x, 0.05, 0.4);
        const ears = THREE.MathUtils.smoothstep(y, 0.52, 0.72);
        const mane = THREE.MathUtils.smoothstep(-x, 0.08, 0.26);
        return (1 - 0.56 * muzzle) * (1 - 0.38 * ears) * (1 - 0.2 * mane);
      }),
      0.385,
    );
    mesh.rotation.y = Math.PI / 2;
  }

  if (kind === "q") {
    add(
      lathe([
        ...foot(0.36),
        V(0.188, 0.27),
        V(0.162, 0.47),
        V(0.258, 0.545),
        V(0.278, 0.605),
        V(0.188, 0.65),
        V(0.178, 0.715),
        V(0.268, 0.865),
        V(0.308, 1.025),
        V(0.292, 1.09),
        V(0.238, 1.12),
        V(0.13, 1.128),
        V(0.001, 1.132),
      ]),
    );
    // The coronet: nine points round the rim, which is what separates her from the king.
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      const mesh = add(new THREE.SphereGeometry(0.052, 20, 14), 1.165);
      mesh.position.x = Math.cos(angle) * 0.252;
      mesh.position.z = Math.sin(angle) * 0.252;
    }
    add(new THREE.SphereGeometry(0.082, 28, 20), 1.3);
  }

  if (kind === "k") {
    add(
      lathe([
        ...foot(0.375),
        V(0.198, 0.29),
        V(0.172, 0.51),
        V(0.268, 0.59),
        V(0.288, 0.655),
        V(0.192, 0.705),
        V(0.182, 0.785),
        V(0.282, 0.955),
        V(0.322, 1.12),
        V(0.302, 1.19),
        V(0.246, 1.225),
        V(0.252, 1.265),
        V(0.196, 1.305),
        V(0.1, 1.312),
        V(0.001, 1.316),
      ]),
    );
    // The cross, carved rather than two sticks glued together: one outline, one bevel.
    const arm = 0.056;
    const cross = new THREE.Shape();
    cross.moveTo(-arm, 0);
    cross.lineTo(arm, 0);
    cross.lineTo(arm, 0.112);
    cross.lineTo(0.088, 0.112);
    cross.lineTo(0.088, 0.172);
    cross.lineTo(arm, 0.172);
    cross.lineTo(arm, 0.245);
    cross.lineTo(-arm, 0.245);
    cross.lineTo(-arm, 0.172);
    cross.lineTo(-0.088, 0.172);
    cross.lineTo(-0.088, 0.112);
    cross.lineTo(-arm, 0.112);
    cross.closePath();
    add(carve(cross, 0.07), 1.305);
  }

  return group;
}
