# AI uplift model lab

An interactive explainer of persistent differences in AI adoption and the effects of coaching. Open **[the explainer](https://alejoacelas.github.io/uplift-modelling/)**.

The model gives each person a reachable share of applications, `p`. Reachable applications are adopted at a common constant hazard. Coaching expands that share without changing the hazard. The explainer includes expected and simulated trajectories, cumulative benefits, an alternative model with universal eventual adoption, and explicit assumptions about coaching responsiveness.

These are illustrative hypotheses, not estimates from data. AI capabilities and tasks stay fixed. Applications have equal value in the simulation, adoption is permanent, and benefits add up.

## Run locally

Requires Python 3 for serving and Node.js for tests. No build or dependencies.

```sh
python3 -m http.server 8765 --directory docs
node --test tests/model.test.mjs
```

Open http://localhost:8765. Settings can be shared in the URL using the button at the bottom. `docs/model.mjs` contains the equations and seeded simulation; `docs/app.mjs` renders the interactive views. GitHub Pages serves `docs/` from `main`.
