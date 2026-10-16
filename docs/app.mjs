import {
  clamp,
  rate,
  baseline,
  uplift,
  total,
  cumulative,
  response,
  tasks,
  realised,
} from "./model.mjs";
const $ = (id) => document.getElementById(id),
  defaults = {
    p: 0.25,
    d: 0.3,
    h: 1.5,
    tc: 4,
    V: 10,
    H: 12,
    time: 8,
    seed: 27,
    sample: false,
    rule: "remaining",
    k: 0.4,
  };
let s = { ...defaults },
  timer = null;
function readSettings() {
  s = { ...defaults };
  try {
    const q = new URLSearchParams(location.hash.slice(1));
    for (const key of ["p", "d", "h", "tc", "V", "H", "time", "seed", "k"])
      if (q.has(key) && Number.isFinite(+q.get(key))) s[key] = +q.get(key);
    s.p = clamp(Math.round(s.p * 100), 0, 100) / 100;
    s.d = clamp(Math.round(s.d * 100), 0, 100) / 100;
    s.h = clamp(s.h, 0.2, 12);
    s.H = clamp(s.H, 4, 52);
    s.V = clamp(s.V, 1, 30);
    s.tc = clamp(s.tc, 0, s.H);
    s.time = clamp(s.time, 0, s.H);
    s.k = clamp(s.k, 0, 1);
    s.seed = Math.floor(clamp(s.seed, 1, 2147483647));
    s.sample = q.get("sample") === "true";
    if (["fixed", "remaining", "middle"].includes(q.get("rule")))
      s.rule = q.get("rule");
  } catch {}
}
readSettings();
const fmt = (n, d = 1) => n.toFixed(d),
  pct = (n) => `${Math.round(n * 100)}%`;
function sync() {
  s.d = Math.min(s.d, 1 - s.p);
  $("d").max = Math.round((1 - s.p) * 100);
  $("tc").max = s.H;
  $("time").max = s.H;
  for (const key of ["p", "d", "h", "tc", "V", "H", "time", "k"])
    $(key).value = ["p", "d", "k"].includes(key)
      ? Math.round(s[key] * 100)
      : s[key];
  $("sample").checked = s.sample;
  $("rule").value = s.rule;
}
function chart(
  id,
  {
    xmax,
    ymax,
    xlabel,
    lines = [],
    markers = [],
    horiz = [],
    area,
    points = [],
    percent = false,
  },
) {
  const el = $(id),
    bounds = el.getBoundingClientRect(),
    W = Math.max(360, bounds.width),
    H = Math.max(270, (W * bounds.height) / Math.max(1, bounds.width)),
    L = 58,
    R = 20,
    T = 28,
    B = 47,
    w = W - L - R,
    h = H - T - B;
  const X = (x) => L + (x / xmax) * w,
    Y = (y) => T + h - (y / ymax) * h;
  const path = (points) =>
    points
      .map(
        ([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(2)},${Y(y).toFixed(2)}`,
      )
      .join(" ");
  const sample = (f) =>
    Array.from({ length: 301 }, (_, i) => {
      let t = (xmax * i) / 300;
      return [t, f(t)];
    });
  let html = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><title>${el.getAttribute("aria-label")}</title>`;
  for (let i = 0; i <= 4; i++) {
    let y = (ymax * i) / 4;
    html += `<line x1="${L}" x2="${W - R}" y1="${Y(y)}" y2="${Y(y)}" stroke="#dce1d8"/><text x="${L - 10}" y="${Y(y) + 4}" text-anchor="end">${Math.round(y * 100) / 100}</text>`;
  }
  for (let i = 0; i <= 4; i++) {
    let x = (xmax * i) / 4;
    html += `<text x="${X(x)}" y="${H - 24}" text-anchor="middle">${percent ? pct(x) : fmt(x, Number.isInteger(x) ? 0 : 1)}</text>`;
  }
  html += `<text x="${L + w / 2}" y="${H - 3}" text-anchor="middle">${xlabel}</text>`;
  if (area) {
    const a = sample(area[0]),
      b = sample(area[1]).reverse();
    html += `<path d="${path([...a, ...b])}Z" fill="#167463" opacity=".075"/>`;
  }
  for (const z of horiz)
    html += `<line x1="${X(z.start || 0)}" x2="${W - R}" y1="${Y(z.y)}" y2="${Y(z.y)}" stroke="${z.color}" stroke-dasharray="5 5" opacity=".6"/><text x="${W - R - 4}" y="${Y(z.y) - 7}" text-anchor="end" style="font-size:11px">${z.label}</text>`;
  for (const z of markers)
    html += `<line x1="${X(z.x)}" x2="${X(z.x)}" y1="${T}" y2="${T + h}" stroke="${z.color || "#87998a"}" stroke-dasharray="${z.dash || "3 5"}"/><text x="${clamp(X(z.x) + 5, L, W - R - 75)}" y="${T - 10}" style="font-size:11px">${z.label || ""}</text>`;
  for (const l of lines)
    html += `<path d="${path(l.points || sample(l.fn))}" fill="none" stroke="${l.color}" stroke-width="${l.width || 3}" ${l.dash ? `stroke-dasharray="${l.dash}"` : ""} stroke-linecap="round" stroke-linejoin="round"/>`;
  for (const p of points)
    html += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="5" fill="${p.color}" stroke="#fffef9" stroke-width="2"/>`;
  el.innerHTML = html + "</svg>";
  el._scale = { L, R, W, xmax };
}
function stepPoints(ts, coached) {
  let y = 0,
    out = [[0, 0]];
  for (const t of ts
    .filter((x) => x.time <= s.H && (coached || x.kind === "original"))
    .sort((a, b) => a.time - b.time)) {
    out.push([t.time, y]);
    y += s.V / 100;
    out.push([t.time, y]);
  }
  out.push([s.H, y]);
  return out;
}
function render() {
  sync();
  const ts = tasks(s),
    b = baseline(s.time, s),
    g = total(s.time, s),
    extra = uplift(s.time, s);
  $("p-out").textContent = pct(s.p);
  $("d-out").textContent = `+${Math.round(s.d * 100)} pp`;
  $("h-out").textContent = `${fmt(s.h)} wk`;
  $("tc-out").textContent = `week ${fmt(s.tc, 2).replace(/\.?0+$/, "") || "0"}`;
  $("V-out").textContent = `${s.V} h/week`;
  $("H-out").textContent = `${s.H} weeks`;
  $("time-out").textContent = fmt(s.time);
  $("k-out").textContent = pct(s.k);
  const lines = [
    { fn: (t) => baseline(t, s), color: "#bb582f" },
    { fn: (t) => total(t, s), color: "#167463" },
  ];
  if (s.sample)
    lines.push(
      {
        points: stepPoints(ts, false),
        color: "#bb582f",
        width: 1.5,
        dash: "3 3",
      },
      {
        points: stepPoints(ts, true),
        color: "#167463",
        width: 1.5,
        dash: "3 3",
      },
    );
  chart("main-chart", {
    xmax: s.H,
    ymax: s.V * 1.12,
    xlabel: "Weeks since starting",
    lines,
    area: [(t) => total(t, s), (t) => baseline(t, s)],
    markers: [
      { x: s.tc, label: "Coaching" },
      { x: s.time, color: "#203b35", dash: "1 0" },
    ],
    horiz: [
      {
        y: s.V * s.p,
        color: "#bb582f",
        label:
          s.d === 0
            ? `Plateau: ${fmt(s.V * s.p)} h/wk`
            : `Before: ${fmt(s.V * s.p)} h/wk`,
      },
      {
        y: s.V * (s.p + s.d),
        color: "#167463",
        label: s.d === 0 ? "" : `After: ${fmt(s.V * (s.p + s.d))} h/wk`,
        start: s.tc,
      },
    ],
    points: [
      { x: s.time, y: b, color: "#bb582f" },
      { x: s.time, y: g, color: "#167463" },
    ],
  });
  $("metric-base").innerHTML = `${fmt(b)} <small>h/week</small>`;
  $("metric-total").innerHTML = `${fmt(g)} <small>h/week</small>`;
  $("metric-cumulative").innerHTML =
    `${fmt(cumulative(s.time, s))} <small>hours</small>`;
  $("insight").textContent =
    s.d === 0
      ? "No expansion in reach means no coaching benefit in this model. The two expected curves coincide."
      : s.time < s.tc
        ? `Coaching has not happened yet. At week ${fmt(s.tc)}, it will put another ${Math.round(s.d * 100)} applications within reach. There is no advance effect.`
        : `At week ${fmt(s.time)}, coaching adds ${fmt(extra)} hours saved per week. That gap approaches ${fmt(s.V * s.d)} h/week. The adjustment half-time stays ${fmt(s.h)} weeks; the initial slope increase fades as the new applications are adopted.`;
  const sorted = [...ts].sort((a, b) => a.id - b.id),
    n = ts.filter((x) => x.time <= s.time).length,
    opened = s.time >= s.tc,
    reachable = Math.round(100 * (s.p + (opened ? s.d : 0)));
  $("task-grid").innerHTML = sorted
    .map((t) => {
      const adopted = t.time <= s.time,
        newOpen = t.kind === "new" && opened;
      const status = adopted
        ? "adopted" + (newOpen ? " newly" : "")
        : newOpen
          ? "new"
          : t.kind === "original"
            ? "waiting"
            : "";
      const desc = adopted
        ? `Adopted at week ${fmt(t.time)}${newOpen ? " after coaching expanded reach" : ""}`
        : newOpen
          ? "Newly reachable after coaching, awaiting adoption"
          : t.kind === "original"
            ? "Reachable, awaiting adoption"
            : "Outside current reach";
      return `<div class="tile ${status}" title="Application ${t.id + 1}: ${desc}" role="img" aria-label="Application ${t.id + 1}: ${desc}"></div>`;
    })
    .join("");
  $("task-week").textContent = `ONE SIMULATED PERSON / WEEK ${fmt(s.time)}`;
  $("task-count").textContent = `${n} of 100 adopted`;
  $("task-description").textContent =
    `${reachable - n} reachable but still waiting; ${100 - reachable} outside reach. This person saves ${fmt(realised(s.time, s, ts))} h/week, compared with the expected ${fmt(g)}.`;
  $("task-value").textContent = `${fmt(s.V / 100, 2)} h/week`;
  chart("compare-chart", {
    xmax: s.H,
    ymax: s.V * 1.12,
    xlabel: "Weeks since starting",
    lines: [
      { fn: (t) => baseline(t, s), color: "#bb582f" },
      { fn: (t) => s.V * -Math.expm1(-rate(s.h) * s.p * t), color: "#7964a4" },
    ],
    horiz: [
      { y: s.V, color: "#7964a4", label: "All available value" },
      { y: s.V * s.p, color: "#bb582f", label: "Limited-reach plateau" },
    ],
  });
  $("compare-insight").textContent =
    s.p === 0
      ? "At p = 0, matching the initial slope also gives the alternative a zero adoption rate. Both stay at zero; the alternative no longer predicts eventual universal adoption."
      : s.p === 1
        ? "At p = 100%, the two models are identical: every application is reachable at the same rate."
        : `Both begin gaining ${fmt(s.V * s.p * rate(s.h), 2)} h/week of value per elapsed week. Limited reach settles at ${fmt(s.V * s.p)} h/week; slower universal adoption eventually reaches ${s.V}. Extend the horizon to see the difference.`;
  chart("target-chart", {
    xmax: 1,
    ymax: s.V * 1.05,
    xlabel: "Starting share within reach (p)",
    percent: true,
    lines: [{ fn: (p) => s.V * response(p, s.k, s.rule), color: "#167463" }],
    markers: [{ x: s.p, label: "Your p" }],
    points: [{ x: s.p, y: s.V * response(s.p, s.k, s.rule), color: "#167463" }],
  });
  const explanations = {
    fixed: `δ = min(k, 1 − p). Everyone gets the same increase until there is too little room left. Below that ceiling, low and high adopters benefit equally.`,
    remaining: `δ = k(1 − p). Coaching unlocks the same fraction of what remains. Lower adopters benefit more because this rule makes them more responsive.`,
    middle: `δ = kp(1 − p). Response grows with existing proficiency but shrinks with remaining room. Benefits peak at p = 50%; this is an added assumption, not a result of the adoption model.`,
  };
  $("target-insight").textContent =
    `${explanations[s.rule]} With k = ${pct(s.k)}, your selected p gives a long-run gain of ${fmt(s.V * response(s.p, s.k, s.rule))} h/week.`;
}
for (const key of ["p", "d", "h", "tc", "V", "H", "time", "k"])
  $(key).addEventListener("input", () => {
    s[key] = +$(key).value / (["p", "d", "k"].includes(key) ? 100 : 1);
    s.time = Math.min(s.time, s.H);
    s.tc = Math.min(s.tc, s.H);
    document
      .querySelectorAll("[data-preset]")
      .forEach((x) => x.classList.remove("active"));
    render();
  });
$("sample").addEventListener("change", () => {
  s.sample = $("sample").checked;
  render();
});
$("rule").addEventListener("change", () => {
  s.rule = $("rule").value;
  render();
});
function stop() {
  clearInterval(timer);
  timer = null;
  $("play").textContent = "▶ Play";
  $("play").setAttribute("aria-label", "Play timeline");
}
$("play").onclick = () => {
  if (timer) return stop();
  if (s.time >= s.H) s.time = 0;
  $("play").textContent = "Ⅱ Pause";
  $("play").setAttribute("aria-label", "Pause timeline");
  timer = setInterval(() => {
    s.time = Math.min(s.H, s.time + s.H / 150);
    render();
    if (s.time >= s.H) stop();
  }, 80);
};
$("reset").onclick = () => {
  stop();
  s = { ...defaults };
  render();
  document
    .querySelectorAll("[data-preset]")
    .forEach((x) =>
      x.classList.toggle("active", x.dataset.preset === "default"),
    );
};
$("resample").onclick = () => {
  s.seed = (s.seed + 1) % 2147483647 || 1;
  s.sample = true;
  render();
};
const presets = {
  default: {},
  stuck: { p: 0.08, d: 0, h: 1, tc: 4, time: 10 },
  fast: { p: 0.2, d: 0.4, h: 0.2, tc: 4, time: 5 },
  ceiling: { p: 0.9, d: 0.1, h: 1, tc: 4, time: 8 },
};
document.querySelectorAll("[data-preset]").forEach(
  (el) =>
    (el.onclick = () => {
      stop();
      s = { ...defaults, ...presets[el.dataset.preset] };
      document
        .querySelectorAll("[data-preset]")
        .forEach((x) => x.classList.toggle("active", x === el));
      render();
    }),
);
$("main-chart").addEventListener("click", (e) => {
  const a = $("main-chart")._scale,
    r = $("main-chart").getBoundingClientRect();
  s.time = clamp(
    ((((e.clientX - r.left) / r.width) * a.W - a.L) / (a.W - a.L - a.R)) *
      a.xmax,
    0,
    s.H,
  );
  render();
});
$("copy").onclick = async () => {
  const hash = new URLSearchParams(
    Object.entries(s).map(([k, v]) => [
      k,
      String(typeof v === "number" ? Math.round(v * 10000) / 10000 : v),
    ]),
  );
  history.replaceState(null, "", `#${hash}`);
  try {
    await navigator.clipboard.writeText(location.href);
    $("copy-status").textContent = "Copied — all settings included.";
  } catch {
    $("copy-status").textContent =
      "Settings saved in the address bar. Copy that URL to share.";
  }
};
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 100);
});
render();

window.addEventListener("hashchange", () => {
  stop();
  readSettings();
  document
    .querySelectorAll("[data-preset]")
    .forEach((el) => el.classList.remove("active"));
  render();
});
