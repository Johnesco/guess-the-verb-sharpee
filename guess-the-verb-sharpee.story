## Guess the Verb — explore your grandmother's old house and find the family
## heirloom she left behind. Every room tests a different verb pattern.
##
## Chord edition, translated from the TypeScript original (now in legacy/src/)
## on 2026-09-08. The TypeScript registered 48 verb synonyms and 138 grammar
## patterns by hand; here they are `extend action` lines on the standard verbs
## and a handful of story verbs dispatched through traits.

story
  title: Guess the Verb
  authors:
    John Googol
  id: guess-the-verb-sharpee
  story-version: 2.0.0
  ifid: FAC4319E-8264-40C3-B867-8DD4206E5CEE
  description: Explore your grandmother's old house and find the family heirloom she left behind. Every room tests a different verb pattern.
  themes: modern-dark, retro-terminal, paper, system-6
  use scoring
  score iron-key worth 1
  score matchbook-found worth 1
  score fireplace-lit worth 1
  score safe-opened worth 1
  score mechanism-found worth 1
  score music-box-wound worth 2
  score winding-key worth 1
  score locket-found worth 2

## ===========================================================================
## ROOMS
## ===========================================================================

create the Front Porch
  a room
  aka porch
  east to the Hallway through the front door

  A sagging wooden porch wraps around the front of the house. A woven doormat
  lies before the front door. A tarnished brass doorbell is set beside the
  frame.

  The front door leads inside to the east.

create the Hallway
  a room
  aka hall, dim hallway
  east to the Study
  south to the Kitchen
  up to the Attic

  A dim hallway with faded wallpaper and creaking floorboards. A coat rack
  stands by the door with an old overcoat hanging from it.

  Doors lead east to a study and south to the kitchen. A narrow staircase
  leads up.

create the Study
  a room
  aka wood-paneled study, paneled study

  A wood-paneled study with built-in bookshelves. A heavy desk sits in the
  center, its drawers shut. An oil painting of a woman hangs on the far wall.
  A stone fireplace squats in the corner, cold and dark.

  The hallway is back to the west.

create the Kitchen
  a room
  aka rustic kitchen
  south to the Garden

  A rustic kitchen with stone counters and a deep ceramic sink. Copper pots
  hang from hooks above. A handwritten recipe card sits on the counter.

  The hallway is north. A doorway leads south to the garden.

create the Garden
  a room
  aka overgrown garden

  An overgrown garden behind the house. A flower bed runs along the back
  wall, thick with weeds. A small shed leans in one corner with its door
  ajar. A rusty trowel leans against the shed.

  The kitchen doorway is back to the north.

create the Attic
  a room
  aka cramped attic

  A cramped attic under sloping eaves, thick with dust. A dusty shelf holds
  an old music box. A heavy steamer trunk sits against the wall.

  The stairs lead back down.

## ===========================================================================
## THE PLAYER
## ===========================================================================

create the visitor
  a person
  playable
  aka me, myself, self
  starts in the Front Porch

  As good-looking as ever.

## ===========================================================================
## FRONT PORCH
## ===========================================================================

create the front door
  a door, lockable with the iron key, knockable
  aka oak door, door, keyhole, heavy door, old-fashioned keyhole, green paint, peeling paint

  A heavy oak door with peeling green paint and an old-fashioned keyhole.

create the woven doormat
  aka mat, rug, welcome mat, doormat, corner, welcome
  hides-the-key
  in the Front Porch
  states: flat, lifted

  A faded doormat reading 'WELCOME'. One corner is curled up -- something
  glints underneath.

  on the player taking
    refuse when the woven doormat is lifted: key-already
  end on

  after the player taking
    change the woven doormat to lifted
    move the woven doormat to the Front Porch
    move the iron key to the Front Porch
    award iron-key
    phrase key-found
  end after

  on the player searching
    refuse when the woven doormat is lifted: key-already
    change the woven doormat to lifted
    move the iron key to the Front Porch
    award iron-key
    phrase key-found
  end on

create the iron key
  aka old key, heavy key, house key, key

  A heavy iron key, dark with age.

create the brass doorbell
  aka bell, button, buzzer, door bell, doorbell, door frame, tarnished doorbell, frame
  scenery, ringable
  in the Front Porch

  A tarnished brass button set into the door frame.

  on the player pushing
    refuse doorbell-push
  end on

  on the player pulling
    refuse pull-button
  end on

create the sagging porch
  aka boards, railing, wooden porch, front porch, paint, old paint
  scenery
  in the Front Porch

  Weathered boards that sag under your weight. The paint peeled away long
  ago.

create the old house
  aka house, home, facade, front of the house, windows, window
  scenery
  in the Front Porch

  Your grandmother's house, shut up for a season. The windows are dark and
  the porch sags, but the place is sound.

## ===========================================================================
## HALLWAY
## ===========================================================================

create the coat rack
  aka rack, hook, hooks, stand, wooden rack
  scenery
  in the Hallway

  A wooden coat rack, slightly tilted. An old overcoat hangs from one hook.

  on the player searching
    refuse when the player holds the matchbook: matchbook-already
    move the matchbook to the visitor
    award matchbook-found
    phrase matchbook-found
  end on

create the old overcoat
  aka coat, jacket, overcoat, wool coat, dusty coat, pockets, pocket, moth-eaten coat
  scenery
  in the Hallway

  A moth-eaten wool overcoat. The pockets look like they might hold
  something.

  on the player taking
    refuse overcoat-take
  end on

  on the player wearing
    refuse wear-overcoat
  end on

  on the player searching
    refuse when the player holds the matchbook: matchbook-already
    move the matchbook to the visitor
    award matchbook-found
    phrase matchbook-found
  end on

create the matchbook
  aka matches, book of matches, small book

  A small book of matches from 'The Golden Lantern.' A few matches remain.

create the narrow staircase
  aka stairs, staircase, steps, stair, wooden staircase, shadows
  scenery, climbable
  in the Hallway

  A wooden staircase with groaning steps. It leads up into shadows.

  on the player climbing
    refuse climb-stairs
  end on

create the faded wallpaper
  aka wallpaper, wall, walls, paper, floral pattern, pattern, seams, seam
  scenery
  in the Hallway

  Yellowed wallpaper with a faded floral pattern, peeling at the seams.

create the creaking floorboards
  aka floor, floorboard, boards, floorboards
  scenery, plural
  in the Hallway

  Dark wooden floorboards that creak underfoot.

create the inner doors
  aka doors, study door, kitchen door, inner door
  scenery, plural
  in the Hallway

  Two plain doors off the hallway: the study to the east, the kitchen to the
  south. Both stand open.

## ===========================================================================
## STUDY
## ===========================================================================

create the study bookshelves
  aka bookshelves, bookshelf, shelves, books, book, volumes, volume
  scenery, plural
  in the Study

  Floor-to-ceiling shelves packed with dusty volumes. Nothing stands out.

create the heavy desk
  aka desk, drawers, drawer, mahogany desk, handles, handle, brass handles, center, centre
  scenery, a container, openable
  in the Study

  A mahogany desk with brass handles.

  on the player taking
    refuse desk-heavy
  end on

  on the player examining
    phrase desk-closed when the heavy desk is closed
      A mahogany desk with brass handles. The drawers are closed.
    phrase desk-open when the heavy desk is open
      A mahogany desk with brass handles. The drawers are open.
  end on

create the winding key
  aka butterfly key, small key, delicate key
  in the heavy desk

  A small key shaped like a butterfly, clearly meant for winding something
  delicate.

  after the player taking, once
    award winding-key
  end after

create the oil painting
  aka painting, portrait, picture, frame, woman, grandmother, stern woman, collar, high collar
  scenery, pushable, pullable, hides-the-safe
  in the Study
  states: hung, aside

  A portrait of a stern woman in a high collar -- your grandmother, perhaps.
  The frame sits slightly askew on the wall.

  on the player pushing
    refuse when the oil painting is aside: painting-already
  end on

  after the player pushing
    phrase painting-moved
    move the wall safe to the Study
    change the oil painting to aside
  end after

  on the player pulling
    refuse when the oil painting is aside: painting-already
  end on

  after the player pulling
    phrase painting-moved
    move the wall safe to the Study
    change the oil painting to aside
  end after

  on the player turning
    refuse when the oil painting is aside: painting-already
  end on

  after the player turning
    phrase painting-moved
    move the wall safe to the Study
    change the oil painting to aside
  end after

create the wall safe
  aka safe, iron safe, combination, dial, dials, lock, combination lock, three-dial lock, safe door
  scenery, a container, openable, dialable
  states: sealed, dialed

  A small iron safe set into the wall. It has a three-dial combination lock.

  on the player taking
    refuse safe-embedded
  end on

  on the player turning
    refuse when the wall safe is dialed: safe-already
    refuse when the stone fireplace is cold: safe-no-combo
    change the wall safe to dialed
    award safe-opened
    phrase safe-dialed
  end on

  on the player opening
    refuse when the wall safe is sealed and the stone fireplace is cold: safe-no-combo
    phrase safe-auto-open when the wall safe is sealed
    change the wall safe to dialed when the wall safe is sealed
    award safe-opened
  end on

create the clock spring
  aka spring, coiled spring, metal spring, coil
  in the wall safe

  A tightly coiled metal spring, the kind found inside clockwork.

create the stone fireplace
  aka fireplace, hearth, grate, fire, logs, log, chimney, flames, flame, firelight, corner
  scenery, lightable
  in the Study
  states: cold, burning

  A wide stone fireplace with old logs in the grate, ready to burn. The
  hearthstone is blackened with soot.

  on the player examining
    phrase fireplace-cold when the stone fireplace is cold
      A wide stone fireplace with old logs in the grate, ready to burn. The
      hearthstone is blackened with soot.
    phrase fireplace-burning when the stone fireplace is burning
      The fireplace crackles with warm flames. The logs glow orange.
  end on

create the hearthstone
  aka hearth stone, soot, flat stone, broad stone, numbers, number, base
  scenery
  in the Study

  A broad flat stone at the base of the fireplace, blackened with soot. Hard
  to make out any detail.

  on the player examining
    phrase hearthstone-dark when the stone fireplace is cold
      A broad flat stone at the base of the fireplace, blackened with soot.
      Hard to make out any detail.
    phrase hearthstone-lit when the stone fireplace is burning
      In the firelight, you can make out numbers scratched into the
      hearthstone: 7 - 3 - 9.
  end on

create the wood paneling
  aka paneling, panels, panel, wood, far wall, wall, walls
  scenery
  in the Study

  Dark wood panels line the walls, polished but dusty.

## ===========================================================================
## KITCHEN
## ===========================================================================

create the stone counters
  aka counter, countertop, countertops
  scenery, plural
  in the Kitchen

  Heavy stone countertops, cracked but solid.

create the ceramic sink
  aka sink, faucet, tap, basin, farmhouse sink, brass faucet
  scenery
  in the Kitchen

  A deep farmhouse sink with a brass faucet. It drips slowly.

  on the player turning
    refuse turn-sink
  end on

create the copper pots
  aka pots, pans, pot, pan, iron hooks, hooks, hook
  scenery, plural
  in the Kitchen

  Tarnished copper pots hanging from iron hooks. Decorative now.

create the recipe card
  aka recipe, card, note, handwritten, handwriting, lavender, shortbread, butter, sugar, flour, ingredients
  scenery, readable
  in the Kitchen

  Your grandmother's handwriting: 'Lavender shortbread -- butter, sugar,
  flour, and dried lavender from the garden.' The card is stained and
  well-loved.

  on the player reading
    phrase recipe-text
      Lavender shortbread -- butter, sugar, flour, and dried lavender from
      the garden.
  end on

create the kitchen doorway
  aka doorway, south doorway, garden doorway
  scenery
  in the Kitchen

  An open doorway to the south, letting in green light from the garden.

## ===========================================================================
## GARDEN
## ===========================================================================

create the flower bed
  aka bed, flowers, weeds, soil, dirt, earth, ground, back wall, wall
  scenery, diggable with the garden trowel
  in the Garden
  states: packed, dug

  A raised bed of dark soil tangled with dead weeds. The earth looks soft --
  someone was digging here recently.

  on the player digging
    refuse when the flower bed is dug: dig-already
    the player must hold the garden trowel: dig-need-tool
    change the flower bed to dug
    move the brass mechanism to the Garden
    award mechanism-found
    phrase dig-found
  end on

create the garden trowel
  aka trowel, spade, shovel, tool, short-handled trowel, rusty trowel
  in the Garden

  A short-handled garden trowel, rusty but solid.

create the brass mechanism
  aka mechanism, gears, gear, clockwork, innards, drum, pins, pin, brass thing, tiny drum, bumps, raised bumps

  A small brass mechanism -- gears, pins, and a tiny drum with raised bumps.
  The innards of a music box.

create the garden shed
  aka shed, shack, shed door, cobwebs, roof, sagging roof, corner, shelves, empty shelves
  scenery
  in the Garden

  A small wooden shed with a sagging roof. The door hangs open, revealing
  empty shelves and cobwebs inside.

create the house behind
  aka house, home, back of the house, rear, windows, window
  scenery
  in the Garden

  The back of the house, its windows blank. The kitchen doorway is the way
  back in, to the north.

create the garden doorway
  aka doorway, kitchen doorway, north doorway
  scenery
  in the Garden

  The kitchen doorway, standing open to the north.

## ===========================================================================
## ATTIC
## ===========================================================================

create the dusty shelf
  aka shelf, plank, studs, wall studs
  scenery, a supporter
  in the Attic

  A rough plank shelf nailed to the wall studs.

  on the player taking
    refuse shelf-nailed
  end on

create the old music box
  aka box, music box, wooden box, lid, rose-carved lid, keyhole, melody, tune, cavity
  a container, windable, repairable
  on the dusty shelf

  A wooden music box with a rose-carved lid and a small keyhole on the side.

  on the player examining
    phrase box-empty when not the old music box holds the brass mechanism and not the old music box holds the clock spring
      A wooden music box with a rose-carved lid and a small keyhole on the
      side. Inside, the cavity is empty -- the mechanism has been removed.
    phrase box-mechanism when the old music box holds the brass mechanism and not the old music box holds the clock spring
      A wooden music box with a rose-carved lid. The brass mechanism has been
      installed inside.
    phrase box-spring when the old music box holds the clock spring and not the old music box holds the brass mechanism
      A wooden music box with a rose-carved lid. The clock spring has been
      installed inside.
    phrase box-ready when the old music box holds the brass mechanism and the old music box holds the clock spring
      A wooden music box with a rose-carved lid. The mechanism and spring are
      installed inside, ready to be wound.
  end on

create the steamer trunk
  aka trunk, chest, old trunk, steamer, fittings, brass fittings, slot, heavy trunk, battered trunk, lock
  scenery, a container, openable
  in the Attic
  states: latched, released

  A battered steamer trunk with brass fittings.

  on the player taking
    refuse trunk-heavy
  end on

  on the player unlocking
    refuse unlock-trunk-hint
  end on

  on the player examining
    phrase trunk-latched when the steamer trunk is latched
      A battered steamer trunk with brass fittings. The lock has no keyhole
      -- just a small slot that looks mechanically connected to the shelf
      above.
    phrase trunk-released when the steamer trunk is released
      A battered steamer trunk with brass fittings. The lock has been
      released.
  end on

  on the player opening
    refuse when the steamer trunk is latched: unlock-trunk-hint
  end on

create the family locket
  aka locket, silver locket, heirloom, necklace, chain, photograph, photo, fine chain, tiny photograph, faded photograph, grandmother, woman, young woman
  in the steamer trunk

  A silver locket on a fine chain. Inside, a tiny photograph shows your
  grandmother as a young woman, smiling.

  after the player taking, once
    award locket-found
    phrase locket-found
    win victory
  end after

create the sloping eaves
  aka eaves, rafters, beams, ceiling, dust, wall, walls
  scenery, plural
  in the Attic

  Low rafters and dusty beams. You have to duck in places.

## ===========================================================================
## STORY VERBS — each dispatches through a trait on the thing it is for
## ===========================================================================

define trait hides-the-key
  on the player peeking
    refuse when the woven doormat is lifted: key-already
    change the woven doormat to lifted
    move the iron key to the Front Porch
    award iron-key
    phrase key-found
  end on
end trait

define trait hides-the-safe
  on the player peeking
    refuse when the oil painting is aside: painting-already
    change the oil painting to aside
    move the wall safe to the Study
    phrase painting-moved
  end on
end trait

define action peeking
  grammar
    look under the target
    look underneath the target
    look beneath the target
    search under the target
    search underneath the target
    search beneath the target
    check under the target
    look behind the target
    check behind the target
    search behind the target
  the target must be reachable
  otherwise refuse look-under-nothing

define trait ringable
  on the player ringing
    phrase ring-doorbell
  end on
end trait

define action ringing
  grammar
    ring the target
  the target must be reachable
  otherwise refuse ring-cant

define trait knockable
  on the player knocking
    phrase knock-door
  end on
end trait

define action knocking
  grammar
    knock the target
    knock on the target
    rap the target
    rap on the target
  the target must be visible
  otherwise refuse knock-nothing

define trait lightable
  on the player lighting
    refuse when it is burning: fire-already
    the player must hold the matchbook: fire-no-matches
    change it to burning
    award fireplace-lit
    phrase fire-lit
  end on
end trait

define action lighting
  grammar
    light the target
    burn the target
    kindle the target
    ignite the target
    start the target
    switch on the target
    turn on the target
    light the target with the tool
    the tool is an instrument
  the target must be reachable
  otherwise refuse burn-cant

define trait dialable
  on the player dialing
    refuse when it is dialed: safe-already
    refuse when the stone fireplace is cold: safe-no-combo
    change it to dialed
    award safe-opened
    phrase safe-dialed
  end on
end trait

define action dialing
  grammar
    dial the target
    open the target with the combination
    enter the combination on the target
  the target must be reachable
  otherwise refuse dial-no-safe

define trait windable
  on the player winding
    refuse when the steamer trunk is released: wind-again
    the player must hold the winding key: wind-no-key
    it must hold the brass mechanism: wind-missing-mechanism
    it must hold the clock spring: wind-missing-spring
    change the steamer trunk to released
    award music-box-wound
    phrase wind-success
  end on
end trait

define action winding
  grammar
    wind the target
    wind up the target
    crank the target
    crank up the target
    wind the target with the tool
    wind up the target with the tool
    crank the target with the tool
    the tool is an instrument
  the target must be reachable
  otherwise refuse wind-wrong-target

define trait repairable
  on the player repairing
    phrase repair-complete when it holds the brass mechanism and it holds the clock spring
    phrase repair-need-spring when it holds the brass mechanism and not it holds the clock spring
    phrase repair-need-mechanism when it holds the clock spring and not it holds the brass mechanism
    phrase repair-need-both when not it holds the brass mechanism and not it holds the clock spring
  end on
end trait

define action repairing
  grammar
    fix the target
    repair the target
    assemble the target
    mend the target
  the target must be reachable
  otherwise refuse repair-not-broken

define action digging-here
  grammar
    dig
    dig here
    dig ground
  the player must be in the Garden: dig-nothing
  refuse when the flower bed is dug: dig-already
  the player must hold the garden trowel: dig-need-tool
  change the flower bed to dug
  move the brass mechanism to the Garden
  award mechanism-found
  phrase dig-here-found

define action discarding
  grammar
    discard the item
  the item must be visible
  phrase discard-hint

define action combining
  grammar
    combine the item with the other
  the item must be visible
  the other must be visible
  phrase combine-hint

define action using-alone
  grammar
    use the target
    try the target
  the target must be visible
  phrase use-hint

define action using-with
  grammar
    use the item on the other
    use the item with the other
    try the item on the other
  the item must be visible
  the other must be visible
  phrase use-with-hint

define action going-to
  grammar
    go to porch
    go to hallway
    go to hall
    go to study
    go to kitchen
    go to garden
    go to attic
    go to house
    go to upstairs
    go to downstairs
    go to the target
    walk to the target
    travel to the target
  phrase go-to-hint

define action talking-to
  grammar
    talk to grandmother
    talk to grandma
    talk to woman
    talk to her
    talk to someone
    talk to anyone
    speak to grandmother
    talk to the target
    speak to the target
    chat with the target
    talk with the target
  phrase talk-to-hint

define action washing
  grammar
    wash the target
    clean the target
    scrub the target
  the target must be reachable
  phrase wash-hint

define action cooking
  grammar
    cook
    bake
    make dinner
  phrase cook-hint

define action greeting
  grammar
    hello
    hi
    hey
    hello there
  phrase greeting-text

define action helping
  grammar
    help
    hint
    hints
    help me
    what can i do
  phrase help-text

define action listing-verbs
  grammar
    verbs
    commands
  phrase verbs-text

## ===========================================================================
## SYNONYMS FOR THE STANDARD VERBS
## ===========================================================================

extend action examining
  grammar
    inspect the target
    study the target
    view the target
    peruse the target
    browse the target
    flip the target
    browse through the target
    flip through the target
    leaf through the target
    read through the target
    check the target
    investigate the target
    look the target
    please examine the target
    please look at the target
    can i look at the target

extend action taking
  grammar
    grab the item
    collect the item
    acquire the item
    snag the item
    fetch the item
    obtain the item
    steal the item
    nab the item
    lift the item
    raise the item
    pick up the item
    pick the item up
    please take the item
    can i take the item
    can i have the item
    try to take the item

extend action looking
  grammar
    look around
    where am i
    where
    what is this
    what is this place
    examine room
    look at room
    describe room
    look at everything
    examine everything
    look at this room
    look at this place
    peek
    peer
    gaze

extend action inventory
  grammar
    what do i have
    what am i carrying
    what am i holding
    check inventory
    check items
    my inventory
    check my inventory
    check my items

extend action opening
  grammar
    pry the target
    force the target
    try to open the target
    please open the target
    can i open the target

extend action closing
  grammar
    please close the target

extend action pushing
  grammar
    press the target
    shove the target
    prod the target
    move the target
    slide the target
    please push the target

extend action pulling
  grammar
    yank the target
    drag the target
    please pull the target

extend action dropping
  grammar
    toss the item
    please drop the item

extend action searching
  grammar
    rummage the target
    rummage in the target
    rummage through the target
    look in the target
    look inside the target
    look on the target
    look on top of the target
    check the pockets of the target
    please search the target

extend action attacking
  grammar
    strike the target
    stab the target
    slash the target
    kick the target

extend action eating
  grammar
    consume the item
    devour the item

extend action wearing
  grammar
    don the item

extend action digging
  grammar
    dig in the target
    dig up the target
    excavate the target
    dig the target with the tool

extend action going
  grammar
    upstairs
      means direction up
    go upstairs
      means direction up
    ascend
      means direction up
    climb stairs
      means direction up
    climb staircase
      means direction up
    go up stairs
      means direction up
    downstairs
      means direction down
    go downstairs
      means direction down
    descend
      means direction down
    climb down
      means direction down
    go down stairs
      means direction down
    head north
      means direction north
    head south
      means direction south
    head east
      means direction east
    head west
      means direction west
    head up
      means direction up
    head down
      means direction down
    walk north
      means direction north
    walk south
      means direction south
    walk east
      means direction east
    walk west
      means direction west
    walk up
      means direction up
    walk down
      means direction down
    proceed north
      means direction north
    proceed south
      means direction south
    proceed east
      means direction east
    proceed west
      means direction west
    proceed up
      means direction up
    proceed down
      means direction down

extend action turning
  grammar
    rotate the target
    twist the target
    please turn the target

extend action climbing
  grammar
    scale the target

extend action inserting
  grammar
    attach the item to the container
    install the item in the container
    install the item into the container

## ===========================================================================
## LAYER 4 — TEACHING REFUSALS
## ===========================================================================
##
## The Inform 7 sibling rewrites the parser's five error classes so no refusal
## is a dead end (its FINDINGS.md, "Layer 4"). Chord cannot reach the parser's
## own text, but it can rewrite any standard action's refusal through the
## `override message` catalog, which is where most dead ends actually come
## from. Each line below names a next move. See docs/adr/0001.

override message taking-fixed-in-place
  {You} {can't} move {the item}. Try EXAMINE, SEARCH, LOOK UNDER or LOOK
  BEHIND it instead.
end override

override message taking-already-have
  {You} already {have} {the item}. Type I to see everything {you} {are}
  carrying.
end override

override message going-no-exit-that-way
  {You} {can't} go that way. Type LOOK to see the exits from here.
end override

override message searching-nothing-special
  {You} {find} nothing of interest. Try LOOK UNDER or LOOK BEHIND it.
end override

override message turning-cant-turn-that
  {You} {can't} turn {the target}. Try PUSH, PULL, OPEN or LOOK BEHIND
  instead.
end override

override message climbing-not-climbable
  {You} {can't} climb {the object}. To change rooms, use a compass direction
  or UP and DOWN.
end override

override message inserting-not-container
  {You} {can't} insert things into {the destination}. Try PUT it ON something,
  or find a thing that opens.
end override

override message opening-not-openable
  {You} {can't} open {the item}. Try SEARCH, LOOK UNDER or LOOK BEHIND it
  instead.
end override

override message opening-already-open
  {You} {have} already opened {the item}.
end override

override message eating-not-edible
  {You} {can't} eat {the item}. Nothing here is food.
end override

override message opening-locked
  {You} {find} {the item} locked. Try UNLOCK it WITH something {you} {are}
  carrying.
end override

## ===========================================================================
## TEXT
## ===========================================================================

define phrases en-US
  key-found:
    You lift the corner of the doormat and find an iron key hidden
    underneath.
  key-already:
    You already found the key here.
  painting-moved:
    You push the painting aside, revealing a small wall safe hidden behind
    it.
  painting-already:
    You already moved the painting. The wall safe is visible.
  look-under-nothing:
    You find nothing there.
  safe-no-combo:
    You don't know the combination yet.
  safe-already:
    The safe is already dialed open.
  safe-dialed:
    You dial 7... 3... 9. Click. The safe door is ready to swing open.
  safe-auto-open:
    Remembering the numbers on the hearthstone, you dial 7... 3... 9. Click.
  dial-no-safe:
    There's nothing here to dial.
  fire-already:
    The fire is already burning.
  fire-no-matches:
    You don't have anything to light the fire with.
  burn-cant:
    That won't catch. The fireplace in the study is the only thing here
    worth lighting.
  matchbook-found:
    You rummage through the overcoat's pockets and find a small book of
    matches from 'The Golden Lantern.'
  matchbook-already:
    You've already found the matchbook.
  dig-need-tool:
    You'd need a tool to dig properly.
  dig-already:
    You've already dug here and found the mechanism.
  dig-found:
    You dig into the soft earth with the trowel and uncover a small brass
    mechanism -- gears, pins, and a tiny drum with raised bumps. The innards
    of a music box.
  dig-here-found:
    (digging the flower bed)

    You dig into the soft earth with the trowel and uncover a small brass
    mechanism -- gears, pins, and a tiny drum with raised bumps. The innards
    of a music box.
  dig-nothing:
    There's nothing to dig here. The garden behind the house has soft earth.
  wind-wrong-target:
    You can't wind that.
  wind-no-key:
    You need a key to wind the music box.
  wind-missing-mechanism:
    The music box is still missing its mechanism. It can't be wound yet.
  wind-missing-spring:
    The music box is still missing its spring. It can't be wound yet.
  repair-complete:
    The music box has both the mechanism and the spring installed. Try
    winding it.
  repair-need-spring:
    The mechanism is installed. Still missing: the spring.
  repair-need-mechanism:
    The spring is installed. Still missing: the mechanism.
  repair-need-both:
    Nothing is installed yet. Still missing: the mechanism and the spring.
  repair-not-broken:
    That doesn't seem to need fixing.
  combine-hint:
    Try: PUT one part IN the music box.
  ring-doorbell:
    You press the doorbell. A faint chime echoes inside the house,
    unanswered.
  ring-cant:
    That isn't a bell. Try PUSH it, or PULL it.
  doorbell-push:
    You press the doorbell. A faint chime echoes inside the house,
    unanswered.
  pull-button:
    It's a push button, not a pull cord. Try pressing it.
  knock-door:
    You rap your knuckles on the door. No answer.
  knock-nothing:
    Nothing happens.
  turn-sink:
    You turn the faucet. Rusty water sputters out briefly, then runs clear.
    Nothing else happens.
  climb-stairs-down:
    (Try going DOWN to take the stairs back to the hallway.)
  climb-stairs:
    (Try going UP to climb the stairs.)
  overcoat-take:
    The coat is too moth-eaten to carry. But you could search the pockets.
  wear-overcoat:
    The overcoat is too moth-eaten to wear. It would fall apart.
  desk-heavy:
    The desk is far too heavy to carry.
  shelf-nailed:
    The shelf is nailed to the wall.
  trunk-heavy:
    The trunk is far too heavy to lift.
  safe-embedded:
    The safe is embedded in the wall.
  wind-again:
    You wind it again. The melody plays, small and sweet. The trunk has
    already answered.
  unlock-trunk-hint:
    The trunk has no keyhole. The lock seems mechanically connected to the
    shelf above.
  use-hint:
    How do you want to use that? Try a specific verb: OPEN, PUSH, PULL, TURN,
    EAT, WEAR.
  use-with-hint:
    Try UNLOCK it WITH the key, or PUT one thing IN another.
  discard-hint:
    Try DROP it, or THROW AWAY it.
  go-to-hint:
    Use a compass direction to move: GO NORTH, EAST, UP. Type LOOK to see the
    exits from here.
  talk-to-hint:
    There is no one here to talk to. The house has been empty a long while.
  wash-hint:
    There's no time for cleaning. Whatever your grandmother left, it is still
    hidden.
  cook-hint:
    The pantry is bare and the stove is cold. The recipe card is worth
    reading, though.
  greeting-text:
    No one answers. The house is quiet. Type LOOK to see your surroundings,
    or HELP for hints.
  locket-found:
    You lift the locket from the trunk. Inside, your grandmother smiles back
    at you from a faded photograph. This is what she wanted you to have.
  victory:
    You found your grandmother's heirloom.

define phrase fire-lit
  You strike a match and light the logs. The fire catches quickly, casting
  warm light across the study.

  As the flames illuminate the hearthstone, you notice numbers scratched into
  the soot-blackened surface: 7 - 3 - 9.
end phrase

define phrase wind-success
  You insert the winding key and turn it gently. The music box comes alive --
  a delicate melody fills the attic, tinkling and sweet.

  As the last note fades, you hear a mechanical click from the steamer trunk
  -- its lock releases.
end phrase

define phrase help-text
  Your grandmother left something in this old house for you to find. Search
  everywhere -- under things, behind things, inside things. Some puzzles
  require combining objects or using one item with another.

  Type VERBS for a full list of commands.
end phrase

define phrase verbs-text
  AVAILABLE COMMANDS:{br}
  Movement:  N, S, E, W, U, D (or GO/HEAD/WALK direction){br}
  Stairs:    UP, DOWN, UPSTAIRS, DOWNSTAIRS, CLIMB STAIRS{br}
  Looking:   LOOK, EXAMINE (X), LOOK UNDER, LOOK BEHIND, SEARCH{br}
  Taking:    TAKE, DROP, INVENTORY (I){br}
  Using:     OPEN, CLOSE, UNLOCK with, LOCK{br}
  Special:   DIG, WIND, RING, KNOCK, LIGHT, BURN, CLIMB, TURN, PULL{br}
  Assembly:  PUT IN, PUT ON, ATTACH to, INSTALL in, COMBINE with{br}
  Self:      WEAR, EAT, READ{br}
  Meta:      HELP, VERBS, SAVE, RESTORE, QUIT
end phrase

create the attic stairs
  aka stairs, staircase, steps, stair, stairway
  scenery, climbable
  in the Attic

  The narrow staircase leads back down to the hallway.

  on the player climbing
    refuse climb-stairs-down
  end on

before the game starts
  change the player to the visitor
end before
