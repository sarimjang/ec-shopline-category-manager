# Project Overview

- Project: Shopline Category Manager Userscript (Greasemonkey/Tampermonkey)
- Purpose: Adds a “Move To” dropdown button to Shopline admin category pages to quickly move categories without drag-and-drop.
- Status: Completed (per PROJECT_OVERVIEW.md), version around 0.2.x; primary implementation in `src/shopline-category-manager.user.js`.
- Runtime context: Runs in Shopline admin category pages (`/admin/*/categories*`) with AngularJS + angular-ui-tree.

## Core Features
- Injects “Move To” button per category row.
- Hierarchy-aware dropdown targets (exclude self/descendants, max depth level 3).
- Two move strategies: primary AngularJS `$scope` update; fallback DragEvent simulation.
- Success/error toast feedback; auto-save to backend.

## Rough Structure
- `src/shopline-category-manager.user.js`: main userscript implementation.
- `src/shopline-category-manager.test.js`: node-run tests for core logic helpers.
- `src/README.md`: API/logic docs and test instructions.
- Root docs: quick start, test guide, implementation plan, reports, etc.
- `openspec/`: change specs and proposal history.

## OpenSpec Instruction
- When request mentions plan/proposal/spec/change/architecture or is ambiguous, open `openspec/AGENTS.md` first.