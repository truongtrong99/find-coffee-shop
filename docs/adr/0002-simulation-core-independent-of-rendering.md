# Simulation core is independent of rendering

All game rules (Cup Temperature and cooling, Accuracy Windows, Tasting Cue generation, NPC Cupper behaviour and remarks, Calibration Points and Stars) live in a plain TypeScript core with no React or three.js imports, advanced by an explicit game clock. The React Three Fiber layer only renders that state and sends Player actions into it. We chose this so the rules can be test-driven without a browser, visuals and 3D models can be swapped without touching game logic, and the speed-up control is just a faster clock.

## Consequences

Tempting shortcuts, like letting a three.js animation or `useFrame` loop decide when a cup has cooled or when an NPC slurps, are off-limits: timing comes from the core's clock, and the scene follows it.
