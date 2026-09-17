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

**An action-level override only fires for a thing already in scope.** Probing all
sixteen aliases this game first shipped showed five that can never fire:
`examining-cant-see`, `examining-not-visible`, `examining-nothing-special`,
`searching-not-visible` and `taking-cannot-take`. An unknown or out-of-scope noun fails
in the *parser*, before any action runs, so the "you can't see that" family is
unreachable by construction — and `going-no-exit` never fires either, because
`going-no-exit-that-way` gets there first. Those six were removed; eleven remain, each
proven to fire and each exercised by the tests document. The practical consequence is
the I7 finding restated: **for an unknown noun the only defense is layer 0.** Every noun
in player-visible text must be a real alias, because nothing downstream can rescue it.

**Clarification lines follow I7's convention** — `(digging the flower bed)`, never
`(understood as: digging)` — but only where a story action owns the redirect. A grammar
pattern that compiles to `going` cannot carry one: `means` takes exactly two bare words
(`@sharpee/chord/parser.js:4062-4082`), and a room's `on the player going` cannot tell
which phrasing was typed. So CLIMB STAIRS and GO UPSTAIRS move the player silently.
That is the one place this game knowingly diverges from the I7 behaviour.

## Keeping layer 0 honest

The noun layer cannot be spot-checked, because a missing alias looks exactly like a word
the author never thought of. Two sweeps run against the story source and are kept as
branches of the tests document:

1. **Alias sweep.** Every `aka` entry is examined in the room where its thing is in
   scope, and compared against that thing's *own* canonical response. A word that
   resolves to the wrong entity fails as loudly as one that resolves to nothing, which
   is what catches the disambiguation hazard I7's findings warn about. 267 aliases,
   all exact, no ambiguity prompts.
2. **Prose sweep.** Every candidate noun in player-visible text — room descriptions and
   the descriptions of the things in them — is examined in that room. The first run left
   131 words unresolved; triage found 19 real nouns among them (`windows`, `doors`,
   `numbers`, `seams`, `shadows`, `collar`, `studs`, `cavity`, `lock`, `grandmother`,
   `handwriting`, `lavender`, `base`, `bumps` and the recipe's ingredients). The rest are
   verbs, adjectives and prepositions, and the residue is reviewed rather than asserted.

`numbers` is the one to notice: the fireplace puzzle's whole clue is "numbers scratched
into the soot-blackened surface", and until this sweep `x numbers` answered "You can't
see any such thing."
