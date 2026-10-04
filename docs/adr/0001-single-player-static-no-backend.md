# Single-player, static site, no backend

Little Cuppers is single-player: every other Cupper at the table is an NPC Cupper, and progress is saved in browser local storage. It ships as a static site with no server, accounts, or cloud save. The original idea of "lots of characters cupping together" is met by a growing cast of NPC Cuppers rather than real online players, because real-time multiplayer (rooms, sync, hosting) would multiply the scope several times over for a first version.

## Consequences

Adding online multiplayer or cloud saves later means introducing a backend and reworking how Attempts and progress are owned, so it's a deliberate rebuild, not a toggle.
