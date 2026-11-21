# Universe

**An interactive 3D exploration of space, scale, and scientific uncertainty.**

Universe is a work-in-progress visualization project that explores space across enormous scales. Its guiding principle is to distinguish established scientific information from estimates, theory, unknown regions, and procedural simulation.

## What this project explores

- Interactive 3D visualizations of astronomical subjects
- The challenge of representing vastly different scales
- Clear separation between known science and simulated or uncertain material
- Exploration-oriented interfaces and reusable visualization components

## Technology and structure

This is a Node.js workspace-based project, with applications under `apps/` and shared packages under `packages/`. The repository currently defines dedicated core, engine, data, and Three.js rendering packages.

For technical details, inspect the workspace manifests and source code. The application is under active development; this document does not claim that all planned features are complete.

## Getting started

Prerequisites: Node.js and npm.

```bash
git clone https://github.com/Aarish-khatib/Universe.git
cd Universe
npm install
npm run dev
```

The root development script starts the configured application workspaces. Follow the addresses printed by the development servers.

## Verification

```bash
npm test
npm run check:packages
npm run check
```

- `npm test` runs the project's Vitest suite.
- `npm run check:packages` type-checks shared packages.
- `npm run check` runs tests, package checks, workspace lint tasks where defined, and workspace builds.

These commands are documented from the repository scripts. They have not been independently executed as part of this documentation update.

## Scientific accuracy

A visual representation is not automatically a measured scientific fact. Universe treats observational evidence, estimates, theoretical descriptions, unknowns, and procedural simulation as different categories. Users should verify scientific claims against primary references rather than treat an exploratory rendering as a scientific source.

## Status and next steps

**Status:** Active development.

Priorities include verified demos and screenshots, clearly documented interaction controls, tests for important interactions, and citations for scientific datasets. Specific availability should be verified against the current source.

---

Created by [Aarish](https://github.com/Aarish-khatib).
