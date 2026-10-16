import test from "node:test";
import assert from "node:assert/strict";
import {
  baseline,
  uplift,
  total,
  cumulative,
  tasks,
  realised,
  response,
  rate,
} from "../docs/model.mjs";
const s = { V: 10, p: 0.25, d: 0.3, h: 1.5, tc: 4, H: 12, seed: 27 };
const near = (a, b, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);
test("initial conditions, half-time, asymptotes, and coaching timing", () => {
  near(total(0, s), 0);
  near(baseline(s.h, s), (s.V * s.p) / 2);
  near(uplift(s.tc, s), 0);
  near(uplift(s.tc + s.h, s), (s.V * s.d) / 2);
  near(total(1000, s), s.V * (s.p + s.d));
  near(uplift(3, s), 0);
  near(total(10, { ...s, p: 1, d: 0 }), baseline(10, { ...s, p: 1 }));
});
test("cumulative benefit integrates the flow difference", () => {
  const t = 10,
    dt = 1e-5;
  near(
    (cumulative(t + dt, s) - cumulative(t - dt, s)) / (2 * dt),
    uplift(t, s),
    1e-7,
  );
  near(cumulative(3, s), 0);
  assert.ok(cumulative(4.00001, s) >= 0);
});
test("coaching temporarily raises slope without changing half-time", () => {
  const dt = 1e-5;
  near(uplift(s.tc + dt, s) / dt, s.V * s.d * rate(s.h), 1e-5);
  assert.ok(uplift(100, s) - uplift(99, s) < 1e-10);
});
test("coupled simulation preserves original clocks, binary adoption, and exact reachable counts", () => {
  const a = tasks(s),
    b = tasks({ ...s, d: 0 });
  assert.equal(a.length, 100);
  assert.equal(new Set(a.map((x) => x.id)).size, 100);
  assert.equal(a.filter((x) => x.kind === "original").length, 25);
  assert.equal(a.filter((x) => x.kind === "new").length, 30);
  for (const t of a.filter((x) => x.kind === "original"))
    near(t.time, b.find((x) => x.id === t.id).time);
  for (const t of a.filter((x) => x.kind === "new")) assert.ok(t.time >= s.tc);
  near(realised(3, s, a), realised(3, s, a, false));
  near(realised(1000, s, a), 5.5);
  assert.deepEqual(a, tasks(s));
});
test("ensemble of binary task paths agrees with analytic expectation", () => {
  let sum = 0;
  const n = 5000;
  for (let seed = 1; seed <= n; seed++)
    sum += realised(6, { ...s, seed }, tasks({ ...s, seed }));
  near(sum / n, total(6, s), 0.03);
});
test("response rules remain feasible, with different targeting predictions", () => {
  for (let p = 0; p <= 1; p += 0.01)
    for (const r of ["fixed", "remaining", "middle"]) {
      const d = response(p, 0.4, r);
      assert.ok(d >= 0 && d <= 1 - p + 1e-12);
    }
  near(response(0.5, 0.4, "middle"), 0.1);
  assert.ok(response(0.1, 0.4, "remaining") > response(0.8, 0.4, "remaining"));
  near(response(0.1, 0.4, "fixed"), response(0.5, 0.4, "fixed"));
});
