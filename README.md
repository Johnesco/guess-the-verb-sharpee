# Guess the Verb (Sharpee)

A Sharpee game about reducing guess-the-verb frustration. Explore your grandmother's old house using natural language.

Play it on IF Hub: https://johnesco.github.io/ifhub/app.html?game=guess-the-verb-sharpee

Written in [Chord](https://sharpee.net/chord/) for the [Sharpee](https://sharpee.net) engine. The whole game is `guess-the-verb-sharpee.story`. It is a translation of the TypeScript edition (kept in `legacy/`), which was itself a port of the Inform 7 original. Six rooms, seven puzzles, ten points, and about fifty synonyms so that whatever you type first has a good chance of working.

## Building

This game is built and published from the Sharpee workspace, which holds the shared tooling:

```
npx sharpee play                                           # play in the terminal
npx sharpee test                                           # replay guess-the-verb-sharpee.tests.json
python ../tools/build.py guess-the-verb-sharpee --force    # gates, build, tests, lay out the hub folder
python C:/code/ifhub/tools/ship.py guess-the-verb-sharpee  # publish and list on IF Hub
```

## Walkthrough

look under doormat, take iron key, unlock front door with iron key, open front door,
east, search overcoat, east, open desk, take winding key, push painting,
light fireplace, open safe, take clock spring, west, south, south, take trowel,
dig flower bed, take brass mechanism, north, north, up, take music box,
put mechanism in music box, put spring in music box, wind music box, open trunk,
take locket.
