import { P, curve, growth, coached, logGap } from "./forms.mjs";
const $ = (id) => document.getElementById(id);
let model = "restricted",
  view = "level",
  coach = "reach";
const models = {
  restricted: {
    assumption:
      "A fixed share p of value is reachable. Every remaining reachable application has the same constant hazard. Applications outside reach have zero hazard.",
    law: "ẏ = p − y",
    solution: "y(t) = p(1 − e<sup>−t</sup>)",
    restriction:
      "Different people can have different plateaus with the same adjustment speed. The normalized gap (p − y)/p shrinks at a constant proportional rate. Growth never accelerates along an uninterrupted path.",
    phase:
      "A straight, downward-sloping line. Growth is proportional to remaining reachable opportunity; it vanishes at p.",
    steps: [
      [
        "An application-level hazard",
        "Pr(adopt in dt | reachable, unadopted) = dt + o(dt)",
        "Time is normalized so the common hazard is one.",
      ],
      [
        "Aggregate remaining reachable value",
        "ẏ = p − y",
        "With additive fixed values and a common hazard, expected inflow equals remaining reachable value.",
      ],
      [
        "Separate variables and integrate",
        "dy / (p − y) = dt",
        "Starting from zero, −log[(p − y)/p] = t.",
      ],
      [
        "Solve",
        "y(t) = p(1 − e<sup>−t</sup>)",
        "The exponential follows from constant proportional gap closure, not merely from the presence of a plateau.",
      ],
    ],
  },
  universal: {
    assumption:
      "All available value is reachable: p = 1. A common constant hazard governs adoption. People differ only in how fast they traverse the same path.",
    law: "ẏ = 1 − y",
    solution: "y(t) = 1 − e<sup>−t</sup>",
    restriction:
      "Any strictly positive adoption rate eventually delivers all available value. A slower clock delays convergence but cannot create a permanently lower plateau.",
    phase:
      "Growth is linear in the gap to full adoption. The only steady state is y = 1.",
    steps: [
      [
        "Remove the inaccessible set",
        "p = 1",
        "Every application has a positive common adoption hazard.",
      ],
      [
        "Aggregate",
        "ẏ = 1 − y",
        "The remaining opportunity is the whole unadopted share.",
      ],
      [
        "Integrate",
        "y(t) = 1 − e<sup>−t</sup>",
        "A different constant hazard λ replaces t with λt: it rescales time, not the destination.",
      ],
    ],
  },
  heterogeneous: {
    assumption:
      "Reach remains limited to p, but accessible applications differ in their fixed adoption hazards. Fast applications are disproportionately adopted first.",
    law: "ẏ = h̄(t) (p − y)",
    solution: "y(t) = p[1 − E(e<sup>−λt</sup>)]",
    restriction:
      "Fixed heterogeneity in positive hazards produces a mixture of exponentials. The aggregate hazard falls as easy applications disappear. It cannot by itself generate accelerating growth from zero.",
    phase:
      "The trajectory bends rather than following a straight line. Current aggregate adoption hides which kinds of applications remain; this is not a general one-state law.",
    steps: [
      [
        "Condition on application hazard",
        "Pr(unadopted at t | reachable, λ) = e<sup>−λt</sup>",
        "The expectation below weights applications by value within the reachable set.",
      ],
      [
        "Average the survival probabilities",
        "p − y(t) = p E(e<sup>−λt</sup>)",
        "The plot uses two fixed positive hazards solely to illustrate the shape.",
      ],
      [
        "Compute the effective hazard",
        "h̄(t) = E(λe<sup>−λt</sup>) / E(e<sup>−λt</sup>)",
        "Weights shift toward slower applications as time passes.",
      ],
      [
        "A testable shape restriction",
        "d h̄ / dt = −Var<sub>remaining</sub>(λ) ≤ 0",
        "The log remaining gap is convex. With genuine heterogeneity, it is not a straight line.",
      ],
    ],
  },
  feedback: {
    assumption:
      "Reach is limited to p. The hazard rises with the share of reachable value already captured. Treat this as a continuum or deterministic approximation, not the exact mean of a finite stochastic process.",
    law: "ẏ = (1 + b y/p)(p − y)",
    solution: "y(t) = p(1 − e<sup>−(1+b)t</sup>) / (1 + b e<sup>−(1+b)t</sup>)",
    restriction:
      "For b > 1, growth initially accelerates and then slows. For 0 ≤ b ≤ 1, feedback exists but never produces an S-shaped level path. A positive baseline hazard allows adoption to start from zero.",
    phase:
      "A hump when feedback is strong enough. Growth peaks before the plateau, at y* = p(b − 1)/(2b). The example illustrates b > 1.",
    steps: [
      [
        "Let experience raise the hazard",
        "h(y) = 1 + b y/p",
        "This is an added behavioral assumption. It could represent confidence, search effort, or learning.",
      ],
      [
        "Normalize by reachable value",
        "q = y/p; &nbsp; q̇ = (1 − q)(1 + bq)",
        "The linear feedback term competes with depletion of remaining opportunities.",
      ],
      [
        "Integrate from q(0) = 0",
        "log[(1 + bq)/(1 − q)] = (1 + b)t",
        "Rearranging yields the displayed solution.",
      ],
      [
        "Find the change in curvature",
        "d q̇ / dq = (b − 1) − 2bq",
        "Since q̇ is positive inside the interval, this derivative determines the sign of q̈. Acceleration requires b > 1 and q < (b − 1)/(2b).",
      ],
    ],
  },
};
function plot(
  id,
  {
    lines,
    xmax = 6,
    ymin = 0,
    ymax = 1,
    xlabel = "Normalized time",
    ylabel = "Share of available value",
    horiz = [],
    vertical = [],
    area = false,
  },
) {
  const el = $(id),
    W = Math.max(350, el.clientWidth),
    H = 270,
    L = 48,
    R = 18,
    T = 25,
    B = 45,
    X = (x) => L + (x / xmax) * (W - L - R),
    Y = (y) => H - B - ((y - ymin) / (ymax - ymin)) * (H - T - B);
  const path = (pts) =>
    pts
      .map(
        ([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(3)},${Y(y).toFixed(3)}`,
      )
      .join(" ");
  let svg = `<svg viewBox="0 0 ${W} ${H}"><title>${el.getAttribute("aria-label")}</title><text x="${L}" y="12">${ylabel}</text>`;
  for (let i = 0; i <= 4; i++) {
    const y = ymin + ((ymax - ymin) * i) / 4;
    svg += `<line x1="${L}" x2="${W - R}" y1="${Y(y)}" y2="${Y(y)}" stroke="#e0e2dc"/>`;
  }
  svg += `<text x="${L - 8}" y="${Y(0) + 4}" text-anchor="end">0</text><text x="${W / 2}" y="${H - 6}" text-anchor="middle">${xlabel}</text>`;
  for (const z of horiz)
    svg += `<line x1="${L}" x2="${W - R}" y1="${Y(z.y)}" y2="${Y(z.y)}" stroke="#9ca89c" stroke-dasharray="3 4"/><text x="${W - R}" y="${Y(z.y) - 6}" text-anchor="end">${z.label}</text>`;
  for (const z of vertical)
    svg += `<line x1="${X(z.x)}" x2="${X(z.x)}" y1="${T}" y2="${H - B}" stroke="#9ca89c" stroke-dasharray="3 4"/><text x="${Math.min(X(z.x) + 5, W - 80)}" y="${T + 13}">${z.label}</text>`;
  for (const l of lines)
    svg += `<path d="${path(l.points)}" stroke="${l.color || "#245b50"}" stroke-width="2.5" fill="none" ${l.dash ? 'stroke-dasharray="5 4"' : ""}/>`;
  el.innerHTML = svg + "</svg>";
}
const samples = (f, T = 6, n = 400) =>
  Array.from({ length: n + 1 }, (_, i) => [(T * i) / n, f((T * i) / n)]);
function renderModel() {
  const m = models[model],
    p = model === "universal" ? 1 : P,
    horizon = model === "feedback" ? 1.5 : 6;
  $("model-summary").innerHTML =
    `<div class="summary-grid"><div><p class="label">Behavioral restriction</p><p>${m.assumption}</p></div><div><p class="label">Law of motion</p><p class="formula">${m.law}</p><p class="label">Solution from zero adoption</p><p class="formula">${m.solution}</p></div></div>`;
  let fn = (t) => curve(model, t),
    ymin = 0,
    ymax = 1.08,
    ylabel = "y",
    horiz = [
      {
        y: p,
        label:
          model === "universal" ? "Full opportunity: 1" : "Reachable share: p",
      },
    ],
    caption =
      "The plateau is a restriction on reach. The speed and curvature describe the process of approaching it.";
  if (view === "growth") {
    fn = (t) => growth(model, t);
    ymax = Math.max(1, ...samples(fn).map((x) => x[1])) * 1.1;
    ylabel = "ẏ";
    horiz = [];
    caption =
      model === "feedback"
        ? "Strong feedback first raises growth; depletion eventually wins. This is acceleration in the level, not just continued improvement."
        : "Growth falls throughout. A curved level path is not evidence of accelerating learning.";
  }
  if (view === "gap") {
    fn = (t) => logGap(model, t);
    ymin = Math.min(fn(horizon), -1) * 1.05;
    ymax = 0.2;
    ylabel = "log[(p − y)/p]";
    horiz = [];
    caption =
      model === "heterogeneous"
        ? "The slope becomes less negative: the remaining applications have lower hazards."
        : model === "feedback"
          ? "The slope becomes more negative: the hazard rises with adoption."
          : "A straight line: the remaining gap shrinks at a constant proportional rate. Its slope is minus the hazard.";
  }
  plot("time-chart", {
    lines: [{ points: samples(fn, horizon) }],
    xmax: horizon,
    ymin,
    ymax,
    ylabel,
    horiz,
  });
  $("time-caption").textContent = caption;
  const phase = samples((t) => t, model === "heterogeneous" ? 24 : 10, 600).map(
    ([t]) => [curve(model, t), growth(model, t)],
  );
  phase.push([p, 0]);
  plot("phase-chart", {
    lines: [{ points: phase }],
    xmax: 1.05,
    ymax: Math.max(1, ...phase.map((x) => x[1])) * 1.1,
    xlabel: "Current share captured, y",
    ylabel: "Growth, ẏ",
    vertical: [{ x: p, label: model === "universal" ? "1" : "p" }],
  });
  $("phase-caption").textContent = m.phase;
  $("restriction").innerHTML =
    `<span class="label">OBSERVABLE RESTRICTION</span><p>${m.restriction}</p>`;
  $("derivation-body").innerHTML =
    `<div class="steps">${m.steps.map(([title, eq, text]) => `<div class="step"><div><h3>${title}</h3><p class="formula">${eq}</p><p>${text}</p></div></div>`).join("")}</div>`;
}
const coaching = {
  reach: {
    continuity: "Level is continuous; growth jumps upward.",
    longrun: "A higher plateau: p + Δp.",
    rate: "The same proportional adjustment speed.",
    eq: "Δy(s) = Δp (1 − e<sup>−s</sup>)",
    text: "For s ≥ 0 after coaching, the gain builds toward Δp. Coaching makes additional value reachable; adoption takes time. A near-instant observed jump can be fast adjustment between observations, without a literal discontinuity.",
  },
  speed: {
    continuity: "Level is continuous; growth jumps upward.",
    longrun: "The same plateau: p.",
    rate: "A permanently higher hazard k > 1.",
    eq: "Δy(s) = (p − y<sub>c</sub>)(e<sup>−s</sup> − e<sup>−ks</sup>)",
    text: "The benefit is positive at intermediate horizons but vanishes as both paths approach p. This buys earlier gains, not a permanently higher level. y꜀ is adoption immediately before coaching.",
  },
  stock: {
    continuity: "The level jumps by J; subsequent growth falls.",
    longrun: "The same plateau: p.",
    rate: "The hazard stays fixed; less reachable value remains.",
    eq: "Δy(s) = J e<sup>−s</sup>",
    text: "The initial lead decays because the counterfactual catches up. A stock jump alone cannot generate a permanent gap with a shared fixed plateau. The illustrated jump is feasible: J ≤ p − y꜀.",
  },
};
function renderCoach() {
  const c = coaching[coach];
  let pts = samples((t) => coached(coach, t));
  if (coach === "stock") {
    pts = pts.filter(([t]) => t !== 2);
    pts.push([2, curve("restricted", 2)], [2, coached(coach, 2)]);
    pts.sort((a, b) => a[0] - b[0]);
  }
  plot("coach-chart", {
    lines: [
      {
        points: samples((t) => curve("restricted", t)),
        color: "#a66b4c",
        dash: true,
      },
      { points: pts },
    ],
    ymax: 1.05,
    ylabel: "y",
    vertical: [{ x: 2, label: "Coaching" }],
    horiz: [
      {
        y: coach === "reach" ? 0.75 : P,
        label: coach === "reach" ? "p + Δp" : "p",
      },
    ],
  });
  $("coach-properties").innerHTML =
    `<dl><dt>AT THE INTERVENTION</dt><dd>${c.continuity}</dd><dt>LONG RUN</dt><dd>${c.longrun}</dd><dt>ADOPTION PROCESS</dt><dd>${c.rate}</dd></dl>`;
  $("coach-equation").innerHTML =
    `<span class="label">GAIN RELATIVE TO NO COACHING</span><p class="formula">${c.eq}</p><p>${c.text}</p>`;
}
const facts = {
  plateau: {
    rows: [
      [
        "Universal adoption",
        "Rules it out",
        "With a strictly positive common hazard, y tends to 1.",
      ],
      [
        "Limited reach",
        "Allows it",
        "y tends to p < 1. The inaccessible share is explicit.",
      ],
      [
        "Unequal task hazards",
        "Allows it here",
        "The displayed model already includes limited reach. Heterogeneity alone, with all hazards positive and p = 1, does not lower the eventual plateau.",
      ],
      [
        "Adoption feedback",
        "Allows it here",
        "The plateau comes from p, not from feedback.",
      ],
    ],
    note: "A persistent low plateau favors a limited reachable set, but over finite horizons very slow adoption remains an alternative.",
  },
  acceleration: {
    rows: [
      [
        "Universal adoption",
        "Rules it out",
        "Growth is positive but decreasing from zero adoption.",
      ],
      [
        "Limited reach",
        "Rules it out",
        "A fixed p and constant hazard imply ẏ decreases with y.",
      ],
      [
        "Unequal task hazards",
        "Rules it out",
        "A positive mixture of exponential adoption curves is concave.",
      ],
      [
        "Adoption feedback",
        "Allows it",
        "Only when feedback is sufficiently strong: b > 1, early in the path.",
      ],
    ],
    note: "Unobserved changes in opportunity or technology could also produce acceleration. They are held fixed in this comparison.",
  },
  jump: {
    rows: [
      [
        "Expand reach",
        "No literal jump",
        "The adoption process is continuous, although the slope changes immediately.",
      ],
      [
        "Raise hazard",
        "No literal jump",
        "A finite change in the hazard changes the slope, not the state.",
      ],
      [
        "Shift current adoption",
        "Allows it",
        "The intervention directly changes the state by J.",
      ],
    ],
    note: "Measurements spaced weeks apart cannot establish a mathematical discontinuity. Rapid adjustment can look like a jump.",
  },
  persistent: {
    rows: [
      ["Expand reach", "Allows it", "The long-run effect equals Δp > 0."],
      [
        "Raise hazard",
        "Rules it out alone",
        "Both trajectories converge to the same p. The gain is one of timing.",
      ],
      [
        "Shift current adoption",
        "Rules it out alone",
        "The initial lead disappears when the counterfactual catches up.",
      ],
    ],
    note: "A gain that lasts through a short follow-up is not yet evidence of a permanent change in the plateau.",
  },
};
function renderFact() {
  const f = facts[$("fact").value];
  $("fact-result").innerHTML =
    `<table><thead><tr><th>Specification</th><th>Implication</th><th>Reason</th></tr></thead><tbody>${f.rows.map((r) => `<tr><td>${r[0]}</td><td class="${r[1].startsWith("Allows") ? "yes" : "no"}">${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table><p class="note">${f.note}</p>`;
}
document.querySelectorAll("[data-model]").forEach(
  (b) =>
    (b.onclick = () => {
      model = b.dataset.model;
      document.querySelectorAll("[data-model]").forEach((x) => {
        x.classList.toggle("active", x === b);
        x.setAttribute("aria-pressed", String(x === b));
      });
      renderModel();
    }),
);
document.querySelectorAll("[data-coach]").forEach(
  (b) =>
    (b.onclick = () => {
      coach = b.dataset.coach;
      document.querySelectorAll("[data-coach]").forEach((x) => {
        x.classList.toggle("active", x === b);
        x.setAttribute("aria-pressed", String(x === b));
      });
      renderCoach();
    }),
);
$("view").onchange = () => {
  view = $("view").value;
  renderModel();
};
$("fact").onchange = renderFact;
$("derive").onclick = () => {
  const open = $("derivation-body").hidden;
  $("derivation-body").hidden = !open;
  $("derive").setAttribute("aria-expanded", String(open));
  $("derive").innerHTML =
    `${open ? "Hide" : "Show"} the derivation <span>${open ? "−" : "＋"}</span>`;
};
function render() {
  renderModel();
  renderCoach();
  renderFact();
}
let timer;
window.addEventListener("resize", () => {
  clearTimeout(timer);
  timer = setTimeout(render, 100);
});
render();
