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
  fan: { x: -2.1, z: -3.2, stand: [-1.6, -2.2] },
  desk: { x: 0.2, z: -3.2, stand: [0.2, -2.0] },
  stove: { x: 2.1, z: -3.3, stand: [2.1, -2.1] },
  tv: { x: 3.9, z: -3.3, stand: [3.6, -1.6] },
  chair: { x: -0.8, z: -0.6, stand: [-0.8, -0.6], sit: true },
  speaker: { x: 1.3, z: -0.9, stand: [1.3, 0.2] },
  sofa: { x: 3.6, z: -0.6, rot: Math.PI, stand: [3.6, -0.6], sit: true },
  dog: { x: 0.6, z: 1.9, stand: [1.4, 2.3] },
  bucket: { x: 4.1, z: 3.1, stand: [3.2, 3.0] },
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
    const spots = [[-3.0, 0.4], [-0.6, 1.3], [1.8, 0.2], [4.0, 1.2]];
    cfg.people.forEach((p, i) => {
      const npc = makeCharacter(p.look);
      const [x, z] = spots[i % spots.length];
      npc.position.set(x, 0, z);
      npc.rotation.y = 0.5 - i * 0.25;
      npc.userData.pick = { kind: 'person', id: p.id };
      npc.userData.idle = i;
      scene.add(npc);
      props.push(npc);
      addTag(`${p.name} · ${p.level}`, npc, 2.75, () => tapPerson(p.id, npc));
    });
    addPlayer(cfg.look, keep);
    resize();
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
    const spot = objectId ? HOME_LAYOUT[objectId] : null;
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
        const spot = HOME_LAYOUT[pick.id];
        walkTo(spot.stand?.[0] ?? spot.x, spot.stand?.[1] ?? spot.z + 1, () => handlers.onObject?.(pick.id));
        return;
      }
      if (pick?.kind === 'person') return tapPerson(pick.id, o);
    }
    const f = raycaster.intersectObject(floor)[0];
    if (f) walkTo(f.point.x, f.point.z);
  });

  function tapPerson(id, npc) {
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
          const step = Math.min(dist, 3.0 * dt);
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
    for (const g of props) {
      if (g.userData.idle !== undefined) g.userData.parts.body.position.y = 0.86 + Math.sin(t * 2 + g.userData.idle) * 0.012;
      const fan = g.getObjectByName?.('fanhead');
      if (fan) fan.rotation.z = Math.sin(t) * 0.5;
      const tail = g.getObjectByName?.('tail');
      if (tail) tail.rotation.y = Math.sin(t * 10) * 0.5;
    }
    for (const tag of tags) project(tag.obj, tag.height, tag.el);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);
  new ResizeObserver(resize).observe(container);

  return { showHome, showStreet, clear, walkTo, perform, resize, setTime };
}
