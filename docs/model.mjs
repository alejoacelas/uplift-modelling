export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const rate = (h) => Math.LN2 / h;
export function baseline(t, { V, p, h }) {
  return V * p * -Math.expm1(-rate(h) * Math.max(0, t));
}
export function uplift(t, { V, p, d, h, tc }) {
  return V * Math.min(d, 1 - p) * -Math.expm1(-rate(h) * Math.max(0, t - tc));
}
export function total(t, s) {
  return baseline(t, s) + uplift(t, s);
}
export function cumulative(t, { V, p, d, h, tc }) {
  const u = Math.max(0, t - tc),
    l = rate(h);
  return V * Math.min(d, 1 - p) * (u + Math.expm1(-l * u) / l);
}
export function response(p, k, rule) {
  return rule === "fixed"
    ? Math.min(k, 1 - p)
    : rule === "remaining"
      ? k * (1 - p)
      : k * p * (1 - p);
}
export function random(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function tasks(s) {
  const rnd = random(s.seed),
    order = Array.from({ length: 100 }, (_, i) => i);
  for (let i = 99; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const n = Math.round(s.p * 100),
    m = Math.round(Math.min(s.d, 1 - s.p) * 100);
  return order.map((id, i) => ({
    id,
    kind: i < n ? "original" : i < n + m ? "new" : "outside",
    time:
      i < n
        ? -Math.log(1 - rnd()) / rate(s.h)
        : i < n + m
          ? s.tc - Math.log(1 - rnd()) / rate(s.h)
          : Infinity,
  }));
}
export function realised(t, s, ts, coached = true) {
  return (
    (ts.filter((x) => x.time <= t && (coached || x.kind === "original"))
      .length *
      s.V) /
    100
  );
}
