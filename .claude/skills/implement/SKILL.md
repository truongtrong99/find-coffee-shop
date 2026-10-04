---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Before starting, note the current commit as the review's fixed point.

Once done, commit your work to the current branch, then use /code-review against that fixed point. Commit any fixes from the review on top.
