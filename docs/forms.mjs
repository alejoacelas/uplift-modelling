// Dimensionless time: the reference adoption hazard is one.
export const P = 0.45;
export function curve(kind, t) {
  const p = kind === "universal" ? 1 : P;
  if (kind === "heterogeneous")
    return p * (1 - 0.5 * Math.exp(-0.25 * t) - 0.5 * Math.exp(-2 * t));
  if (kind === "feedback") {
    const b = 5,
      e = Math.exp(-(1 + b) * t);
    return (p * (1 - e)) / (1 + b * e);
  }
  return p * (1 - Math.exp(-t));
}
export function growth(kind, t) {
  const p = kind === "universal" ? 1 : P,
    y = curve(kind, t);
  if (kind === "heterogeneous")
    return p * (0.125 * Math.exp(-0.25 * t) + Math.exp(-2 * t));
  if (kind === "feedback") return (p - y) * (1 + (5 * y) / p);
  return p - y;
}
export function coached(kind, t) {
  const tc = 2,
    p = P,
    d = 0.3,
    k = 2,
    j = 0.04,
    y0 = p * (1 - Math.exp(-tc));
  if (t < tc) return p * (1 - Math.exp(-t));
  const s = t - tc;
  if (kind === "reach") return p * (1 - Math.exp(-t)) + d * (1 - Math.exp(-s));
  if (kind === "speed") return p - (p - y0) * Math.exp(-k * s);
  return p - (p - y0 - j) * Math.exp(-s);
}

export function logGap(kind, t) {
  if (kind === "heterogeneous")
    return Math.log(0.5 * Math.exp(-0.25 * t) + 0.5 * Math.exp(-2 * t));
  if (kind === "feedback")
    return Math.log(6) - 6 * t - Math.log1p(5 * Math.exp(-6 * t));
  return -t;
}
