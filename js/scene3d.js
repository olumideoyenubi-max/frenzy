// The 3D stage: an isometric room or street drawn with three.js (the global THREE, loaded from a CDN).
// It knows nothing about game rules. ui.js tells it what to show and gets told what the player tapped.

const DEG = Math.PI / 180;

export function has3D() {
  try {
    if (!window.THREE) return false;
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

// ---------- textures ----------

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

function waxTexture(color, pattern) {
  return canvasTexture(64, 64, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    if (pattern === 'stripes') {
      g.fillStyle = 'rgba(255,255,255,0.55)';
      for (let y = 6; y < h; y += 16) g.fillRect(0, y, w, 6);
    } else if (pattern === 'dots') {
      g.fillStyle = 'rgba(255,255,255,0.6)';
      for (let y = 8; y < h; y += 16) {
        for (let x = 8; x < w; x += 16) {
          g.beginPath();
          g.arc(x + ((y - 8) / 16) % 2 * 8, y, 3.5, 0, Math.PI * 2);
          g.fill();
        }
      }
    } else if (pattern === 'kente') {
      for (let y = 0; y < h; y += 16) {
        for (let x = 0; x < w; x += 16) {
          g.fillStyle = (x + y) / 16 % 2 ? 'rgba(29,27,22,0.55)' : 'rgba(255,210,63,0.9)';
          g.fillRect(x, y, 8, 8);
          g.fillStyle = 'rgba(0,158,96,0.7)';
          g.fillRect(x + 8, y + 8, 8, 8);
        }
      }
    }
  });
}

function faceTexture(skin) {
  return canvasTexture(64, 64, (g, w, h) => {
    g.fillStyle = skin;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d1b16';
    g.fillRect(17, 25, 8, 10);
    g.fillRect(39, 25, 8, 10);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillRect(19, 26, 3, 3);
    g.fillRect(41, 26, 3, 3);
    g.strokeStyle = '#1d1b16';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(32, 38, 9, 0.2 * Math.PI, 0.8 * Math.PI);
    g.stroke();
  });
}

function checkerTexture(a, b, repeat) {
  const t = canvasTexture(64, 64, (g) => {
    g.fillStyle = a;
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = b;
    g.fillRect(0, 0, 32, 32);
    g.fillRect(32, 32, 32, 32);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  return t;
}

// ---------- building blocks ----------

const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });

function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rt, rb, h, material, x = 0, y = 0, z = 0, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function ball(r, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// ---------- the character ----------

// A low-poly person about 2.3 units tall, facing +z. Feet are at y = 0.
export function makeCharacter(look) {
  const root = new THREE.Group();
  const skin = lambert(look.skin);
  const cloth = new THREE.MeshLambertMaterial({ map: waxTexture(look.outfit, look.pattern) });
  const trousers = lambert('#2d3142');
  const shoes = lambert('#1d1b16');
  const hair = lambert('#1d1b16');
  const ink = lambert('#1d1b16');

  const legs = [-0.13, 0.13].map((x) => {
    const hip = new THREE.Group();
    hip.position.set(x, 0.86, 0);
    hip.add(cyl(0.11, 0.09, 0.76, trousers, 0, -0.38, 0, 10));
    const shoe = box(0.2, 0.12, 0.34, shoes, 0, -0.8, 0.05);
    hip.add(shoe);
    root.add(hip);
    return hip;
  });
  const body = new THREE.Group();
  body.position.y = 0.86;
  root.add(body);
  body.add(box(0.5, 0.18, 0.28, trousers, 0, 0.04, 0));
  const torso = cyl(0.3, 0.25, 0.7, cloth, 0, 0.42, 0, 14);
  torso.scale.z = 0.62;
  body.add(torso);
  body.add(ball(0.12, cloth, -0.29, 0.72, 0));
  body.add(ball(0.12, cloth, 0.29, 0.72, 0));
  const arms = [-0.37, 0.37].map((x) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(x, 0.72, 0);
    shoulder.add(cyl(0.09, 0.08, 0.32, cloth, 0, -0.14, 0, 10));
    shoulder.add(cyl(0.07, 0.065, 0.3, skin, 0, -0.44, 0, 10));
    shoulder.add(ball(0.075, skin, 0, -0.62, 0));
    body.add(shoulder);
    return shoulder;
  });
  body.add(cyl(0.08, 0.09, 0.14, skin, 0, 0.82, 0, 10));
  const head = new THREE.Group();
  head.position.y = 1.1;
  body.add(head);
  const skull = ball(0.27, skin);
  skull.scale.set(1, 1.08, 0.98);
  head.add(skull);
  head.add(ball(0.035, ink, -0.09, 0.03, 0.245), ball(0.035, ink, 0.09, 0.03, 0.245));
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 6, 12, Math.PI), ink);
  smile.position.set(0, -0.07, 0.25);
  smile.rotation.z = Math.PI;
  head.add(smile);
  head.add(ball(0.05, skin, -0.27, 0, 0), ball(0.05, skin, 0.27, 0, 0));

  // Hair caps are the top part of a sphere sitting over the skull.
  const cap = (r, thetaLen, mat, y = 0.02) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, thetaLen), mat);
    m.position.set(0, y, -0.02);
    m.rotation.x = -0.45;
    m.castShadow = true;
    return m;
  };
  if (look.hair === 'afro') {
    const afro = ball(0.4, hair, 0, 0.14, -0.08);
    afro.scale.set(1.05, 0.95, 1);
    head.add(afro);
  } else if (look.hair === 'foulard') {
    const wrap = cap(0.3, Math.PI * 0.4, cloth, 0.07);
    wrap.scale.set(1.02, 1.5, 1.02);
    head.add(wrap);
    head.add(ball(0.11, cloth, 0.16, 0.42, -0.12));
  } else {
    head.add(cap(0.285, Math.PI * 0.42, hair));
    if (look.hair === 'locks') {
      for (const [x, z] of [[-0.24, -0.05], [0.24, -0.05], [-0.2, -0.16], [0.2, -0.16], [-0.08, -0.25], [0.08, -0.25]]) {
        head.add(cyl(0.035, 0.03, 0.5, hair, x, -0.18, z, 6));
      }
    }
  }
  root.userData.parts = { legs, arms, body, head };
  return root;
}

// ---------- furniture ----------

const ROOM = { w: 10, d: 8 };

// x, z position on the floor; `stand` is where you stand to use it; `rot` turns the object.
export const HOME_LAYOUT = {
  bed: { x: -3.6, z: -2.0, stand: [-2.2, -1.2] },
  ac: { x: -3.6, z: -3.85 },
  fan: { x: -2.3, z: -3.3, stand: [-1.9, -2.3] },
  desk: { x: -0.6, z: -3.3, stand: [-0.6, -2.1] },
  fridge: { x: 0.9, z: -3.45, stand: [0.9, -2.3] },
  stove: { x: 2.2, z: -3.3, stand: [2.2, -2.1] },
  tv: { x: 3.9, z: -3.3, stand: [3.6, -1.6] },
  chair: { x: -0.8, z: -0.6, stand: [-0.8, -0.6], sit: true },
  speaker: { x: 1.3, z: -0.9, stand: [1.3, 0.2] },
  sofa: { x: 3.6, z: -0.6, rot: Math.PI, stand: [3.6, -0.6], sit: true },
  toilet: { x: 4.4, z: 1.4, rot: -Math.PI / 2, stand: [3.4, 1.4] },
  shower: { x: 4.0, z: 3.0, stand: [3.0, 2.6] },
  dog: { x: 0.6, z: 1.9, stand: [1.4, 2.3] },
  bucket: { x: 2.4, z: 3.3, stand: [2.4, 2.4] },
};


function furniture(id, opts) {
  const g = new THREE.Group();
  const wood = lambert('#8a5a36');
  if (id === 'bed') {
    if (opts.mattress) {
      g.add(box(1.5, 0.4, 2.3, wood, 0, 0.2, 0));
      g.add(box(1.4, 0.25, 2.2, lambert('#f4f1ea'), 0, 0.52, 0));
      g.add(box(1.1, 0.12, 0.45, lambert('#ffffff'), 0, 0.7, -0.8));
      g.add(box(1.42, 0.06, 1.3, lambert('#f77f00'), 0, 0.66, 0.4));
      g.add(box(1.5, 0.9, 0.12, wood, 0, 0.45, -1.15));
    } else {
      const mat = new THREE.MeshLambertMaterial({ map: waxTexture('#e9c79f', 'stripes') });
      g.add(box(1.3, 0.08, 2.1, mat, 0, 0.04, 0));
      g.add(box(0.8, 0.1, 0.35, lambert('#f4f1ea'), 0, 0.12, -0.8));
    }
    if (opts.net) {
      const net = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.1, 2.5),
        new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, depthWrite: false }));
      net.position.y = 1.05;
      g.add(net);
    }
  } else if (id === 'chair') {
    const red = lambert('#d63a2f');
    g.add(box(0.7, 0.08, 0.7, red, 0, 0.5, 0));
    g.add(box(0.7, 0.7, 0.08, red, 0, 0.88, -0.32));
    for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) g.add(box(0.06, 0.5, 0.06, red, x, 0.25, z));
  } else if (id === 'bucket') {
    g.add(cyl(0.35, 0.28, 0.6, lambert('#1f7ae0'), 0, 0.3, 0));
    g.add(cyl(0.18, 0.18, 0.3, lambert('#e8b100'), 0.55, 0.15, 0.1));
  } else if (id === 'fan') {
    g.add(cyl(0.25, 0.3, 0.06, lambert('#dddddd'), 0, 0.03, 0));
    g.add(cyl(0.04, 0.04, 1.3, lambert('#dddddd'), 0, 0.68, 0));
    const head = cyl(0.38, 0.38, 0.1, lambert('#2f80ed'), 0, 1.4, 0.05, 18);
    head.rotation.x = Math.PI / 2;
    head.name = 'fanhead';
    g.add(head);
  } else if (id === 'desk') {
    g.add(box(1.6, 0.08, 0.8, wood, 0, 0.78, 0));
    for (const [x, z] of [[-0.72, -0.32], [0.72, -0.32], [-0.72, 0.32], [0.72, 0.32]]) g.add(box(0.07, 0.78, 0.07, wood, x, 0.39, z));
    g.add(box(0.3, 0.32, 0.22, lambert('#c7362b'), -0.45, 0.98, -0.1));
    g.add(box(0.3, 0.26, 0.22, lambert('#009e60'), -0.12, 0.95, -0.1));
    g.add(box(0.5, 0.04, 0.35, lambert('#333333'), 0.4, 0.84, 0.05));
  } else if (id === 'stove') {
    g.add(box(1.2, 0.85, 0.7, lambert('#d9d9d9'), 0, 0.43, 0));
    g.add(cyl(0.16, 0.16, 0.05, lambert('#222222'), -0.3, 0.88, 0));
    g.add(cyl(0.16, 0.16, 0.05, lambert('#222222'), 0.3, 0.88, 0));
    g.add(cyl(0.22, 0.2, 0.25, lambert('#9a9a9a'), 0.3, 1.02, 0));
  } else if (id === 'tv') {
    g.add(box(1.4, 0.5, 0.5, wood, 0, 0.25, 0));
    g.add(box(1.5, 0.9, 0.08, lambert('#111111'), 0, 1.05, 0));
    g.add(box(1.38, 0.78, 0.02, lambert('#2f80ed', { emissive: '#12355e' }), 0, 1.05, 0.05));
  } else if (id === 'speaker') {
    g.add(box(0.5, 0.8, 0.45, lambert('#1d1b16'), 0, 0.4, 0));
    const cone = cyl(0.14, 0.14, 0.04, lambert('#555555'), 0, 0.5, 0.23);
    cone.rotation.x = Math.PI / 2;
    g.add(cone);
  } else if (id === 'sofa') {
    const leather = lambert('#7a3e1d');
    g.add(box(2.0, 0.45, 0.9, leather, 0, 0.23, 0));
    g.add(box(2.0, 0.6, 0.25, leather, 0, 0.7, -0.35));
    g.add(box(0.22, 0.4, 0.9, leather, -0.95, 0.6, 0));
    g.add(box(0.22, 0.4, 0.9, leather, 0.95, 0.6, 0));
  } else if (id === 'dog') {
    const fur = lambert('#b07a45');
    g.add(box(0.35, 0.3, 0.75, fur, 0, 0.45, 0));
    g.add(box(0.3, 0.3, 0.3, fur, 0, 0.7, 0.45));
    g.add(box(0.12, 0.12, 0.15, lambert('#1d1b16'), 0, 0.66, 0.65));
    for (const [x, z] of [[-0.12, -0.28], [0.12, -0.28], [-0.12, 0.28], [0.12, 0.28]]) g.add(box(0.09, 0.32, 0.09, fur, x, 0.16, z));
    const tail = box(0.06, 0.06, 0.3, fur, 0, 0.6, -0.48);
    tail.rotation.x = -0.6;
    tail.name = 'tail';
    g.add(tail);
  } else if (id === 'toilet') {
    const white = lambert('#f4f4f4');
    g.add(box(0.5, 0.42, 0.62, white, 0, 0.21, 0.05));
    g.add(box(0.55, 0.06, 0.66, white, 0, 0.45, 0.05));
    g.add(box(0.55, 0.6, 0.22, white, 0, 0.75, -0.3));
    g.add(box(0.12, 0.05, 0.05, lambert('#c0c0c0'), 0.15, 1.07, -0.3));
  } else if (id === 'shower') {
    g.add(box(1.2, 0.1, 1.2, lambert('#e8e8e8'), 0, 0.05, 0));
    const glass = new THREE.MeshLambertMaterial({ color: '#bfe0ea', transparent: true, opacity: 0.35, depthWrite: false });
    const front = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.1, 0.04), glass);
    front.position.set(0, 1.1, 0.6);
    g.add(front);
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.1, 1.2), glass);
    side.position.set(-0.6, 1.1, 0);
    g.add(side);
    g.add(cyl(0.03, 0.03, 2.2, lambert('#c0c0c0'), 0.45, 1.1, -0.5));
    g.add(cyl(0.14, 0.1, 0.05, lambert('#c0c0c0'), 0.3, 2.1, -0.4));
  } else if (id === 'fridge') {
    g.add(box(0.85, 1.9, 0.7, lambert('#f2f2f2'), 0, 0.95, 0));
    g.add(box(0.86, 0.02, 0.71, lambert('#bdbdbd'), 0, 1.25, 0));
    g.add(box(0.05, 0.4, 0.05, lambert('#9a9a9a'), 0.32, 1.55, 0.37));
    g.add(box(0.05, 0.3, 0.05, lambert('#9a9a9a'), 0.32, 0.95, 0.37));
  } else if (id === 'ac') {
    g.add(box(1.3, 0.4, 0.3, lambert('#f4f4f4'), 0, 2.3, 0));
  }
  return g;
}

// ---------- the street ----------

function streetProps(scene, area, colors = {}) {
  const seed = [...area.id].reduce((n, c) => n + c.charCodeAt(0), 0);
  const rnd = (i) => ((Math.sin(seed * 9.1 + i * 7.7) + 1) / 2);
  const towers = area.style === 'towers';
  const posh = area.style === 'posh' || area.price >= 1.3;
  const palette = towers ? ['#7fa9c9', '#a7c4d8', '#5f87a8'] : posh ? ['#f4f1ea', '#e8e1d2', '#f2e6c9'] : ['#e3b98a', '#d9d2c3', '#c9a07a', '#e7c5b5', '#b9cfe0'];
  const awnings = ['#f77f00', '#009e60', '#c7362b', '#1f5fbf', '#e8b100'];
  let x = -7;
  let i = 0;
  while (x < 7) {
    const w = 1.8 + rnd(i) * 1.2;
    const h = towers ? 5 + rnd(i + 3) * 5 : posh ? 1.8 + rnd(i + 3) * 1.2 : 2 + rnd(i + 3) * 2;
    const b = box(w - 0.15, h, 1.6, lambert(palette[i % palette.length]), x + w / 2, h / 2, -3.6);
    scene.add(b);
    if (!towers) {
      scene.add(box(w - 0.4, 0.08, 0.7, lambert(awnings[(i + seed) % awnings.length]), x + w / 2, 1.5, -2.55));
      scene.add(box(0.5, 0.9, 0.05, lambert('#5a3a22'), x + w / 2, 0.45, -2.78));
    } else {
      for (let fy = 1; fy < h - 0.5; fy += 0.8) scene.add(box(w - 0.4, 0.05, 0.02, lambert('#dce9f2'), x + w / 2, fy, -2.79));
    }
    x += w;
    i += 1;
  }
  // Market stalls with umbrellas, unless it's the business district.
  if (!towers) {
    for (const [sx, sz, c] of [[-3.6, -1.6, '#f77f00'], [3.0, -1.7, '#009e60']]) {
      scene.add(box(1.3, 0.08, 0.7, lambert('#8a5a36'), sx, 0.8, sz));
      for (const [lx, lz] of [[-0.55, -0.28], [0.55, -0.28], [-0.55, 0.28], [0.55, 0.28]]) scene.add(box(0.05, 0.8, 0.05, lambert('#8a5a36'), sx + lx, 0.4, sz + lz));
      for (let k = 0; k < 4; k++) scene.add(ball(0.12, lambert(['#e8b100', '#c7362b', '#009e60', '#f77f00'][k]), sx - 0.4 + k * 0.27, 0.92, sz));
      scene.add(cyl(0.03, 0.03, 1.4, lambert('#dddddd'), sx, 1.5, sz));
      const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.5, 8), lambert(c));
      umbrella.position.set(sx, 2.3, sz);
      umbrella.castShadow = true;
      scene.add(umbrella);
    }
  }
  // Palm trees.
  for (const px of [-6.2, 6.0]) {
    scene.add(cyl(0.12, 0.18, 2.6, lambert('#8a6a45'), px, 1.3, -1.8));
    for (let k = 0; k < 6; k++) {
      const leaf = box(1.4, 0.05, 0.35, lambert('#2e8b3e'), px, 2.6, -1.8);
      leaf.rotation.y = k * Math.PI / 3;
      leaf.rotation.z = -0.35;
      leaf.translateX(0.6);
      scene.add(leaf);
    }
  }
  // A parked gbaka at the kerb.
  const van = new THREE.Group();
  const [body, stripe, glass] = colors.van ?? ['#e8e8e8', '#009e60', '#2b3a4a'];
  van.add(box(3.0, 1.3, 1.4, lambert(body), 0, 0.95, 0));
  van.add(box(3.02, 0.35, 1.42, lambert(stripe), 0, 0.55, 0));
  van.add(box(2.4, 0.45, 1.44, lambert(glass), -0.2, 1.25, 0));
  for (const wx of [-1.0, 1.0]) for (const wz of [-0.7, 0.7]) {
    const wheel = cyl(0.3, 0.3, 0.2, lambert('#1d1b16'), wx, 0.3, wz);
    wheel.rotation.x = Math.PI / 2;
    van.add(wheel);
  }
  van.position.set(4.6, 0, 3.4);
  scene.add(van);
}

// ---------- places you can walk into ----------

// Where each lot's interactive things stand, and where you stand to use them.
export const LOT_LAYOUTS = {
  maquis: {
    bar: { x: -3.6, z: -2.9, stand: [-3.6, -1.7] },
    dance: { x: 2.4, z: -1.2, stand: [2.4, -1.2] },
    table: { x: -1.0, z: 0.6, stand: [-1.0, 1.6] },
    dj: { x: 3.6, z: -3.3, stand: [3.0, -2.3] },
  },
  market: {
    stall: { x: 0, z: -2.6, stand: [0, -1.4] },
    garba: { x: 0, z: 1.3, stand: [0, 2.3] },
    wc: { x: 5.0, z: -0.9, stand: [3.9, -0.9] },
  },
  beach: {
    sea: { x: 0, z: 3.6, stand: [0, 2.5] },
    umbrella: { x: -3, z: -1, stand: [-3, 0.2] },
    grill: { x: -4.6, z: 1.2, stand: [-3.6, 1.6] },
  },
};

const LOT_BOUNDS = {
  maquis: { x: [-5.3, 5.3], z: [-3.3, 3.6] },
  market: { x: [-5.3, 5.3], z: [-3.3, 3.6] },
  beach: { x: [-6, 6], z: [-2.8, 2.9] },
};

function plasticChair(color = '#d63a2f') {
  const g = new THREE.Group();
  const m = lambert(color);
  g.add(box(0.55, 0.06, 0.55, m, 0, 0.42, 0));
  g.add(box(0.55, 0.55, 0.06, m, 0, 0.7, -0.25));
  for (const [x, z] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]) g.add(box(0.05, 0.42, 0.05, m, x, 0.21, z));
  return g;
}

function umbrella(color, x, z, h = 2.2) {
  const g = new THREE.Group();
  g.add(cyl(0.03, 0.03, h, lambert('#dddddd'), 0, h / 2, 0));
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.5, 8), lambert(color));
  top.position.y = h;
  top.castShadow = true;
  g.add(top);
  g.position.set(x, 0, z);
  return g;
}

function signTexture(text, bg, fg = '#ffffff') {
  return canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.font = 'bold 34px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

// Builds a lot's scenery. Interactive groups get `userData.pick`; moving bits go in `anims`.
function buildLot(kind, scene, props, anims) {
  const pick = (g, id) => { g.userData.pick = { kind: 'object', id }; scene.add(g); props.push(g); return g; };
  const wood = lambert('#8a5a36');
  if (kind === 'maquis') {
    const wall = lambert('#2f6b3f');
    scene.add(box(12.2, 2.4, 0.25, wall, 0, 1.2, -4.1), box(0.25, 2.4, 8, wall, -6.1, 1.2, 0));
    scene.add(box(12.2, 0.12, 0.3, lambert('#e8b100'), 0, 2.45, -4.1), box(0.3, 0.12, 8, lambert('#e8b100'), -6.1, 2.45, 0));
    // Fairy lights along the walls.
    const colors = ['#ff5a5a', '#ffd23f', '#3fd27a', '#4aa8ff'];
    for (let i = 0; i < 24; i++) {
      const c = colors[i % 4];
      scene.add(ball(0.07, lambert(c, { emissive: c }), -5.8 + i * 0.5, 2.25, -3.9));
    }
    // The bar with bottles.
    const bar = new THREE.Group();
    bar.add(box(3, 1.1, 0.8, wood, 0, 0.55, 0), box(3.1, 0.08, 0.9, lambert('#5a3a22'), 0, 1.12, 0));
    for (let i = 0; i < 7; i++) bar.add(cyl(0.06, 0.07, 0.4, lambert(['#2e7d32', '#8d6e63', '#c62828', '#f9a825'][i % 4]), -1.2 + i * 0.4, 1.36, -0.15, 8));
    bar.position.set(-3.6, 0, -2.9);
    pick(bar, 'bar');
    // Tables with plastic chairs.
    for (const [x, z] of [[-1.0, 0.6], [1.6, 1.8], [-3.4, 2.0]]) {
      const tbl = new THREE.Group();
      tbl.add(cyl(0.6, 0.6, 0.06, lambert('#f4f4f4'), 0, 0.75, 0, 16), cyl(0.05, 0.05, 0.75, lambert('#cccccc'), 0, 0.37, 0));
      tbl.add(cyl(0.05, 0.05, 0.3, lambert('#2e7d32'), 0.15, 0.93, 0.1, 8));
      for (const [cx, cz, r] of [[0.9, 0, -Math.PI / 2], [-0.9, 0, Math.PI / 2], [0, 0.9, Math.PI]]) {
        const ch = plasticChair(); ch.position.set(cx, 0, cz); ch.rotation.y = r; tbl.add(ch);
      }
      tbl.position.set(x, 0, z);
      pick(tbl, 'table');
    }
    // A dance floor that pulses.
    const floorG = new THREE.Group();
    const tiles = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const m = lambert((i + j) % 2 ? '#7b3fa0' : '#f77f00', { emissive: (i + j) % 2 ? '#3a1a50' : '#5a2a00' });
      tiles.push(m);
      floorG.add(box(0.8, 0.04, 0.8, m, -1.2 + i * 0.8, 0.02, -0.8 + j * 0.8));
    }
    floorG.position.set(2.4, 0, -1.2);
    pick(floorG, 'dance');
    anims.push((tt) => tiles.forEach((m, k) => { m.emissiveIntensity = 0.6 + Math.sin(tt * 4 + k) * 0.6; }));
    // DJ booth and speakers.
    const dj = new THREE.Group();
    dj.add(box(1.6, 0.9, 0.7, lambert('#1d1b16'), 0, 0.45, 0), box(0.5, 0.04, 0.35, lambert('#333333'), -0.3, 0.92, 0));
    dj.add(cyl(0.15, 0.15, 0.04, lambert('#555555'), 0.35, 0.93, 0, 12));
    dj.add(box(0.6, 1.4, 0.55, lambert('#111111'), 1.3, 0.7, 0), box(0.6, 1.4, 0.55, lambert('#111111'), -1.3, 0.7, 0));
    dj.position.set(3.6, 0, -3.3);
    pick(dj, 'dj');
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.75), new THREE.MeshBasicMaterial({ map: signTexture('MAQUIS', '#c7362b') }));
    sign.position.set(0, 2.0, -3.96);
    scene.add(sign);
  } else if (kind === 'market') {
    const goods = ['#e8b100', '#c7362b', '#009e60', '#f77f00', '#7b3fa0', '#1f5fbf'];
    let n = 0;
    for (const [x, z] of [[-3.6, -2.6], [0, -2.6], [3.6, -2.6], [-3.6, 0.6], [3.6, 0.6]]) {
      const st = new THREE.Group();
      st.add(box(2.2, 0.08, 1.0, wood, 0, 0.85, 0));
      for (const [lx, lz] of [[-1, -0.42], [1, -0.42], [-1, 0.42], [1, 0.42]]) st.add(box(0.06, 0.85, 0.06, wood, lx, 0.42, lz));
      for (let k = 0; k < 6; k++) st.add(box(0.28, 0.22, 0.28, lambert(goods[(k + n) % goods.length]), -0.8 + k * 0.32, 1.0, (k % 2) * 0.3 - 0.15));
      st.add(umbrella(goods[n % goods.length], 0, 0, 2.4));
      st.position.set(x, 0, z);
      pick(st, 'stall');
      n += 1;
    }
    const garba = new THREE.Group();
    garba.add(box(1.4, 0.08, 0.8, wood, 0, 0.8, 0), box(0.06, 0.8, 0.06, wood, -0.6, 0.4, -0.3), box(0.06, 0.8, 0.06, wood, 0.6, 0.4, 0.3));
    garba.add(cyl(0.35, 0.3, 0.35, lambert('#9a9a9a'), -0.3, 1.02, 0, 14), cyl(0.3, 0.3, 0.06, lambert('#f4f1ea'), 0.35, 0.87, 0, 14));
    for (const sx of [-0.7, 0.7]) garba.add(cyl(0.18, 0.18, 0.45, lambert('#1f5fbf'), sx, 0.22, 0.8, 10));
    garba.position.set(0, 0, 1.3);
    pick(garba, 'garba');
    const wc = new THREE.Group();
    wc.add(box(1.1, 2.1, 1.1, lambert('#1f7ae0'), 0, 1.05, 0));
    const wcSign = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.3), new THREE.MeshBasicMaterial({ map: signTexture('WC', '#ffffff', '#1f7ae0') }));
    wcSign.position.set(-0.56, 1.7, 0);
    wcSign.rotation.y = -Math.PI / 2;
    wc.add(wcSign);
    wc.position.set(5.0, 0, -0.9);
    pick(wc, 'wc');
  } else if (kind === 'beach') {
    const seaMat = new THREE.MeshLambertMaterial({ color: '#2b8fc9', emissive: '#0b3550', transparent: true, opacity: 0.92 });
    const sea = new THREE.Mesh(new THREE.BoxGeometry(18, 0.1, 5), seaMat);
    sea.position.set(0, -0.02, 5.4);
    sea.userData.pick = { kind: 'object', id: 'sea' };
    scene.add(sea);
    props.push(sea);
    const waves = [];
    for (let i = 0; i < 6; i++) {
      const w = box(2.4, 0.03, 0.12, lambert('#ffffff', { emissive: '#666666' }), -7 + i * 3, 0.05, 3.15);
      w.castShadow = false;
      scene.add(w);
      waves.push(w);
    }
    anims.push((tt) => waves.forEach((w, k) => { w.position.z = 3.15 + Math.sin(tt * 1.5 + k) * 0.25; }));
    for (const [x, z, c] of [[-3, -1, '#c7362b'], [0.4, -1.8, '#009e60'], [3.4, -0.8, '#e8b100']]) {
      const u = umbrella(c, 0, 0);
      const lounger = box(0.6, 0.1, 1.6, lambert('#f4f1ea'), 0.7, 0.3, 0.3);
      lounger.rotation.x = -0.15;
      u.add(lounger);
      u.position.set(x, 0, z);
      pick(u, 'umbrella');
    }
    // A painted pirogue on the sand.
    const boat = new THREE.Group();
    boat.add(box(4.2, 0.6, 0.9, lambert('#f77f00'), 0, 0.3, 0), box(4.25, 0.15, 0.95, lambert('#009e60'), 0, 0.55, 0));
    boat.add(box(4.25, 0.12, 0.95, lambert('#e8b100'), 0, 0.12, 0));
    boat.position.set(3.4, 0, 2.0);
    boat.rotation.y = 0.2;
    scene.add(boat);
    // A fish grill with smoke.
    const grill = new THREE.Group();
    grill.add(cyl(0.45, 0.45, 0.7, lambert('#333333'), 0, 0.7, 0, 14), box(1.0, 0.04, 0.6, lambert('#777777'), 0, 1.07, 0));
    for (const [lx, lz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) grill.add(box(0.05, 0.5, 0.05, lambert('#333333'), lx, 0.25, lz));
    const smoke = [0, 1, 2].map((k) => ball(0.2, new THREE.MeshLambertMaterial({ color: '#dddddd', transparent: true, opacity: 0.5, depthWrite: false }), 0, 1.4 + k * 0.4, 0));
    smoke.forEach((m) => { m.castShadow = false; grill.add(m); });
    anims.push((tt) => smoke.forEach((m, k) => { m.position.y = 1.3 + ((tt * 0.5 + k / 3) % 1) * 1.4; m.material.opacity = 0.5 * (1 - ((tt * 0.5 + k / 3) % 1)); }));
    grill.position.set(-4.6, 0, 1.2);
    pick(grill, 'grill');
    for (const px of [-5.6, 5.4]) {
      scene.add(cyl(0.12, 0.18, 2.8, lambert('#8a6a45'), px, 1.4, -2.6));
      for (let k = 0; k < 6; k++) {
        const leaf = box(1.4, 0.05, 0.35, lambert('#2e8b3e'), px, 2.8, -2.6);
        leaf.rotation.y = k * Math.PI / 3;
        leaf.rotation.z = -0.35;
        leaf.translateX(0.6);
        scene.add(leaf);
      }
    }
  }
}

// ---------- the stage ----------

export function createStage(container, handlers) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'stage-canvas';
  container.appendChild(renderer.domElement);
  const overlay = document.createElement('div');
  overlay.className = 'stage-overlay';
  container.appendChild(overlay);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  const raycaster = new THREE.Raycaster();
  const clock = new THREE.Clock();
  let scene = null;
  let key = '';
  let floor = null;
  let bounds = { x: [-4.5, 4.5], z: [-3.4, 3.6] };
  let player = null;
  let target = null;
  let arrive = null;
  let pose = 'idle';
  let fit = { w: 14, h: 11 };
  let tags = [];
  let props = [];
  let lights = null;
  let hour = 12;
  let layout = HOME_LAYOUT;
  let sceneKind = 'home';
  let anims = [];
  let npcs = [];
  const bubble = document.createElement('div');
  bubble.className = 'stage-bubble';
  bubble.hidden = true;
  overlay.appendChild(bubble);
  const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    // Fit the scene's width on wide screens; on tall phones, crop the sides a little so things stay big.
    const viewH = Math.max(fit.h, (aspect < 0.8 ? fit.w * 0.78 : fit.w) / aspect);
    camera.left = -viewH * aspect / 2;
    camera.right = viewH * aspect / 2;
    camera.top = viewH / 2;
    camera.bottom = -viewH / 2;
    camera.updateProjectionMatrix();
  }

  function baseScene(groundColors, size) {
    scene = new THREE.Scene();
    const sky = new THREE.HemisphereLight('#ffffff', '#8f7d60', 0.6);
    scene.add(sky);
    const sun = new THREE.DirectionalLight('#fff1d6', 0.65);
    lights = { sky, sun };
    sun.position.set(6, 12, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 });
    scene.add(sun);
    applyTime();
    floor = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]),
      new THREE.MeshLambertMaterial({ map: checkerTexture(groundColors[0], groundColors[1], [size[0] / 2, size[1] / 2]) }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    camera.position.set(11, 12, 11);
    camera.lookAt(0, 0.6, 0);
    props = [];
    anims = [];
    npcs = [];
    for (const t of tags) t.el.remove();
    tags = [];
  }

  function addPlayer(look, at) {
    player = makeCharacter(look);
    player.position.set(at[0], 0, at[1]);
    player.rotation.y = 0.6;
    scene.add(player);
    target = null;
    pose = 'idle';
  }

  function addTag(text, obj, height, onTap) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'stage-tag';
    el.textContent = text;
    el.addEventListener('click', (e) => { e.stopPropagation(); onTap?.(); });
    overlay.appendChild(el);
    tags.push({ el, obj, height });
  }

  // ----- public: what to show -----

  function showHome(cfg) {
    const k = JSON.stringify(['home', cfg.items, cfg.look]);
    if (k === key) return;
    const keep = player && key.startsWith('["home"') ? [player.position.x, player.position.z] : [0.6, 1.2];
    key = k;
    layout = HOME_LAYOUT;
    sceneKind = 'home';
    fit = { w: 14, h: 10.5 };
    bounds = { x: [-4.5, 4.6], z: [-3.3, 3.6] };
    baseScene(['#e2c9a0', '#cfb184'], [ROOM.w, ROOM.d]);
    const wallMat = lambert(cfg.scene?.wall ?? '#c8553d');
    const trim = lambert('#f1e3cf');
    scene.add(box(ROOM.w + 0.25, 2.6, 0.25, wallMat, 0, 1.3, -ROOM.d / 2 - 0.12));
    scene.add(box(0.25, 2.6, ROOM.d, wallMat, -ROOM.w / 2 - 0.12, 1.3, 0));
    scene.add(box(ROOM.w + 0.25, 0.12, 0.3, trim, 0, 2.62, -ROOM.d / 2 - 0.12));
    scene.add(box(0.3, 0.12, ROOM.d, trim, -ROOM.w / 2 - 0.12, 2.62, 0));
    // A window with bars and a door, Abidjan style.
    scene.add(box(1.8, 1.1, 0.06, lambert('#bfe0ea', { emissive: '#3d5a66' }), 1.0, 1.6, -ROOM.d / 2 + 0.02));
    for (let i = -2; i <= 2; i++) scene.add(box(0.05, 1.1, 0.08, lambert('#3a3a3a'), 1.0 + i * 0.36, 1.6, -ROOM.d / 2 + 0.05));
    scene.add(box(0.06, 2.0, 1.1, lambert('#6e4426'), -ROOM.w / 2 + 0.02, 1.0, 1.6));
    scene.add(box(0.08, 0.08, 0.08, lambert('#f77f00'), -ROOM.w / 2 + 0.08, 1.0, 1.2));
    // Furniture.
    for (const id of cfg.items) {
      const spot = HOME_LAYOUT[id];
      if (!spot) continue;
      const g = furniture(id, cfg);
      g.position.set(spot.x, 0, spot.z);
      g.rotation.y = spot.rot ?? 0;
      g.userData.pick = { kind: 'object', id };
      scene.add(g);
      props.push(g);
    }
    addPlayer(cfg.look, keep);
    resize();
  }

  function showStreet(cfg) {
    const k = JSON.stringify(['street', cfg.area.id, cfg.people.map((p) => p.id), cfg.look]);
    if (k === key) return;
    const sameArea = key.startsWith(`["street","${cfg.area.id}"`);
    const keep = player && sameArea ? [player.position.x, player.position.z] : [-5.4, 1.6];
    key = k;
    fit = { w: 17, h: 11 };
    bounds = { x: [-6.5, 6.5], z: [-2.2, 2.6] };
    baseScene(['#cdbd9c', '#bfae8a'], [16, 6]);
    floor.position.z = 0;
    const road = box(16, 0.02, 2.4, lambert('#45464d'), 0, 0.01, 4.2);
    road.receiveShadow = true;
    scene.add(road);
    for (let x = -7; x < 8; x += 2) scene.add(box(1, 0.03, 0.12, lambert('#f5f1e6'), x, 0.03, 4.2));
    scene.add(box(16, 0.18, 0.2, lambert('#bdb3a0'), 0, 0.09, 3.0));
    streetProps(scene, cfg.area, cfg.scene);
    layout = {};
    sceneKind = 'street';
    // Doors into the places you can visit here.
    (cfg.doors ?? []).forEach((d, i) => {
      const x = [-1.6, 2.0, 5.0][i % 3];
      const door = new THREE.Group();
      door.add(box(1.3, 2.0, 0.12, lambert('#5a3a22'), 0, 1.0, 0));
      door.add(box(1.1, 1.8, 0.05, lambert(d.color ?? '#f77f00', { emissive: '#331a00' }), 0, 0.92, 0.07));
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), new THREE.MeshBasicMaterial({ map: signTexture(d.sign, d.color ?? '#c7362b') }));
      sign.position.set(0, 2.35, 0.08);
      door.add(sign);
      door.position.set(x, 0, -2.72);
      door.userData.pick = { kind: 'door', id: d.id, x };
      scene.add(door);
      props.push(door);
      addTag(`${d.label} · tap to go in`, door, 1.9, () => enterDoor(d.id, x));
    });
    const spots = [[-3.0, 0.4], [-0.6, 1.3], [1.8, 0.2], [4.0, 1.2]];
    cfg.people.forEach((p, i) => addNpc(p, spots[i % spots.length], i));
    addPlayer(cfg.look, keep);
    resize();
  }

  function showLot(cfg) {
    const k = JSON.stringify(['lot', cfg.kind, cfg.people.map((p) => p.id), cfg.look]);
    if (k === key) return;
    key = k;
    layout = LOT_LAYOUTS[cfg.kind];
    sceneKind = cfg.kind;
    fit = { w: 15, h: 11 };
    bounds = LOT_BOUNDS[cfg.kind];
    const ground = { maquis: ['#8a3b2e', '#6e2c22'], market: ['#cdbd9c', '#bfae8a'], beach: ['#f0dca8', '#e6cf96'] }[cfg.kind];
    baseScene(ground, cfg.kind === 'beach' ? [18, 6] : [12, 8]);
    if (cfg.kind === 'beach') floor.position.z = 0;
    buildLot(cfg.kind, scene, props, anims);
    const spots = { maquis: [[0.4, 2.6], [3.4, 0.9], [-2.0, -1.4], [1.0, -2.6]], market: [[-1.8, -1.0], [1.8, -1.1], [-2.0, 2.4], [2.2, 2.2]],
      beach: [[-1.4, 0.6], [1.6, 1.0], [-0.6, -2.2], [4.2, -1.8]] }[cfg.kind];
    cfg.people.forEach((p, i) => addNpc(p, spots[i % spots.length], i));
    addPlayer(cfg.look, cfg.kind === 'beach' ? [-5.4, 0.4] : [-4.6, 3.0]);
    resize();
  }

  // Residents stroll around near where they were placed.
  function addNpc(p, [x, z], i) {
    const npc = makeCharacter(p.look);
    npc.position.set(x, 0, z);
    npc.rotation.y = 0.5 - i * 0.25;
    npc.userData.pick = { kind: 'person', id: p.id };
    npc.userData.idle = i;
    npc.userData.home = [x, z];
    npc.userData.wait = 1 + i;
    scene.add(npc);
    props.push(npc);
    npcs.push(npc);
    addTag(`${p.name} · ${p.level}`, npc, 2.75, () => tapPerson(p.id, npc));
  }

  function enterDoor(id, x) {
    walkTo(x, -2.0, () => handlers.onDoor?.(id));
  }

  function clear() {
    key = '';
  }

  // Light follows the clock: warm mornings, bright days, orange evenings and blue nights.
  const TIMES = [
    [6, '#ffe6c4', '#8f7d60', 0.62, '#ffd3a0', 0.62, [-4, 10, 9]],
    [9, '#ffffff', '#8f7d60', 0.62, '#fff1d6', 0.68, [6, 12, 8]],
    [17, '#ffe2bf', '#8a6a4a', 0.55, '#ffb070', 0.6, [10, 5, 4]],
    [19.5, '#7d8fc7', '#2b2f45', 0.38, '#9fb4ff', 0.28, [4, 10, 6]],
  ];
  function applyTime() {
    if (!lights) return;
    const [, skyC, groundC, skyI, sunC, sunI, pos] = [...TIMES].reverse().find(([h]) => hour >= h) ?? TIMES[0];
    lights.sky.color.set(skyC);
    lights.sky.groundColor.set(groundC);
    lights.sky.intensity = skyI;
    lights.sun.color.set(sunC);
    lights.sun.intensity = sunI;
    lights.sun.position.set(...pos);
  }
  function setTime(h) {
    if (h === hour) return;
    hour = h;
    applyTime();
  }

  // ----- movement and poses -----

  function walkTo(x, z, done) {
    if (!player) return;
    resetPose();
    target = new THREE.Vector3(
      Math.max(bounds.x[0], Math.min(bounds.x[1], x)), 0, Math.max(bounds.z[0], Math.min(bounds.z[1], z)));
    arrive = done ?? null;
    if (reduce()) {
      player.position.copy(target);
      finishWalk();
    }
  }

  function finishWalk() {
    target = null;
    const parts = player.userData.parts;
    for (const l of parts.legs) l.rotation.x = 0;
    for (const a of parts.arms) a.rotation.x = 0;
    const cb = arrive;
    arrive = null;
    cb?.();
  }

  function resetPose() {
    if (!player) return;
    pose = 'idle';
    const p = player.userData.parts;
    player.rotation.x = 0;
    player.position.y = 0;
    p.body.rotation.set(0, 0, 0);
    for (const l of p.legs) l.rotation.set(0, 0, 0);
    for (const a of p.arms) a.rotation.set(0, 0, 0);
  }

  // pose: 'lying' (on the bed), 'sitting', 'dancing' or 'idle'. Shows `icon` above the head, then calls done.
  function perform({ pose: next = 'idle', icon = '✨', objectId = null, ms = 1400 }, done) {
    if (!player) return done?.();
    resetPose();
    const spot = objectId ? layout[objectId] : null;
    const p = player.userData.parts;
    if (next === 'lying' && spot) {
      player.position.set(spot.x, cfgBedTop(), spot.z + 0.95);
      player.rotation.set(-Math.PI / 2, 0, 0);
    } else if (next === 'sitting' && spot) {
      player.position.set(spot.x, 0.1, spot.z + (spot.rot ? -0.05 : 0.05));
      player.rotation.y = spot.rot ? Math.PI : 0;
      for (const l of p.legs) l.rotation.x = -Math.PI / 2;
      player.position.y = 0.12;
    } else if (spot) {
      player.rotation.y = Math.atan2(spot.x - player.position.x, spot.z - player.position.z);
    }
    pose = next;
    showBubble(icon, reduce() ? 300 : ms);
    setTimeout(() => {
      if (next !== 'lying' && next !== 'sitting') resetPose();
      done?.();
    }, reduce() ? 0 : ms);
  }

  function cfgBedTop() {
    const bed = props.find((g) => g.userData.pick?.id === 'bed');
    return bed && bed.children.length > 4 ? 0.62 : 0.12;
  }

  function showBubble(icon, ms) {
    bubble.textContent = icon;
    bubble.hidden = false;
    clearTimeout(showBubble.t);
    showBubble.t = setTimeout(() => { bubble.hidden = true; }, ms);
  }

  // ----- input -----

  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) return;
    down = null;
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(props, true)[0];
    if (hit) {
      let o = hit.object;
      while (o && !o.userData.pick) o = o.parent;
      const pick = o?.userData.pick;
      if (pick?.kind === 'object') {
        const spot = layout[pick.id];
        walkTo(spot.stand?.[0] ?? spot.x, spot.stand?.[1] ?? spot.z + 1, () => handlers.onObject?.(pick.id, sceneKind));
        return;
      }
      if (pick?.kind === 'door') return enterDoor(pick.id, pick.x);
      if (pick?.kind === 'person') return tapPerson(pick.id, o);
    }
    const f = raycaster.intersectObject(floor)[0];
    if (f) walkTo(f.point.x, f.point.z);
  });

  function tapPerson(id, npc) {
    npc.userData.hold = true;
    npc.userData.target = null;
    const side = npc.position.x < player.position.x ? 1.1 : -1.1;
    walkTo(npc.position.x + side, npc.position.z + 0.4, () => {
      player.rotation.y = Math.atan2(npc.position.x - player.position.x, npc.position.z - player.position.z);
      npc.rotation.y = Math.atan2(player.position.x - npc.position.x, player.position.z - npc.position.z);
      handlers.onPerson?.(id);
    });
  }

  // ----- loop -----

  const v = new THREE.Vector3();
  function project(obj, height, el) {
    v.set(0, height, 0);
    obj.localToWorld(v);
    v.project(camera);
    el.style.transform = `translate(-50%, -100%) translate(${(v.x + 1) / 2 * container.clientWidth}px, ${(1 - v.y) / 2 * container.clientHeight}px)`;
  }

  function tick() {
    requestAnimationFrame(tick);
    if (!scene || document.hidden) return;
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    if (player) {
      const parts = player.userData.parts;
      if (target) {
        const d = target.clone().sub(player.position);
        d.y = 0;
        const dist = d.length();
        if (dist < 0.06) {
          finishWalk();
        } else {
          const step = Math.min(dist, 4.2 * dt);
          player.position.addScaledVector(d.normalize(), step);
          const want = Math.atan2(d.x, d.z);
          let diff = want - player.rotation.y;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          player.rotation.y += diff * Math.min(1, dt * 12);
          const swing = Math.sin(t * 11) * 0.7;
          parts.legs[0].rotation.x = swing;
          parts.legs[1].rotation.x = -swing;
          parts.arms[0].rotation.x = -swing * 0.8;
          parts.arms[1].rotation.x = swing * 0.8;
          parts.body.position.y = 0.86 + Math.abs(Math.sin(t * 11)) * 0.04;
        }
      } else if (pose === 'dancing') {
        player.rotation.y += dt * 3;
        parts.arms[0].rotation.z = -2.4 + Math.sin(t * 9) * 0.4;
        parts.arms[1].rotation.z = 2.4 + Math.sin(t * 9 + 1) * 0.4;
        parts.body.position.y = 0.86 + Math.abs(Math.sin(t * 9)) * 0.12;
      } else if (pose === 'idle') {
        parts.body.position.y = 0.86 + Math.sin(t * 2) * 0.01;
      }
      if (!bubble.hidden) project(player, pose === 'lying' ? 0.6 : 2.8, bubble);
    }
    for (const fn of anims) fn(t);
    for (const npc of npcs) wander(npc, dt, t);
    for (const g of props) {
      if (g.userData.idle !== undefined && !g.userData.target) g.userData.parts.body.position.y = 0.86 + Math.sin(t * 2 + g.userData.idle) * 0.012;
      const fan = g.getObjectByName?.('fanhead');
      if (fan) fan.rotation.z = Math.sin(t) * 0.5;
      const tail = g.getObjectByName?.('tail');
      if (tail) tail.rotation.y = Math.sin(t * 10) * 0.5;
    }
    for (const tag of tags) project(tag.obj, tag.height, tag.el);
    renderer.render(scene, camera);
  }
  // Pauses, picks a nearby spot, walks there, repeats. Stops once you've walked up to talk.
  function wander(npc, dt, t) {
    const u = npc.userData;
    const parts = u.parts;
    if (u.hold || reduce()) return;
    if (!u.target) {
      u.wait -= dt;
      if (u.wait > 0) return;
      const [hx, hz] = u.home;
      u.target = new THREE.Vector3(
        Math.max(bounds.x[0], Math.min(bounds.x[1], hx + (Math.random() - 0.5) * 3)), 0,
        Math.max(bounds.z[0], Math.min(bounds.z[1], hz + (Math.random() - 0.5) * 2)));
      return;
    }
    const d = u.target.clone().sub(npc.position);
    d.y = 0;
    const dist = d.length();
    if (dist < 0.06) {
      u.target = null;
      u.wait = 2 + Math.random() * 4;
      for (const l of parts.legs) l.rotation.x = 0;
      for (const a of parts.arms) a.rotation.x = 0;
      return;
    }
    npc.position.addScaledVector(d.normalize(), Math.min(dist, 1.3 * dt));
    let diff = Math.atan2(d.x, d.z) - npc.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    npc.rotation.y += diff * Math.min(1, dt * 8);
    const swing = Math.sin(t * 8 + u.idle) * 0.5;
    parts.legs[0].rotation.x = swing;
    parts.legs[1].rotation.x = -swing;
    parts.arms[0].rotation.x = -swing * 0.7;
    parts.arms[1].rotation.x = swing * 0.7;
  }

  requestAnimationFrame(tick);
  new ResizeObserver(resize).observe(container);

  // Same as clicking an object, a door or a person by id (used by tests and could serve keyboard play).
  function tap(id) {
    const g = props.find((o) => o.userData.pick?.id === id);
    const pick = g?.userData.pick;
    if (!pick) return false;
    if (pick.kind === 'object') {
      const spot = layout[id];
      walkTo(spot.stand?.[0] ?? spot.x, spot.stand?.[1] ?? spot.z + 1, () => handlers.onObject?.(id, sceneKind));
    } else if (pick.kind === 'door') enterDoor(id, pick.x);
    else tapPerson(id, g);
    return true;
  }

  const debug = () => ({ pos: player && [player.position.x, player.position.z], target: target && [target.x, target.z], arrive: Boolean(arrive), key, sceneKind, pose });
  return { showHome, showStreet, showLot, clear, walkTo, perform, resize, setTime, tap, debug };
}
