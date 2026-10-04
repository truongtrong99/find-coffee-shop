# Little Cuppers

A cute single-player 3D browser game about coffee cupping. See `GLOSSARY.md` for the domain language and `docs/adr/` for architecture decisions.

## Development

```
npm install
npm run dev        # run the game locally
npm test           # Game Core facade tests
npm run typecheck
npm run build      # static site in dist/
```

The Game Core (`src/core`) is plain TypeScript and is tested only through its facade. The React Three Fiber layer (`src/app`) renders core state and passes elapsed time in; it never decides rules or timing.
