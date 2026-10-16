# AI uplift model

## Core decisions

- [Represent persistent differences through reachable applications](#reachable-applications), with a common adoption hazard.
- [Model coaching as expanding reach](#coaching), and expose responsiveness as a separate assumption.

## Details

### Reachable applications

Each person has one parameter, p: the fraction of available applications within reach under their current approach. Reachable applications have a common constant adoption hazard. This permits persistent low adoption instead of assuming everyone eventually captures the same opportunity. Hold technology fixed for the modeled interval. The task simulation uses 100 equal-value applications with permanent, binary adoption.

### Coaching

Coaching expands p without changing the hazard. It can represent changes in approach, confidence, or workflows; it is not defined as teaching one task. The expansion produces a temporary increase in growth followed by a higher plateau. Keep assumptions about who responds most explicit: the model does not infer coaching responsiveness from current adoption. Show expected trajectories separately from sampled adoption histories.

## Decision log

- 2026-10-16: Implement the reachable-share model and a separate responsiveness explorer in [580f413](https://github.com/alejoacelas/uplift-modelling/commit/580f413), following the discussion’s emphasis on persistent low adoption, fixed technology, and coaching that raises the plateau without permanently changing adoption speed.
