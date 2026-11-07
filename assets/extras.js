// Page extras that do not need WebGL: story rail and mobile bar visibility,
// the 30-second craving wave, and the sugar calculator.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// ---- Rail and mobile bar visibility ------------------------------------------
{
  const rail = $(".rail"), bar = $(".mob-cta"), story = $(".story"), closing = $(".closing");
  let closingIn = false;
  const sync = () => {
    rail.classList.toggle("off", story.getBoundingClientRect().bottom < innerHeight * 0.6);
    const on = scrollY > innerHeight * 0.8 && !closingIn;
    bar.classList.toggle("on", on);
    bar.setAttribute("aria-hidden", on ? "false" : "true");
    bar.tabIndex = on ? 0 : -1;
  };
  new IntersectionObserver(([e]) => { closingIn = e.isIntersecting; sync(); }).observe(closing);
  addEventListener("scroll", sync, { passive: true });
  sync();
}

// ---- Try it: a 30-second craving wave ----------------------------------------
{
  const card = $(".wave-card"), cv = $("#wave"), say = $(".wave-say"), time = $(".wave-time");
  const go = $("#wave-go"), stop = $("#wave-stop"), done = $(".wave-done");
  const ctx = cv.getContext("2d");
  const LEN = 30, PEAK = 11;
  // urge: rises to a peak around 11 s, then fades close to zero by 30 s
  const urge = (t) => (t <= PEAK ? 0.12 + 0.88 * Math.sin(((t / PEAK) * Math.PI) / 2) ** 2 : 0.06 + 0.94 * Math.exp(-(((t - PEAK) / 7.2) ** 2)));
  // breath: 4 s in, 6 s out
  const breath = (t) => { const c = t % 10; return c < 4 ? 0.5 - 0.5 * Math.cos((c / 4) * Math.PI) : 0.5 + 0.5 * Math.cos(((c - 4) / 6) * Math.PI); };
  let t0 = 0, raf = 0, phase = "", last = 0;

  function size() {
    const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2);
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    draw(last);
  }
  function path(from, to, f) {
    ctx.beginPath();
    for (let s = from; s <= to + 1e-6; s += 0.1) { const [x, y] = f(s); s === from ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  }
  function draw(t) {
    last = t;
    const w = cv.clientWidth, h = cv.clientHeight;
    ctx.clearRect(0, 0, w, h);
    const x0 = w * 0.08, x1 = w * 0.92, base = h * 0.955, amp = h * 0.17;
    const X = (s) => x0 + (x1 - x0) * (s / LEN);
    const U = (s) => [X(s), base - urge(s) * amp];
    ctx.setLineDash([3, 6]); ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(247,169,196,.28)";
    path(0, LEN, U); ctx.stroke();
    ctx.setLineDash([]);
    if (t <= 0) return;
    const now = Math.min(t, LEN);
    const g = ctx.createLinearGradient(0, base - amp, 0, base);
    g.addColorStop(0, "rgba(247,169,196,.32)"); g.addColorStop(1, "rgba(255,217,138,0)");
    path(0, now, U); ctx.lineTo(X(now), base); ctx.lineTo(X(0), base); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    const lg = ctx.createLinearGradient(x0, 0, x1, 0); lg.addColorStop(0, "#f7a9c4"); lg.addColorStop(1, "#ffd98a");
    ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.strokeStyle = lg;
    path(0, now, U); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(127,224,191,.8)";
    path(0, now, (s) => [X(s), base - 4 - breath(s) * h * 0.045]); ctx.stroke();
    const [hx, hy] = U(now);
    const rg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 18);
    rg.addColorStop(0, "rgba(255,240,220,1)"); rg.addColorStop(1, "rgba(255,217,138,0)");
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(hx, hy, 18, 0, Math.PI * 2); ctx.fill();
  }
  function setPhase(p, text) { if (phase !== p) { phase = p; card.dataset.state = p; say.textContent = text; } }
  function tick(now) {
    const t = (now - t0) / 1000;
    if (t >= LEN) return finish();
    setPhase(t % 10 < 4 ? "in" : "out", t % 10 < 4 ? "Breathe in" : "Breathe out");
    const note = t < PEAK - 2 ? "The urge is building. Let it." : t < PEAK + 3 ? "This is the peak. It will not stay." : "It is already fading.";
    time.textContent = `${Math.ceil(LEN - t)}s · ${note}`;
    draw(t);
    raf = requestAnimationFrame(tick);
  }
  function start() {
    cancelAnimationFrame(raf);
    done.hidden = true; phase = "";
    go.hidden = true; stop.hidden = false;
    t0 = performance.now();
    raf = requestAnimationFrame(tick);
    stop.focus();
  }
  function reset(text) {
    cancelAnimationFrame(raf);
    card.dataset.state = "idle"; phase = "";
    say.textContent = text; time.textContent = "";
    go.hidden = false; stop.hidden = true; go.textContent = "Start 30 seconds";
    draw(0); go.focus();
  }
  function finish() {
    draw(LEN);
    card.dataset.state = "done"; phase = "";
    say.textContent = "The wave passed.";
    done.hidden = false; stop.hidden = true; go.hidden = false; go.textContent = "Ride another";
  }
  go.addEventListener("click", start);
  stop.addEventListener("click", () => reset("Stopped. Come back any time."));
  new ResizeObserver(size).observe(cv);
}

// ---- Calculator (same estimates as the app's onboarding) -------------------------
{
  const v = { sweets: 2, drinks: 1 };
  const out = (id) => document.getElementById(id);
  const cubes = $(".cubes");
  const usd = (n) => "$" + Math.round(n).toLocaleString("en-US");
  function render() {
    const grams = v.sweets * 15 + v.drinks * 30;
    const kg = (grams * 365) / 1000, spend = (v.sweets * 1.5 + v.drinks * 2) * 365;
    out("c-grams").textContent = grams;
    out("c-cubes").textContent = Math.round(grams / 4);
    out("c-kg").textContent = Math.round(kg);
    out("c-usd").textContent = usd(spend);
    out("c-save").textContent = usd(spend / 2);
    out("c-skip").textContent = `${Math.round(kg / 2)} kg`;
    // one cube per 4 g; cubes past the 25 g guideline turn pink
    const n = Math.round(grams / 4), limit = Math.round(25 / 4);
    while (cubes.children.length < n) {
      const c = document.createElement("i");
      c.className = "cube";
      c.style.animationDelay = `${(cubes.children.length % 12) * 25}ms`;
      cubes.append(c);
    }
    while (cubes.children.length > n) cubes.removeChild(cubes.lastElementChild);
    [...cubes.children].forEach((c, i) => c.classList.toggle("over", i >= limit));
    $$(".stepper").forEach((st) => {
      const k = st.dataset.k, [minus, , plus] = st.children;
      st.querySelector("output").textContent = v[k];
      minus.disabled = v[k] <= 0; plus.disabled = v[k] >= 12;
    });
  }
  $$(".stepper").forEach((st) => {
    const k = st.dataset.k, [minus, , plus] = st.children;
    minus.addEventListener("click", () => { v[k] = Math.max(0, v[k] - 1); render(); });
    plus.addEventListener("click", () => { v[k] = Math.min(12, v[k] + 1); render(); });
  });
  render();
}
