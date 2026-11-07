// Pipgrove landing: one sticky 3D stage. A phone floats in the night garden with
// fireflies around it; each story step spins it to a new screen, Pip changes mood,
// and on the visitors step the garden friends circle the phone.
import * as THREE from "./vendor/three.module.min.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// Top bar turns solid once the page moves
const top = $(".top");
const onScroll = () => top.classList.toggle("solid", scrollY > 40);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

const stage = $(".stage");
const canvas = $("#scene");
const steps = $$(".step");
const fallback = $(".fallback-phone");

function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

// Active step tracking (shared by 3D and fallback)
let onStep = () => {};
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) onStep(steps.indexOf(e.target));
}, { rootMargin: "-45% 0px -45% 0px" });
steps.forEach((s) => io.observe(s));

function applyStepChrome(i) {
  stage.classList.toggle("bloom", steps[i].dataset.bloom === "1");
}

if (!webglOK()) {
  document.documentElement.classList.add("no-webgl");
  onStep = (i) => { applyStepChrome(i); fallback.src = `assets/screens/${steps[i].dataset.screen}.webp`; };
} else {
  start();
}

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 6);

  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (url) => {
    const t = loader.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    return t;
  };

  // ---- Phone -------------------------------------------------------------
  const W = 0.715, H = 1.47, R = 0.115, D = 0.05, BEV = 0.022;
  const rounded = (w, h, r) => {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  };
  const planeUV = (geo, w, h) => {
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
    uv.needsUpdate = true;
    return geo;
  };

  const phone = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(rounded(W - BEV * 2, H - BEV * 2, R - BEV), { depth: D, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 6, curveSegments: 24 }).translate(0, 0, -D / 2),
    new THREE.MeshPhysicalMaterial({ color: 0x8a90a6, metalness: 0.9, roughness: 0.28, clearcoat: 0.5, clearcoatRoughness: 0.2, envMapIntensity: 1.1 })
  );
  phone.add(body);

  const FRONT = D / 2 + BEV + 0.0015;
  // black glass face
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(rounded(W - 0.012, H - 0.012, R - 0.006), 24),
    new THREE.MeshPhysicalMaterial({ color: 0x05070c, roughness: 0.08, metalness: 0, clearcoat: 1, envMapIntensity: 0.6 }));
  glass.position.z = FRONT - 0.0008;
  phone.add(glass);

  const SW = W - 0.05, SH = H - 0.05;
  const screenMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const screen = new THREE.Mesh(planeUV(new THREE.ShapeGeometry(rounded(SW, SH, R - 0.03), 24), SW, SH), screenMat);
  screen.position.z = FRONT;
  phone.add(screen);

  const island = new THREE.Mesh(new THREE.ShapeGeometry(rounded(0.2, 0.058, 0.029), 12), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  island.position.set(0, SH / 2 - 0.052, FRONT + 0.0006);
  phone.add(island);

  // glossy reflection sweep over the screen, so it reads as glass
  const sheen = new THREE.Mesh(planeUV(new THREE.ShapeGeometry(rounded(SW, SH, R - 0.03), 24), SW, SH), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uShift: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "varying vec2 vUv; uniform float uShift; void main(){ float d = vUv.x * .8 + vUv.y - .9 - uShift; float a = smoothstep(.28,.0,abs(d)) * .07; gl_FragColor = vec4(vec3(1.0), a); }",
  }));
  sheen.position.z = FRONT + 0.001;
  phone.add(sheen);

  // back: frosted pink glass and a camera block
  const back = new THREE.Mesh(new THREE.ShapeGeometry(rounded(W - 0.012, H - 0.012, R - 0.006), 24),
    new THREE.MeshPhysicalMaterial({ color: 0xe9a7bf, roughness: 0.45, metalness: 0.05, clearcoat: 0.4, envMapIntensity: 0.9 }));
  back.position.z = -FRONT + 0.0008; back.rotation.y = Math.PI;
  phone.add(back);
  const camBlock = new THREE.Mesh(
    new THREE.ExtrudeGeometry(rounded(0.25, 0.25, 0.065), { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3, curveSegments: 16 }),
    new THREE.MeshPhysicalMaterial({ color: 0xd796ad, roughness: 0.25, metalness: 0.2, clearcoat: 0.8 }));
  camBlock.rotation.y = Math.PI;
  camBlock.position.set(W / 2 - 0.17, H / 2 - 0.17, -FRONT + 0.0005);
  phone.add(camBlock);
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0d14, roughness: 0.05, metalness: 0.3, clearcoat: 1 });
  for (const [x, y] of [[-0.055, 0.055], [-0.055, -0.055], [0.055, 0]]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.03, 32), lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(W / 2 - 0.17 - x, H / 2 - 0.17 + y, -FRONT - 0.03);
    phone.add(lens);
  }

  // side buttons
  const btnMat = body.material;
  for (const [x, y, h] of [[W / 2 + 0.004, 0.28, 0.2], [-W / 2 - 0.004, 0.36, 0.08], [-W / 2 - 0.004, 0.2, 0.13], [-W / 2 - 0.004, 0.03, 0.13]]) {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, h, 4, 8), btnMat);
    b.position.set(x, y, 0);
    phone.add(b);
  }

  const rig = new THREE.Group();   // placed by layout
  const spinner = new THREE.Group(); // turned by scroll steps
  spinner.add(phone);
  rig.add(spinner);
  scene.add(rig);

  // soft garden glow under the phone
  const glowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); return t;
  })();
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.0), new THREE.MeshBasicMaterial({ map: glowTex, color: 0x7fe0bf, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.set(0, -H / 2 - 0.12, -0.4);
  rig.add(glow);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xf7a9c4, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.set(0, 0.1, -0.9);
  rig.add(halo);

  // lights for rim colour on the metal frame
  scene.add(new THREE.AmbientLight(0x8899cc, 0.25));
  const pinkLight = new THREE.PointLight(0xf7a9c4, 6, 8); pinkLight.position.set(-2, 1.2, 1.5); scene.add(pinkLight);
  const mintLight = new THREE.PointLight(0x7fe0bf, 5, 8); mintLight.position.set(2.2, -1.2, 1.2); scene.add(mintLight);
  const goldLight = new THREE.PointLight(0xffd98a, 4, 8); goldLight.position.set(0.5, 2.5, -1.5); scene.add(goldLight);

  // ---- Pip and the visitors ------------------------------------------------
  const pipTex = {};
  for (const m of ["happy", "calm", "encourage", "proud", "cheer"]) pipTex[m] = tex(`assets/art/pip_${m}.webp`);
  const pipMat = new THREE.MeshBasicMaterial({ map: pipTex.happy, transparent: true, depthWrite: false, toneMapped: false });
  const pip = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.58), pipMat);
  pip.position.set(-0.62, -0.5, 0.45);
  rig.add(pip);

  const visitorNames = ["owl", "fox", "rabbit", "butterfly", "hedgehog", "bee", "moth", "robin"];
  const visitors = visitorNames.map((n, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: tex(`assets/art/visitor_${n}.webp`), transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }));
    m.userData.a = (i / visitorNames.length) * Math.PI * 2;
    m.scale.setScalar(0.001);
    rig.add(m);
    return m;
  });
  let visitorsOn = 0;

  // ---- Fireflies -----------------------------------------------------------
  const N = innerWidth < 700 ? 90 : 160;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 9;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 5.5;
    pos[i * 3 + 2] = -3.5 + Math.random() * 4.6;
    seed[i] = Math.random() * 100;
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  fg.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const fireflyMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uSpeed: { value: reduce ? 0.15 : 1 } },
    vertexShader: `
      attribute float seed; uniform float uTime; uniform float uPx; uniform float uSpeed; varying float vA; varying float vMix;
      void main(){
        vec3 p = position; float t = uTime * uSpeed;
        p.x += sin(t * .23 + seed) * .35; p.y += sin(t * .31 + seed * 1.7) * .28 + cos(t * .17 + seed) * .15; p.z += sin(t * .19 + seed * .5) * .2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float flick = .55 + .45 * sin(t * (1.2 + fract(seed) * 1.8) + seed * 6.0);
        vA = flick * flick; vMix = fract(seed * 7.13);
        gl_PointSize = (9.0 + fract(seed * 3.7) * 12.0) * uPx * (3.2 / -mv.z);
      }`,
    fragmentShader: `
      varying float vA; varying float vMix;
      void main(){
        float d = length(gl_PointCoord - .5);
        float core = smoothstep(.12, .0, d), halo = smoothstep(.5, .0, d) * .45;
        vec3 c = mix(vec3(1.0, .85, .54), vec3(.62, 1.0, .82), step(.72, vMix));
        gl_FragColor = vec4(c, (core + halo) * vA);
      }`,
  });
  scene.add(new THREE.Points(fg, fireflyMat));

  // ---- Screens ---------------------------------------------------------------
  const screens = {};
  for (const s of steps) {
    const k = s.dataset.screen;
    if (!screens[k]) {
      const t = tex(`assets/screens/${k}.webp`);
      // screen art is 780x1688, the glass is slightly wider: crop top and bottom a hair
      const img = 780 / 1688, glassR = SW / SH;
      t.repeat.set(1, img / glassR); t.offset.set(0, (1 - img / glassR) / 2);
      screens[k] = t;
    }
  }
  screenMat.map = screens[steps[0].dataset.screen];

  // ---- Layout: phone right of the copy on wide screens, above it on phones ----
  let mobile = false;
  function layout() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const viewW = viewH * camera.aspect;
    mobile = w <= 820;
    if (mobile) {
      const s = Math.min((viewH * 0.4) / H, (viewW * 0.5) / W);
      rig.scale.setScalar(s);
      rig.position.set(0.06 * viewW, viewH * 0.21, 0);
      pip.position.set(-0.5, -0.5, 0.45);
    } else {
      const s = Math.min((viewH * 0.66) / H, (viewW * 0.3) / W);
      rig.scale.setScalar(s);
      rig.position.set(viewW * 0.2, -viewH * 0.01, 0);
      pip.position.set(-0.56, -0.56, 0.45);
    }
  }
  new ResizeObserver(layout).observe(stage);
  layout();

  // ---- Step changes: a full turn, swapping the screen while its back faces us ---
  let current = 0, spin = null, pipPop = 0;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  onStep = (i) => {
    if (i === current) return;
    const dir = i > current ? 1 : -1;
    current = i;
    applyStepChrome(i);
    const d = steps[i].dataset;
    visitorsOn = d.visitors === "1" ? 1 : 0;
    const nextScreen = screens[d.screen], nextPip = pipTex[d.pip] || pipTex.happy;
    if (reduce) { screenMat.map = nextScreen; pipMat.map = nextPip; return; }
    spin = { t0: performance.now(), from: spinner.rotation.y, to: Math.round(spinner.rotation.y / (Math.PI * 2)) * Math.PI * 2 + dir * Math.PI * 2, swapped: false, screen: nextScreen, pip: nextPip };
  };

  // ---- Pointer tilt ----------------------------------------------------------
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    tilt.tx = (e.clientX / innerWidth - 0.5) * 2;
    tilt.ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  // ---- Loop (only while the stage is on screen) ---------------------------------
  const intro = { t0: performance.now() };
  let running = true, visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }).observe($(".story"));
  document.addEventListener("visibilitychange", kick);
  function kick() {
    const should = visible && !document.hidden;
    if (should && !running) { running = true; requestAnimationFrame(frame); }
    if (!should) running = false;
  }

  const clock = new THREE.Clock();
  function frame(now) {
    if (!running) return;
    const t = clock.getElapsedTime();
    fireflyMat.uniforms.uTime.value = t;

    // intro: the phone rises out of the garden once, on load
    let introK = reduce ? 1 : Math.min(1, (now - intro.t0) / 1600);
    const ie = 1 - Math.pow(1 - introK, 4);

    // step spin
    let spinY = spinner.rotation.y;
    if (spin) {
      const k = Math.min(1, (now - spin.t0) / 1100), e = easeInOut(k);
      spinY = spin.from + (spin.to - spin.from) * e;
      if (!spin.swapped && k >= 0.5) { screenMat.map = spin.screen; pipMat.map = spin.pip; spin.swapped = true; pipPop = 1; }
      if (k >= 1) { spinY = spin.to; spin = null; }
    }
    spinner.rotation.y = spinY;

    tilt.x += (tilt.tx - tilt.x) * 0.05;
    tilt.y += (tilt.ty - tilt.y) * 0.05;
    const float = reduce ? 0 : Math.sin(t * 0.9) * 0.035;
    phone.position.y = float - (1 - ie) * 1.6;
    phone.rotation.set(-0.08 + tilt.y * 0.12 + (1 - ie) * 0.5, -0.32 + tilt.x * 0.22 - (1 - ie) * 1.2, 0.04 - (1 - ie) * 0.2);
    sheen.material.uniforms.uShift.value = phone.rotation.y * 0.8 + spinY * 0.05;

    // Pip bobs beside the phone, pops on mood change
    pipPop *= 0.9;
    const pipS = (0.6 + 0.4 * ie) * (1 + pipPop * 0.18);
    pip.scale.setScalar(pipS);
    pip.position.z = 0.45;
    pip.rotation.z = reduce ? 0 : Math.sin(t * 1.3) * 0.05;
    pip.position.y = (mobile ? -0.5 : -0.56) + (reduce ? 0 : Math.sin(t * 1.6 + 1) * 0.03);
    pipMat.opacity = ie;

    // visitors orbit on their step
    visitors.forEach((v, i) => {
      const target = visitorsOn ? 1 : 0;
      v.userData.k = (v.userData.k || 0) + (target - (v.userData.k || 0)) * 0.06;
      const k = v.userData.k, a = v.userData.a + t * (reduce ? 0 : 0.25);
      const r = 0.78 + 0.08 * Math.sin(t + i);
      v.position.set(Math.cos(a) * r, Math.sin(a * 1.0) * 0.62 + 0.05, Math.sin(a) * 0.55 + 0.1);
      v.scale.setScalar(Math.max(0.001, k * (0.8 + 0.2 * Math.sin(t * 2 + i))));
      v.material.opacity = k;
    });

    glow.material.opacity = 0.28 + 0.06 * Math.sin(t * 1.4);
    camera.position.x = tilt.x * 0.12;
    camera.position.y = -tilt.y * 0.08;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
