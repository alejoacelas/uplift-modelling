# AI adoption: anatomy of a model

**[Open the interactive theory notebook](https://alejoacelas.github.io/uplift-modelling/).**

Explore which behavioral restrictions generate different functional forms, rather than calibrating parameter values. The notebook links application-level hazards to aggregate dynamics, derivations, time paths, phase diagrams, and observable restrictions.

Compare limited reach, universal adoption, unequal task hazards, and adoption feedback. Then distinguish coaching that expands reach, raises the hazard, or shifts current adoption. A final panel tests each specification against candidate stylized facts and explains identification limits.

Technology and task values are fixed. Curves illustrate mathematical shapes, not fitted estimates. The feedback model is a deterministic approximation. See the notebook for assumptions and normalization.

## Development

No build or dependencies. Serve with Python and test with Node:

```sh
python3 -m http.server 8876 --directory docs
node --test tests/*.test.mjs
```

`docs/forms.mjs` contains the current models; `docs/app.mjs` renders the notebook. GitHub Pages serves `docs/` from `main`. `docs/model.mjs` and its tests retain the earlier parameter explorer's mathematical implementation for reference; the current interface does not use it.
