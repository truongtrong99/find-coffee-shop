# Coding standards

Read during review. Mechanical rules are enforced by checks instead: `src/core/architecture.test.ts` keeps the Game Core free of React, three.js, zustand and app/content imports.

## The Game Core decides; the presentation shows

Every rule lives in `src/core` (ADR-0002). When the presentation needs a fact a rule decides (whether a Score Card is complete, whether Submit is allowed, whether a step is valid), the core exposes it on its state and the presentation reads it. A component or store that re-derives such a fact from raw state duplicates the rule and drifts from it.

## Test through the Game Core facade

Rules are tested only through the facade built by `createGameCore`: construct it with test content, an in-memory save store and a seeded random source, issue commands, advance the clock, and assert on observable state and the Reveal result. Internal modules (cooling, cupping, scoring) are never imported by tests, so they stay free to refactor. Expected values come from worked examples or the spec, never recomputed the way the code computes them.

## Speak the glossary

Code, test names and UI copy use the terms in `GLOSSARY.md`, and none of their _Avoid_ synonyms (e.g. Score Card, never "score sheet"; Player, never "user").
