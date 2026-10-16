import test from "node:test";
import assert from "node:assert/strict";
import { P, curve, growth, coached } from "../docs/forms.mjs";
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
test("solutions satisfy their laws of motion and limits", () => {
  for (const kind of ["universal", "restricted", "heterogeneous", "feedback"]) {
    near(curve(kind, 0), 0);
    near(curve(kind, 1000), kind === "universal" ? 1 : P);
    for (const t of [0.1, 0.5, 1, 3]) {
      const d = 1e-5;
      near(
        (curve(kind, t + d) - curve(kind, t - d)) / (2 * d),
        growth(kind, t),
      );
    }
  }
});
test("only strong feedback has accelerating growth in displayed forms", () => {
  for (const k of ["universal", "restricted", "heterogeneous"])
    assert.ok(growth(k, 0.2) < growth(k, 0));
  assert.ok(growth("feedback", 0.1) > growth("feedback", 0));
});
test("intervention continuity, slopes, and long-run effects", () => {
  const eps = 1e-7;
  for (const k of ["reach", "speed"])
    near(coached(k, 2 + eps), coached(k, 2 - eps));
  near(coached("stock", 2) - curve("restricted", 2), 0.04);
  near(coached("reach", 1000) - curve("restricted", 1000), 0.3);
  for (const k of ["speed", "stock"])
    near(coached(k, 1000) - curve("restricted", 1000), 0);
  assert.ok(
    (coached("stock", 2 + eps) - coached("stock", 2)) / eps <
      growth("restricted", 2),
  );
});
test("intervention effects match analytic formulas", () => {
  for (const s of [0, 0.5, 2, 5]) {
    const b = curve("restricted", 2 + s),
      gap = P - curve("restricted", 2);
    near(coached("reach", 2 + s) - b, 0.3 * (1 - Math.exp(-s)));
    near(coached("speed", 2 + s) - b, gap * (Math.exp(-s) - Math.exp(-2 * s)));
    near(coached("stock", 2 + s) - b, 0.04 * Math.exp(-s));
  }
});

test("state jumps remain inside the reachable set", () => {
  for (const t of [2, 2.1, 3, 6]) {
    assert.ok(coached("stock", t) <= P);
    assert.ok(coached("stock", t) >= curve("restricted", t));
  }
});
