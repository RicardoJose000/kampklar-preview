// Interactive 3D handball for the hero. Texture and grip are painted on canvas, no image files.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const TW = 2048, TH = 1024;

function ribbon(ctx, { y, amp, freq, phase, w, color }) {
  ctx.beginPath();
  for (let x = 0; x <= TW; x += 8) ctx.lineTo(x, y + amp * Math.sin((x / TW) * Math.PI * 2 * freq + phase) - w / 2);
  for (let x = TW; x >= 0; x -= 8) ctx.lineTo(x, y + amp * Math.sin((x / TW) * Math.PI * 2 * freq + phase) + w / 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
function seam(ctx, x0, color, width) {
  ctx.beginPath();
  for (let y = 0; y <= TH; y += 8) ctx.lineTo(x0 + 60 * Math.sin((y / TH) * Math.PI * 2), y);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
const DESIGN = [
  { y: 512, amp: 190, freq: 1, phase: 0, w: 230, color: '#FF5A1F' },
  { y: 512, amp: 190, freq: 1, phase: 0, w: 70, color: '#FF8A3D' },
  { y: 512, amp: 210, freq: 1, phase: Math.PI, w: 150, color: '#0B1430' },
  { y: 512, amp: 210, freq: 1, phase: Math.PI, w: 18, color: '#F3F1EC' }
];
const SEAMS = [256, 768, 1280, 1792];

function colorMap() {
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, TH);
  g.addColorStop(0, '#E9E6DF'); g.addColorStop(.5, '#F6F4EF'); g.addColorStop(1, '#E9E6DF');
  ctx.fillStyle = g; ctx.fillRect(0, 0, TW, TH);
  DESIGN.forEach(r => ribbon(ctx, r));
  SEAMS.forEach(x => seam(ctx, x, 'rgba(20,24,36,.35)', 5));
  ctx.font = '800 64px Archivo, "Segoe UI", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  [[TW * .25, 300], [TW * .75, 724]].forEach(([x, y]) => {
    ctx.fillStyle = '#0B1430'; ctx.fillText('KAMPKLAR', x, y);
    ctx.fillStyle = '#FF5A1F'; ctx.fillRect(x - 150, y + 40, 300, 6);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function bumpMap() {
  const c = document.createElement('canvas'); c.width = TW / 2; c.height = TH / 2;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, c.width, c.height);
  // grip pebbles
  for (let i = 0; i < 26000; i++) {
    const v = 110 + Math.random() * 60 | 0;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.beginPath(); ctx.arc(Math.random() * c.width, Math.random() * c.height, .6 + Math.random() * 1.1, 0, 7); ctx.fill();
  }
  ctx.save(); ctx.scale(.5, .5);
  SEAMS.forEach(x => seam(ctx, x, '#000', 14));
  ctx.restore();
  return new THREE.CanvasTexture(c);
}

export function mountBall(canvas, wrap) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  camera.position.set(0, 0, 7);

  const root = new THREE.Group();
  scene.add(root);

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 160, 160),
    new THREE.MeshPhysicalMaterial({ map: colorMap(), bumpMap: bumpMap(), bumpScale: 2.2, roughness: .52, clearcoat: .45, clearcoatRoughness: .4 })
  );
  ball.rotation.set(.35, -.6, .18);
  root.add(ball);

  // orbit of particles
  const N = 700, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 2.15 + Math.random() * .55;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = (Math.random() - .5) * .14; pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const ring = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xFF8A3D, size: .022, transparent: true, opacity: .75, depthWrite: false }));
  ring.rotation.set(1.2, 0, .35);
  root.add(ring);

  scene.add(new THREE.HemisphereLight(0xC8D6FF, 0x22100A, .55));
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(3, 4, 5); scene.add(key);
  const rimA = new THREE.PointLight(0xFF5A1F, 40, 12); rimA.position.set(-3.2, -1.4, -1.5); scene.add(rimA);
  const rimB = new THREE.PointLight(0x5B8CFF, 26, 12); rimB.position.set(3.4, -2, -2.2); scene.add(rimB);

  const resize = () => {
    const { width, height } = wrap.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(wrap); resize();

  // interaction: tilt to pointer, drag to spin, scroll adds spin
  let tx = 0, ty = 0, spin = 0, vel = .0035, dragging = false, lastX = 0, lastY = 0, extraX = 0;
  const onMove = e => {
    tx = (e.clientX / innerWidth - .5) * .5; ty = (e.clientY / innerHeight - .5) * .4;
    if (dragging) { vel = (e.clientX - lastX) * .0009; extraX += (e.clientY - lastY) * .004; lastX = e.clientX; lastY = e.clientY; }
  };
  const onDown = e => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture?.(e.pointerId); canvas.style.cursor = 'grabbing'; };
  const onUp = () => { dragging = false; canvas.style.cursor = 'grab'; };
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'pan-y';
  addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  addEventListener('pointerup', onUp);

  let visible = true, raf = 0, lastScroll = scrollY;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) loop(); }, { threshold: 0 });
  io.observe(wrap);

  const clock = new THREE.Clock();
  function loop() {
    if (!visible) { raf = 0; return; }
    raf = requestAnimationFrame(loop);
    const t = clock.getElapsedTime();
    const ds = scrollY - lastScroll; lastScroll = scrollY;
    if (!dragging) vel += (.0035 - vel) * .02;
    spin += vel + ds * .0016;
    extraX *= .96;
    ball.rotation.y = -.6 + spin;
    ball.rotation.x = .35 + extraX;
    root.rotation.x += (ty - root.rotation.x) * .05;
    root.rotation.z += (-tx * .4 - root.rotation.z) * .05;
    root.position.y = Math.sin(t * 1.1) * .06;
    ring.rotation.y = t * .12;
    renderer.render(scene, camera);
  }
  loop();

  if (window.gsap) gsap.from(root.scale, { x: .6, y: .6, z: .6, duration: 1.8, ease: 'expo.out', delay: .2 });

  return () => {
    cancelAnimationFrame(raf); raf = 0; visible = false;
    io.disconnect(); ro.disconnect();
    removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointerdown', onDown);
    scene.traverse(o => { o.geometry?.dispose(); if (o.material) { o.material.map?.dispose(); o.material.bumpMap?.dispose(); o.material.dispose(); } });
    renderer.dispose();
  };
}
