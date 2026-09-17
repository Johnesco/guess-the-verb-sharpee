# 0001 — Layered parser defense, and where Chord stops

**Status:** Accepted — 2026-09-17
**Context:** [#1](https://github.com/Johnesco/guess-the-verb-sharpee/issues/1)

## Decision

Adopt the five-layer defense model from the Inform 7 sibling's `FINDINGS.md`
(`C:/code/text-games/i7/guess-the-verb-inform7/FINDINGS.md`) as this game's standard,
including its governing rule: **solve at the lowest layer possible.**

| Layer | Chord mechanism | Status here |
|---|---|---|
| 0: Nouns | `aka` lists on entities and scenery | supported |
| 1: Grammar | `extend action <name> / grammar` | supported |
| 2: Mistakes | hint-only story actions (the `using-alone` shape) | supported |
| 3: Custom actions | `define action` + a trait carrying the behaviour | supported |
| 4: Parser errors | `override message <alias>` | **action-scoped only** |

## Consequences

`override message` reaches a closed catalog of 742 aliases across 58 standard actions
(`@sharpee/chord/message-alias-catalog.js`). It accepts `, <strategy>` and a trailing
`while <condition>`, so a refusal can teach once and shorten after.

**True parser errors are outside it.** `parser.error.unknownVerb`,
`parser.error.entityNotFound` and their siblings
(`@sharpee/lang-en-us/data/messages.js:24-67`), and the `core.*` fallbacks in
`language-provider.js:69-82`, have no alias. At Chord 3.6.0 / engine 5.4.1 this game
cannot reword "I don't understand that." or the bare "You can't see any such thing."
that the parser itself emits. Layer 4 is therefore satisfied by making the *action*
refusals teach, and by pushing work down to layer 0 so the parser is reached less often.

**Clarification lines follow I7's convention** — `(digging the flower bed)`, never
`(understood as: digging)` — but only where a story action owns the redirect. A grammar
pattern that compiles to `going` cannot carry one: `means` takes exactly two bare words
(`@sharpee/chord/parser.js:4062-4082`), and a room's `on the player going` cannot tell
which phrasing was typed. So CLIMB STAIRS and GO UPSTAIRS move the player silently.
That is the one place this game knowingly diverges from the I7 behaviour.
