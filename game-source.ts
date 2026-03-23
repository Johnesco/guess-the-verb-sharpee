/**
 * Guess the Verb
 *
 * Explore your grandmother's old house and find the family heirloom
 * she left behind. Every room tests a different verb pattern.
 */

import {
  Story,
  StoryConfig,
} from '@sharpee/sharpee';
import type { GameEngine } from '@sharpee/engine';
import {
  WorldModel,
  IFEntity,
  EntityType,
  Direction,
  IdentityTrait,
  RoomTrait,
  ContainerTrait,
  OpenableTrait,
  LockableTrait,
  SceneryTrait,
  SupporterTrait,
  ReadableTrait,
  ActorTrait,
  registerActionInterceptor,
  clearInterceptorRegistry,
  createEffect,
} from '@sharpee/world-model';
import type { ActionInterceptor, CapabilityEffect } from '@sharpee/world-model';
import type { TurnPlugin, TurnPluginContext, PluginRegistry } from '@sharpee/plugins';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';
import type { ISemanticEvent } from '@sharpee/if-domain';

// ---------------------------------------------------------------------------
// Custom trait for puzzle props
// ---------------------------------------------------------------------------

class PuzzlePropTrait {
  static readonly type = 'story.puzzleProp';
  readonly type = 'story.puzzleProp';
  propId: string;
  constructor(propId: string) {
    this.propId = propId;
  }
}

function getPropId(entity: IFEntity): string | undefined {
  return (entity.get(PuzzlePropTrait.type) as PuzzlePropTrait | undefined)?.propId;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a game.message event with a plain-text fallback. */
function msg(text: string): ISemanticEvent {
  return {
    type: 'game.message',
    data: { messageId: 'story.custom', params: { fallback: text } },
  } as unknown as ISemanticEvent;
}

/** Registry of entity IDs keyed by short name. */
const q: Record<string, string> = {};

/** Create a scenery entity with optional puzzle-prop tagging. */
function createScenery(
  world: WorldModel,
  name: string,
  locationId: string,
  description: string,
  opts: {
    aliases?: string[];
    adjectives?: string[];
    article?: string;
    propId?: string;
    grammaticalNumber?: 'singular' | 'plural';
  } = {},
): IFEntity {
  const entity = world.createEntity(name, 'item');
  entity.add(
    new IdentityTrait({
      name,
      description,
      aliases: opts.aliases || [],
      adjectives: opts.adjectives || [],
      article: opts.article || 'a',
      grammaticalNumber: opts.grammaticalNumber,
      properName: false,
    }),
  );
  entity.add(new SceneryTrait({ mentioned: false, visible: true }));
  if (opts.propId) {
    entity.add(new PuzzlePropTrait(opts.propId));
    q[opts.propId] = entity.id;
  }
  world.moveEntity(entity.id, locationId);
  return entity;
}

// ---------------------------------------------------------------------------
// World-mutation helpers (called from actions & interceptors)
// ---------------------------------------------------------------------------

function revealIronKey(world: WorldModel): ISemanticEvent[] {
  const keyId = q['iron-key'];
  const porchId = q['porch'];
  if (world.getLocation(keyId) === porchId) {
    return [msg('You already found the key here.')];
  }
  world.moveEntity(keyId, porchId);
  world.awardScore('iron-key-found', 1, 'Finding the iron key');
  return [
    msg(
      'You lift the corner of the doormat and find an iron key hidden underneath.',
    ),
  ];
}

function movePainting(world: WorldModel): ISemanticEvent[] {
  if (world.getStateValue('painting-moved')) {
    return [msg('You already moved the painting. The wall safe is visible.')];
  }
  world.setStateValue('painting-moved', true);
  // Unconceal the wall safe
  const safe = world.getEntity(q['wall-safe']);
  if (safe) {
    const id = safe.get(IdentityTrait);
    if (id) id.concealed = false;
  }
  return [
    msg(
      'You push the painting aside, revealing a small wall safe hidden behind it.',
    ),
  ];
}

function lightFireplace(
  world: WorldModel,
  playerId: string,
): ISemanticEvent[] {
  if (world.getStateValue('fireplace-lit')) {
    return [msg('The fire is already burning.')];
  }
  // Need matchbook
  const matchLoc = world.getLocation(q['matchbook']);
  if (matchLoc !== playerId) {
    return [
      msg("You don't have anything to light the fire with."),
    ];
  }
  world.setStateValue('fireplace-lit', true);
  world.awardScore('fireplace-lit', 1, 'Lighting the fireplace');

  // Update descriptions
  const fp = world.getEntity(q['fireplace']);
  if (fp) {
    const id = fp.get(IdentityTrait);
    if (id) {
      id.description =
        'The fireplace crackles with warm flames. The logs glow orange.';
    }
  }
  const hs = world.getEntity(q['hearthstone']);
  if (hs) {
    const id = hs.get(IdentityTrait);
    if (id) {
      id.description =
        "In the firelight, you can make out numbers scratched into the hearthstone: 7 - 3 - 9.";
    }
  }
  return [
    msg(
      "You strike a match and light the logs. The fire catches quickly, casting warm light across the study.\n\nAs the flames illuminate the hearthstone, you notice numbers scratched into the soot-blackened surface: 7 - 3 - 9.",
    ),
  ];
}

// ---------------------------------------------------------------------------
// Story config
// ---------------------------------------------------------------------------

export const config: StoryConfig = {
  id: 'guess-the-verb',
  title: 'Guess the Verb',
  author: 'John Googol',
  version: '1.0.0',
  description:
    "Explore your grandmother's old house and find the family heirloom she left behind. Every room tests a different verb pattern.",
};

// ---------------------------------------------------------------------------
// Custom actions
// ---------------------------------------------------------------------------

function makeAction(
  id: string,
  group: string,
  executeFn: (ctx: any) => ISemanticEvent[] | void,
  validateFn?: (ctx: any) => any,
) {
  return {
    id,
    group,
    validate(ctx: any) {
      if (validateFn) return validateFn(ctx);
      // Default: require directObject
      if (!ctx.command?.directObject) {
        return { valid: false, error: 'action.missing_noun' };
      }
      return { valid: true };
    },
    execute: executeFn,
  };
}

function getCustomActions() {
  return [
    // --- LOOKING UNDER ---
    makeAction('story.action.looking-under', 'perception', (ctx) => {
      const target = ctx.command?.directObject?.entity;
      if (!target) return [msg("Look under what?")];
      const propId = getPropId(target);
      if (propId === 'doormat') return revealIronKey(ctx.world);
      if (propId === 'painting') return movePainting(ctx.world);
      return [msg(`You find nothing under the ${target.name}.`)];
    }),

    // --- LOOKING BEHIND ---
    makeAction('story.action.looking-behind', 'perception', (ctx) => {
      const target = ctx.command?.directObject?.entity;
      if (!target) return [msg("Look behind what?")];
      const propId = getPropId(target);
      if (propId === 'painting') return movePainting(ctx.world);
      return [msg(`You find nothing behind the ${target.name}.`)];
    }),

    // --- SEARCHING ---
    makeAction('story.action.searching', 'perception', (ctx) => {
      const target = ctx.command?.directObject?.entity;
      if (!target) return [msg("Search what?")];
      const propId = getPropId(target);

      if (propId === 'doormat') return revealIronKey(ctx.world);

      if (propId === 'overcoat' || propId === 'coat-rack') {
        const mbLoc = ctx.world.getLocation(q['matchbook']);
        if (mbLoc === ctx.player.id) {
          return [msg("You've already found the matchbook.")];
        }
        ctx.world.moveEntity(q['matchbook'], ctx.player.id);
        ctx.world.awardScore('matchbook-found', 1, 'Finding the matchbook');
        return [
          msg(
            "You rummage through the overcoat's pockets and find a small book of matches from 'The Golden Lantern.'",
          ),
        ];
      }

      // Container check
      if (target.isContainer) {
        if (target.isOpenable && !target.isOpen) {
          return [msg(`The ${target.name} is closed.`)];
        }
        const contents = ctx.world.getContents(target.id);
        if (contents.length === 0) {
          return [msg(`The ${target.name} is empty.`)];
        }
        const names = contents.map((e: IFEntity) => e.name).join(', ');
        return [msg(`Inside the ${target.name} you find: ${names}.`)];
      }

      return [msg(`You find nothing of interest in the ${target.name}.`)];
    }),

    // --- DIGGING ---
    makeAction('story.action.digging', 'special', (ctx) => {
      const target = ctx.command?.directObject?.entity;
      if (!target) return [msg("Dig what?")];
      const propId = getPropId(target);

      if (propId === 'flower-bed') {
        const trowelLoc = ctx.world.getLocation(q['trowel']);
        if (trowelLoc !== ctx.player.id) {
          return [msg("You'd need a tool to dig properly.")];
        }
        const mechLoc = ctx.world.getLocation(q['mechanism']);
        if (mechLoc) {
          return [msg("You've already dug here and found the mechanism.")];
        }
        ctx.world.moveEntity(q['mechanism'], q['garden']);
        ctx.world.awardScore('mechanism-found', 1, 'Unearthing the mechanism');
        return [
          msg(
            'You dig into the soft earth with the trowel and uncover a small brass mechanism -- gears, pins, and a tiny drum with raised bumps. The innards of a music box.',
          ),
        ];
      }
      return [msg("You dig around but find nothing.")];
    }),

    // --- DIGGING HERE (no target) ---
    makeAction(
      'story.action.digging-here',
      'special',
      (ctx) => {
        const playerLoc = ctx.world.getLocation(ctx.player.id);
        if (playerLoc === q['garden']) {
          const trowelLoc = ctx.world.getLocation(q['trowel']);
          if (trowelLoc !== ctx.player.id) {
            return [msg("You'd need a tool to dig properly.")];
          }
          const mechLoc = ctx.world.getLocation(q['mechanism']);
          if (mechLoc) {
            return [msg("You've already dug here and found the mechanism.")];
          }
          ctx.world.moveEntity(q['mechanism'], q['garden']);
          ctx.world.awardScore('mechanism-found', 1, 'Unearthing the mechanism');
          return [
            msg(
              'You dig into the soft earth with the trowel and uncover a small brass mechanism -- gears, pins, and a tiny drum with raised bumps. The innards of a music box.',
            ),
          ];
        }
        return [msg("There's nothing to dig here.")];
      },
      () => ({ valid: true }), // no target needed
    ),

    // --- WINDING ---
    makeAction('story.action.winding', 'special', (ctx) => {
      const target = ctx.command?.directObject?.entity;
      if (!target) return [msg("Wind what?")];

      const musicBoxId = q['music-box'];
      if (target.id !== musicBoxId) {
        return [msg(`You can't wind the ${target.name}.`)];
      }

      // Need winding key
      const wkLoc = ctx.world.getLocation(q['winding-key']);
      if (wkLoc !== ctx.player.id) {
        return [msg("You need a key to wind the music box.")];
      }

      // Need mechanism inside music box
      const contents = ctx.world.getContents(musicBoxId);
      const hasMech = contents.some((e: IFEntity) => e.id === q['mechanism']);
      const hasSpring = contents.some((e: IFEntity) => e.id === q['spring']);

      if (!hasMech || !hasSpring) {
        const missing: string[] = [];
        if (!hasMech) missing.push('mechanism');
        if (!hasSpring) missing.push('spring');
        return [
          msg(
            `The music box is still missing its ${missing.join(' and ')}. It can't be wound yet.`,
          ),
        ];
      }

      // Success! Unlock the trunk
      const trunk = ctx.world.getEntity(q['trunk']);
      if (trunk) {
        const lockable = trunk.get(LockableTrait);
        const openable = trunk.get(OpenableTrait);
        if (lockable) lockable.isLocked = false;
        if (openable) openable.isOpen = true;
      }
      ctx.world.awardScore('music-box-wound', 2, 'Winding the music box');
      return [
        msg(
          "You insert the winding key and turn it gently. The music box comes alive -- a delicate melody fills the attic, tinkling and sweet.\n\nAs the last note fades, you hear a mechanical click from the steamer trunk. Its lock has released.",
        ),
      ];
    }),

    // --- RINGING ---
    makeAction('story.action.ringing', 'special', (ctx) => {
      const target = ctx.command?.directObject?.entity;
      if (!target) return [msg("Ring what?")];
      const propId = getPropId(target);
      if (propId === 'doorbell') {
        return [
          msg(
            'You press the doorbell. A faint chime echoes inside the house, unanswered.',
          ),
        ];
      }
      return [msg(`You can't ring the ${target.name}.`)];
    }),

    // --- KNOCKING ---
    makeAction('story.action.knocking', 'special', (ctx) => {
      const target = ctx.command?.directObject?.entity;
      if (!target) return [msg("Knock on what?")];
      if (target.name?.includes('door')) {
        return [msg('You rap your knuckles on the door. No answer.')];
      }
      return [msg("Nothing happens.")];
    }),

    // --- REPAIRING ---
    makeAction('story.action.repairing', 'special', (ctx) => {
      const target = ctx.command?.directObject?.entity;
      if (!target) return [msg("Repair what?")];

      if (target.id === q['music-box']) {
        const contents = ctx.world.getContents(q['music-box']);
        const hasMech = contents.some((e: IFEntity) => e.id === q['mechanism']);
        const hasSpring = contents.some((e: IFEntity) => e.id === q['spring']);

        if (hasMech && hasSpring) {
          return [
            msg(
              'The music box has both the mechanism and the spring installed. Try winding it.',
            ),
          ];
        }
        const installed: string[] = [];
        const needed: string[] = [];
        if (hasMech) installed.push('mechanism');
        else needed.push('mechanism');
        if (hasSpring) installed.push('spring');
        else needed.push('spring');

        let status = '';
        if (installed.length)
          status += `The ${installed.join(' and ')} ${installed.length === 1 ? 'is' : 'are'} installed. `;
        if (needed.length)
          status += `Still missing: ${needed.join(' and ')}.`;
        return [msg(status)];
      }

      return [msg(`The ${target.name} doesn't seem to need fixing.`)];
    }),

    // --- PULLING ---
    makeAction('story.action.pulling', 'manipulation', (ctx) => {
      const target = ctx.command?.directObject?.entity;
      if (!target) return [msg("Pull what?")];
      const propId = getPropId(target);
      if (propId === 'doorbell') {
        return [msg("It's a push button, not a pull cord. Try pressing it.")];
      }
      if (propId === 'painting') return movePainting(ctx.world);
      return [msg("Nothing happens.")];
    }),

    // --- TURNING ---
    makeAction('story.action.turning', 'manipulation', (ctx) => {
      const target = ctx.command?.directObject?.entity;
      if (!target) return [msg("Turn what?")];
      const propId = getPropId(target);
      if (propId === 'painting') return movePainting(ctx.world);
      if (propId === 'sink') {
        return [
          msg(
            'You turn the faucet. Rusty water sputters out briefly, then runs clear. Nothing else happens.',
          ),
        ];
      }
      return [msg(`You can't turn the ${target.name}.`)];
    }),

    // --- CLIMBING ---
    makeAction('story.action.climbing', 'movement', (ctx) => {
      const target = ctx.command?.directObject?.entity;
      if (!target) return [msg("Climb what?")];
      const propId = getPropId(target);
      if (propId === 'staircase') {
        return [msg('(Try going UP to climb the stairs.)')];
      }
      return [msg(`You can't climb the ${target.name}.`)];
    }),

    // --- UNLOCKING (without key) ---
    makeAction('story.action.unlocking', 'manipulation', (ctx) => {
      const target = ctx.command?.directObject?.entity;
      if (!target) return [msg("Unlock what?")];
      if (target.id === q['trunk']) {
        return [
          msg(
            'The trunk has no keyhole. The lock seems mechanically connected to the shelf above.',
          ),
        ];
      }
      if (target.isLocked) {
        return [msg('You need a key to unlock that.')];
      }
      return [msg("That isn't locked.")];
    }),

    // --- COMBINING ---
    makeAction('story.action.combining', 'special', (ctx) => {
      const item = ctx.command?.directObject?.entity;
      const other = ctx.command?.indirectObject?.entity;
      if (!item || !other) return [msg("Combine what with what?")];

      // If one is the music box, put the other inside
      if (item.id === q['music-box'] || other.id === q['music-box']) {
        const box = item.id === q['music-box'] ? item : other;
        const part = item.id === q['music-box'] ? other : item;
        ctx.world.moveEntity(part.id, box.id);
        return [msg(`You carefully place the ${part.name} inside the music box.`)];
      }
      return [msg(`Try: PUT ${item.name.toUpperCase()} IN something.`)];
    }),

    // --- WEARING ---
    makeAction('story.action.wearing', 'manipulation', (ctx) => {
      const target = ctx.command?.directObject?.entity;
      if (!target) return [msg("Wear what?")];
      const propId = getPropId(target);
      if (propId === 'overcoat') {
        return [msg("The overcoat is too moth-eaten to wear. It would fall apart.")];
      }
      return [msg(`You can't wear the ${target.name}.`)];
    }),

    // --- DIALING ---
    makeAction(
      'story.action.dialing',
      'special',
      (ctx) => {
        const playerLoc = ctx.world.getLocation(ctx.player.id);
        const studyId = q['study'];
        if (playerLoc !== studyId) {
          return [msg("There's nothing here to dial.")];
        }
        if (!ctx.world.getStateValue('painting-moved')) {
          return [msg("You don't see anything to dial a combination on.")];
        }

        // Extract code from text slots (Map<string, string> on parsed command)
        const textSlots = ctx.command?.parsed?.textSlots as Map<string, string> | undefined;
        const rawCode = textSlots ? Array.from(textSlots.values()).join('') : '';
        const code = rawCode.replace(/[^0-9]/g, '');

        if (code === '739') {
          const safe = ctx.world.getEntity(q['wall-safe']);
          if (safe) {
            const lockable = safe.get(LockableTrait);
            const openable = safe.get(OpenableTrait);
            if (lockable) lockable.isLocked = false;
            if (openable) openable.isOpen = true;
          }
          ctx.world.awardScore('safe-opened', 1, 'Opening the wall safe');
          return [
            msg(
              'You dial 7... 3... 9. Click. The safe door swings open.',
            ),
          ];
        }
        return [msg(`You dial ${rawCode || 'the numbers'}... nothing happens.`)];
      },
      () => ({ valid: true }), // no target needed
    ),

    // --- HELP ---
    makeAction(
      'story.action.help',
      'meta',
      () => {
        return [
          msg(
            "Your grandmother left something in this old house for you to find. Search everywhere -- under things, behind things, inside things. Some puzzles require combining objects or using one item with another.\n\nType VERBS for a full list of commands.",
          ),
        ];
      },
      () => ({ valid: true }),
    ),

    // --- VERBS ---
    makeAction(
      'story.action.verbs',
      'meta',
      () => {
        return [
          msg(
            "AVAILABLE COMMANDS:\n\n" +
            "Movement:  N, S, E, W, U, D (or GO direction)\n" +
            "Looking:   LOOK, EXAMINE (X), LOOK UNDER, LOOK BEHIND, SEARCH\n" +
            "Taking:    TAKE, DROP, INVENTORY (I)\n" +
            "Using:     OPEN, CLOSE, UNLOCK with, LOCK\n" +
            "Special:   DIG, WIND, RING, KNOCK, BURN, LIGHT, CLIMB, TURN, PULL\n" +
            "Assembly:  PUT IN, PUT ON, COMBINE with, ATTACH to, INSTALL in\n" +
            "Self:      WEAR, EAT, READ\n" +
            "Meta:      HELP, VERBS, SAVE, RESTORE, QUIT",
          ),
        ];
      },
      () => ({ valid: true }),
    ),

    // --- BURNING / LIGHTING ---
    makeAction('if.action.burning', 'special', (ctx) => {
      const target = ctx.command?.directObject?.entity;
      if (!target) return [msg("Burn what?")];
      const propId = getPropId(target);
      if (propId === 'fireplace') return lightFireplace(ctx.world, ctx.player.id);
      return [msg(`You can't burn the ${target.name}.`)];
    }),

    // --- USE (redirect) ---
    makeAction('story.action.use', 'special', (ctx) => {
      const target = ctx.command?.directObject?.entity;
      if (!target) return [msg("Use what?")];
      return [
        msg(
          `How do you want to use the ${target.name}? Try a specific verb: OPEN, PUSH, PULL, TURN, EAT, WEAR, etc.`,
        ),
      ];
    }),

    // --- USE WITH ---
    makeAction('story.action.use-with', 'special', (ctx) => {
      const item = ctx.command?.directObject?.entity;
      const other = ctx.command?.indirectObject?.entity;
      if (!item || !other) return [msg("Use what with what?")];
      if (other.isLockable) {
        return [msg(`Try: UNLOCK ${other.name.toUpperCase()} WITH ${item.name.toUpperCase()}`)];
      }
      return [
        msg(
          `Try a more specific command, like PUT ${item.name.toUpperCase()} IN ${other.name.toUpperCase()}.`,
        ),
      ];
    }),

    // -----------------------------------------------------------------------
    // Disambiguation actions (reducing guess-the-verb)
    // -----------------------------------------------------------------------

    // --- WHERE AM I ---
    makeAction(
      'story.action.where-am-i',
      'meta',
      (ctx) => {
        const locId = ctx.world.getLocation(ctx.player.id);
        const loc = locId ? ctx.world.getEntity(locId) : null;
        return [msg(`You are in the ${loc?.name || 'an unknown place'}.`)];
      },
      () => ({ valid: true }),
    ),

    // --- GO BACK (return to previous room) ---
    makeAction(
      'story.action.go-back',
      'movement',
      (ctx) => {
        const lastRoom = ctx.world.getStateValue('last-room');
        if (!lastRoom)
          return [msg("You haven't been anywhere else yet.")];
        const playerLoc = ctx.world.getLocation(ctx.player.id);
        if (lastRoom === playerLoc)
          return [msg("You're already back where you came from.")];
        ctx.world.setStateValue('last-room', playerLoc);
        ctx.world.moveEntity(ctx.player.id, lastRoom);
        const loc = ctx.world.getEntity(lastRoom);
        return [msg(`${loc?.name || 'Somewhere'}\n\n${loc?.description || ''}`)];
      },
      () => ({ valid: true }),
    ),

    // --- GO UP (literal direction — bypasses directionMap limitation) ---
    makeAction(
      'story.action.go-up',
      'movement',
      (ctx) => {
        const locId = ctx.world.getLocation(ctx.player.id);
        const room = locId ? ctx.world.getEntity(locId) : null;
        const upExit = room?.get(RoomTrait)?.exits?.[Direction.UP];
        if (!upExit) return [msg("You can't go up from here.")];
        ctx.world.setStateValue('last-room', locId);
        ctx.world.moveEntity(ctx.player.id, upExit.destination);
        const dest = ctx.world.getEntity(upExit.destination);
        return [msg(`${dest?.name || 'Somewhere'}\n\n${dest?.description || ''}`)];
      },
      () => ({ valid: true }),
    ),

    // --- GO DOWN (literal direction) ---
    makeAction(
      'story.action.go-down',
      'movement',
      (ctx) => {
        const locId = ctx.world.getLocation(ctx.player.id);
        const room = locId ? ctx.world.getEntity(locId) : null;
        const downExit = room?.get(RoomTrait)?.exits?.[Direction.DOWN];
        if (!downExit) return [msg("You can't go down from here.")];
        ctx.world.setStateValue('last-room', locId);
        ctx.world.moveEntity(ctx.player.id, downExit.destination);
        const dest = ctx.world.getEntity(downExit.destination);
        return [msg(`${dest?.name || 'Somewhere'}\n\n${dest?.description || ''}`)];
      },
      () => ({ valid: true }),
    ),

    // --- GO TO / ENTER — try to find a door or give a hint ---
    makeAction(
      'story.action.go-to-hint',
      'movement',
      (ctx) => {
        return [msg("Use compass directions to move: GO NORTH, EAST, UP, etc. Type LOOK to see exits.")];
      },
      () => ({ valid: true }),
    ),

    makeAction(
      'story.action.enter-hint',
      'movement',
      (ctx) => {
        return [msg("Use compass directions to move: GO NORTH, EAST, UP, etc. Type LOOK to see exits.")];
      },
      () => ({ valid: true }),
    ),

    // --- GO INSIDE/OUTSIDE/THROUGH — attempt movement through a door ---
    makeAction(
      'story.action.go-through',
      'movement',
      (ctx) => {
        const locId = ctx.world.getLocation(ctx.player.id);
        const room = locId ? ctx.world.getEntity(locId) : null;
        const exits = room?.get(RoomTrait)?.exits;
        if (!exits) return [msg("There's nowhere to go from here.")];
        // Find an exit that goes through a door (has 'via' field)
        for (const [dir, exit] of Object.entries(exits)) {
          if (exit?.via) {
            const door = ctx.world.getEntity(exit.via);
            if (door?.isOpen) {
              ctx.world.setStateValue('last-room', locId);
              ctx.world.moveEntity(ctx.player.id, exit.destination);
              const dest = ctx.world.getEntity(exit.destination);
              return [msg(`${dest?.name || 'Somewhere'}\n\n${dest?.description || ''}`)];
            } else if (door?.isLocked) {
              return [msg(`The ${door.name} is locked.`)];
            } else {
              return [msg(`The ${door.name} is closed.`)];
            }
          }
        }
        return [msg("Use compass directions to move: GO NORTH, EAST, UP, etc.")];
      },
      () => ({ valid: true }),
    ),

    // --- EXAMINE SELF (player not in own scope — bypass validator) ---
    makeAction(
      'story.action.examine-self',
      'meta',
      (ctx) => {
        const p = ctx.world.getPlayer();
        const desc = p?.description || 'As good-looking as ever.';
        return [msg(desc)];
      },
      () => ({ valid: true }),
    ),

    // --- GREETING ---
    makeAction(
      'story.action.greeting',
      'meta',
      () => {
        return [msg("No one answers. The house is quiet. Type LOOK to see your surroundings, or HELP for hints.")];
      },
      () => ({ valid: true }),
    ),

    // --- LEAVE (context-sensitive go back) ---
    makeAction(
      'story.action.leave',
      'movement',
      (ctx) => {
        const lastRoom = ctx.world.getStateValue('last-room');
        if (lastRoom) {
          ctx.world.setStateValue('last-room', ctx.world.getLocation(ctx.player.id));
          ctx.world.moveEntity(ctx.player.id, lastRoom);
          const loc = ctx.world.getEntity(lastRoom);
          return [msg(`${loc?.name || 'Somewhere'}\n\n${loc?.description || ''}`)];
        }
        return [msg("You can't leave from here. Try a compass direction: NORTH, EAST, etc.")];
      },
      () => ({ valid: true }),
    ),
  ];
}

// ---------------------------------------------------------------------------
// Action interceptors (on PuzzlePropTrait entities)
// ---------------------------------------------------------------------------

interface InterceptorDef {
  actionId: string;
  interceptor: ActionInterceptor;
}

function getInterceptors(): InterceptorDef[] {
  return [
    // TAKE doormat -> reveal key
    {
      actionId: 'if.action.taking',
      interceptor: {
        preValidate(entity, world, actorId) {
          const propId = getPropId(entity);
          if (propId === 'doormat') {
            return { valid: false, error: 'story.doormat.take' };
          }
          if (propId === 'overcoat') {
            return { valid: false, error: 'story.overcoat.take' };
          }
          return null;
        },
        onBlocked(entity, world, actorId, error) {
          const propId = getPropId(entity);
          if (propId === 'doormat') {
            const events = revealIronKey(world);
            return events.map((e) =>
              createEffect('game.message', {
                messageId: 'story.custom',
                params: {
                  fallback:
                    (e as any).data?.params?.fallback ||
                    'You lift the corner of the doormat.',
                },
              }),
            );
          }
          if (propId === 'overcoat') {
            return [
              createEffect('game.message', {
                messageId: 'story.custom',
                params: {
                  fallback:
                    "The coat is too moth-eaten to carry. But you could search the pockets.",
                },
              }),
            ];
          }
          return null;
        },
      },
    },

    // PUSH doorbell -> chime
    {
      actionId: 'if.action.pushing',
      interceptor: {
        preValidate(entity) {
          const propId = getPropId(entity);
          if (propId === 'doorbell') {
            return { valid: false, error: 'story.doorbell.push' };
          }
          if (propId === 'painting') {
            return { valid: false, error: 'story.painting.push' };
          }
          return null;
        },
        onBlocked(entity, world, actorId, error) {
          const propId = getPropId(entity);
          if (propId === 'doorbell') {
            return [
              createEffect('game.message', {
                messageId: 'story.custom',
                params: {
                  fallback:
                    'You press the doorbell. A faint chime echoes inside the house, unanswered.',
                },
              }),
            ];
          }
          if (propId === 'painting') {
            const events = movePainting(world);
            return events.map((e) =>
              createEffect('game.message', {
                messageId: 'story.custom',
                params: { fallback: (e as any).data?.params?.fallback || '' },
              }),
            );
          }
          return null;
        },
      },
    },

    // SWITCH ON fireplace -> light it
    {
      actionId: 'if.action.switching_on',
      interceptor: {
        preValidate(entity) {
          const propId = getPropId(entity);
          if (propId === 'fireplace') {
            return { valid: false, error: 'story.fireplace.switch' };
          }
          return null;
        },
        onBlocked(entity, world, actorId) {
          const propId = getPropId(entity);
          if (propId === 'fireplace') {
            const events = lightFireplace(world, actorId);
            return events.map((e) =>
              createEffect('game.message', {
                messageId: 'story.custom',
                params: { fallback: (e as any).data?.params?.fallback || '' },
              }),
            );
          }
          return null;
        },
      },
    },

    // OPEN safe -> auto-dial if fireplace lit
    {
      actionId: 'if.action.opening',
      interceptor: {
        preValidate(entity, world) {
          const propId = getPropId(entity);
          if (propId === 'wall-safe') {
            const lockable = entity.get(LockableTrait);
            if (lockable?.isLocked) {
              if (!world.getStateValue('fireplace-lit')) {
                return { valid: false, error: 'story.safe.no-combo' };
              }
              // Auto-dial the combination
              lockable.isLocked = false;
              const openable = entity.get(OpenableTrait);
              if (openable) openable.isOpen = true;
              world.awardScore('safe-opened', 1, 'Opening the wall safe');
              return { valid: false, error: 'story.safe.auto-open' };
            }
          }
          return null;
        },
        onBlocked(entity, world, actorId, error) {
          if (error === 'story.safe.no-combo') {
            return [
              createEffect('game.message', {
                messageId: 'story.custom',
                params: {
                  fallback:
                    "You don't know the combination yet.",
                },
              }),
            ];
          }
          if (error === 'story.safe.auto-open') {
            return [
              createEffect('game.message', {
                messageId: 'story.custom',
                params: {
                  fallback:
                    'Remembering the numbers on the hearthstone, you dial 7... 3... 9. Click. The safe door swings open.',
                },
              }),
            ];
          }
          return null;
        },
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

function createWinCheckPlugin(): TurnPlugin {
  return {
    id: 'story.win-check',
    priority: 1000,
    onAfterAction(ctx: TurnPluginContext): ISemanticEvent[] {
      if (ctx.world.getScore() >= 10) {
        return [
          msg("You found your grandmother's heirloom."),
          { type: 'game.ended', data: { reason: 'victory' } } as any,
        ];
      }
      return [];
    },
  };
}

function createMovementTrackingPlugin(): TurnPlugin {
  return {
    id: 'story.movement-tracking',
    priority: 10,
    onAfterAction(ctx: TurnPluginContext): ISemanticEvent[] {
      if (ctx.actionResult?.actionId === 'if.action.going' && ctx.actionResult?.success) {
        for (const evt of (ctx.actionEvents || [])) {
          if (evt.type === 'if.event.actor_moved' && evt.data?.fromRoom) {
            ctx.world.setStateValue('last-room', evt.data.fromRoom);
            break;
          }
        }
      }
      return [];
    },
  };
}

function createFirstTakePlugin(): TurnPlugin {
  return {
    id: 'story.first-take',
    priority: 100,
    onAfterAction(ctx: TurnPluginContext): ISemanticEvent[] {
      const result = ctx.actionResult;
      if (
        result?.actionId === 'if.action.taking' &&
        result?.success &&
        result?.targetId === q['locket']
      ) {
        return [
          msg(
            "You lift the locket from the trunk. Inside, your grandmother smiles back at you from a faded photograph. This is what she wanted you to have.",
          ),
        ];
      }
      return [];
    },
  };
}

function createDescriptionPlugin(): TurnPlugin {
  return {
    id: 'story.descriptions',
    priority: 50,
    onAfterAction(ctx: TurnPluginContext): ISemanticEvent[] {
      const world = ctx.world;

      // Dynamic desk description
      const desk = world.getEntity(q['desk']);
      if (desk) {
        const id = desk.get(IdentityTrait);
        const openable = desk.get(OpenableTrait);
        if (id && openable) {
          id.description = openable.isOpen
            ? 'A mahogany desk with brass handles. The drawers are open.'
            : 'A mahogany desk with brass handles. The drawers are closed.';
        }
      }

      // Dynamic music box description
      const box = world.getEntity(q['music-box']);
      if (box) {
        const id = box.get(IdentityTrait);
        if (id) {
          const contents = world.getContents(q['music-box']);
          const parts = contents
            .filter(
              (e: IFEntity) =>
                e.id === q['mechanism'] || e.id === q['spring'],
            )
            .map((e: IFEntity) => e.name);
          if (parts.length === 0) {
            id.description =
              'A wooden music box with a rose-carved lid and a small keyhole on the side. Inside, the cavity is empty -- the mechanism has been removed.';
          } else if (parts.length === 1) {
            id.description = `A wooden music box with a rose-carved lid. The ${parts[0]} has been installed inside.`;
          } else {
            id.description =
              'A wooden music box with a rose-carved lid. The mechanism and spring are installed inside, ready to be wound.';
          }
        }
      }

      // Dynamic trunk description
      const trunk = world.getEntity(q['trunk']);
      if (trunk) {
        const id = trunk.get(IdentityTrait);
        const lockable = trunk.get(LockableTrait);
        if (id && lockable) {
          id.description = lockable.isLocked
            ? "A battered steamer trunk with brass fittings. The lock has no keyhole -- just a small slot that looks mechanically connected to the shelf above."
            : "A battered steamer trunk with brass fittings. The lock has been released.";
        }
      }

      // Wall safe concealment
      const safe = world.getEntity(q['wall-safe']);
      if (safe) {
        const id = safe.get(IdentityTrait);
        if (id) {
          id.concealed = !world.getStateValue('painting-moved');
        }
      }

      return [];
    },
  };
}

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------

export const story: Story = {
  config,

  createPlayer(world: WorldModel): IFEntity {
    const player = world.getPlayer()!;
    player.add(
      new IdentityTrait({
        name: 'yourself',
        aliases: ['self', 'me', 'myself'],
        description: 'As good-looking as ever.',
        properName: true,
      }),
    );
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: { maxItems: 15 } }));
    return player;
  },

  initializeWorld(world: WorldModel): void {
    world.setMaxScore(10);

    // === ROOMS ===

    const porch = world.createEntity('Front Porch', 'room');
    porch.add(
      new IdentityTrait({
        name: 'Front Porch',
        description:
          "A sagging wooden porch wraps around the front of the house. A woven doormat lies before the front door. A tarnished brass doorbell is set beside the frame.\n\nThe front door leads inside to the east.",
        properName: true,
      }),
    );
    porch.add(new RoomTrait());
    q['porch'] = porch.id;

    const hallway = world.createEntity('Hallway', 'room');
    hallway.add(
      new IdentityTrait({
        name: 'Hallway',
        description:
          "A dim hallway with faded wallpaper and creaking floorboards. A coat rack stands by the door with an old overcoat hanging from it.\n\nDoors lead east to a study and south to the kitchen. A narrow staircase leads up.",
        properName: true,
      }),
    );
    hallway.add(new RoomTrait());
    q['hallway'] = hallway.id;

    const study = world.createEntity('Study', 'room');
    study.add(
      new IdentityTrait({
        name: 'Study',
        description:
          "A wood-paneled study with built-in bookshelves. A heavy desk sits in the center, its drawers shut. An oil painting of a woman hangs on the far wall. A stone fireplace squats in the corner, cold and dark.\n\nThe hallway is back to the west.",
        properName: true,
      }),
    );
    study.add(new RoomTrait());
    q['study'] = study.id;

    const kitchen = world.createEntity('Kitchen', 'room');
    kitchen.add(
      new IdentityTrait({
        name: 'Kitchen',
        description:
          "A rustic kitchen with stone counters and a deep ceramic sink. Copper pots hang from hooks above. A handwritten recipe card sits on the counter.\n\nThe hallway is north. A doorway leads south to the garden.",
        properName: true,
      }),
    );
    kitchen.add(new RoomTrait());
    q['kitchen'] = kitchen.id;

    const garden = world.createEntity('Garden', 'room');
    garden.add(
      new IdentityTrait({
        name: 'Garden',
        description:
          "An overgrown garden behind the house. A flower bed runs along the back wall, thick with weeds. A small shed leans in one corner with its door ajar. A rusty trowel leans against the shed.\n\nThe kitchen doorway is back to the north.",
        properName: true,
      }),
    );
    garden.add(new RoomTrait({ outdoor: true }));
    q['garden'] = garden.id;

    const attic = world.createEntity('Attic', 'room');
    attic.add(
      new IdentityTrait({
        name: 'Attic',
        description:
          "A cramped attic under sloping eaves, thick with dust. A dusty shelf holds an old music box. A heavy steamer trunk sits against the wall.\n\nThe stairs lead back down.",
        properName: true,
      }),
    );
    attic.add(new RoomTrait());
    q['attic'] = attic.id;

    // === DOOR ===

    const frontDoor = world.createDoor('front door', {
      room1Id: porch.id,
      room2Id: hallway.id,
      direction: Direction.EAST,
      description:
        'A heavy oak door with peeling green paint and an old-fashioned keyhole.',
      aliases: ['oak door', 'door', 'keyhole'],
      isOpen: false,
      isLocked: true,
      keyId: undefined!, // set below after key is created
    });
    const fdIdent = frontDoor.get(IdentityTrait);
    if (fdIdent) fdIdent.adjectives = ['front', 'oak', 'heavy', 'green'];
    q['front-door'] = frontDoor.id;

    // === ROOM CONNECTIONS ===

    world.connectRooms(hallway.id, study.id, Direction.EAST);
    world.connectRooms(hallway.id, kitchen.id, Direction.SOUTH);
    world.connectRooms(hallway.id, attic.id, Direction.UP);
    world.connectRooms(kitchen.id, garden.id, Direction.SOUTH);

    // === TAKEABLE ITEMS ===

    const ironKey = world.createEntity('iron key', 'item');
    ironKey.add(
      new IdentityTrait({
        name: 'iron key',
        description: 'A heavy iron key, dark with age.',
        aliases: ['old key', 'heavy key', 'house key', 'key'],
        adjectives: ['iron', 'heavy', 'old'],
        article: 'an',
      }),
    );
    q['iron-key'] = ironKey.id;
    // Key is NOT placed anywhere initially -- revealed by looking under doormat

    // Set the front door's key
    const fdLock = frontDoor.get(LockableTrait);
    if (fdLock) fdLock.keyId = ironKey.id;

    const matchbook = world.createEntity('matchbook', 'item');
    matchbook.add(
      new IdentityTrait({
        name: 'matchbook',
        description:
          "A small book of matches from 'The Golden Lantern.' A few matches remain.",
        aliases: ['matches', 'match', 'book of matches'],
        adjectives: ['small'],
        article: 'a',
      }),
    );
    q['matchbook'] = matchbook.id;
    // Hidden in overcoat, revealed by searching

    const windingKey = world.createEntity('winding key', 'item');
    windingKey.add(
      new IdentityTrait({
        name: 'winding key',
        description:
          'A small key shaped like a butterfly, clearly meant for winding something delicate.',
        aliases: ['butterfly key', 'small key', 'delicate key', 'key'],
        adjectives: ['winding', 'butterfly', 'small', 'delicate'],
        article: 'a',
        points: 1,
        pointsDescription: 'Finding the winding key',
      }),
    );
    q['winding-key'] = windingKey.id;

    const clockSpring = world.createEntity('clock spring', 'item');
    clockSpring.add(
      new IdentityTrait({
        name: 'clock spring',
        description:
          'A tightly coiled metal spring, the kind found inside clockwork.',
        aliases: ['spring', 'coiled spring', 'metal spring', 'coil'],
        adjectives: ['clock', 'coiled', 'metal', 'tightly'],
        article: 'a',
      }),
    );
    q['spring'] = clockSpring.id;

    const trowel = world.createEntity('garden trowel', 'item');
    trowel.add(
      new IdentityTrait({
        name: 'garden trowel',
        description: 'A short-handled garden trowel, rusty but solid.',
        aliases: ['trowel', 'spade', 'shovel', 'tool'],
        adjectives: ['garden', 'rusty', 'short-handled'],
        article: 'a',
      }),
    );
    world.moveEntity(trowel.id, garden.id);
    q['trowel'] = trowel.id;

    const mechanism = world.createEntity('brass mechanism', 'item');
    mechanism.add(
      new IdentityTrait({
        name: 'brass mechanism',
        description:
          'A small brass mechanism -- gears, pins, and a tiny drum with raised bumps. The innards of a music box.',
        aliases: [
          'mechanism',
          'gears',
          'gear',
          'clockwork',
          'innards',
          'drum',
          'pins',
          'pin',
          'brass thing',
        ],
        adjectives: ['brass', 'small'],
        article: 'a',
      }),
    );
    q['mechanism'] = mechanism.id;
    // Hidden in flower bed, revealed by digging

    const locket = world.createEntity('family locket', 'item');
    locket.add(
      new IdentityTrait({
        name: 'family locket',
        description:
          'A silver locket on a fine chain. Inside, a tiny photograph shows your grandmother as a young woman, smiling.',
        aliases: [
          'locket',
          'silver locket',
          'heirloom',
          'necklace',
          'chain',
          'photograph',
          'photo',
        ],
        adjectives: ['family', 'silver', 'fine'],
        article: 'a',
        points: 2,
        pointsDescription: "Finding grandmother's heirloom",
      }),
    );
    q['locket'] = locket.id;

    // === CONTAINERS ===

    const desk = world.createEntity('heavy desk', 'container');
    desk.add(
      new IdentityTrait({
        name: 'heavy desk',
        description:
          'A mahogany desk with brass handles. The drawers are closed.',
        aliases: [
          'desk',
          'drawers',
          'drawer',
          'mahogany desk',
          'handles',
          'handle',
          'brass handles',
        ],
        adjectives: ['heavy', 'mahogany'],
        article: 'a',
      }),
    );
    desk.add(new ContainerTrait({ isTransparent: false }));
    desk.add(new OpenableTrait({ isOpen: false, canClose: true }));
    desk.add(
      new SceneryTrait({
        cantTakeMessage: 'The desk is far too heavy to carry.',
      }),
    );
    world.moveEntity(desk.id, study.id);
    q['desk'] = desk.id;

    // Place winding key inside desk (temporarily open, then close)
    const deskOpen = desk.get(OpenableTrait);
    if (deskOpen) {
      deskOpen.isOpen = true;
      world.moveEntity(windingKey.id, desk.id);
      deskOpen.isOpen = false;
    }

    const wallSafe = world.createEntity('wall safe', 'container');
    wallSafe.add(
      new IdentityTrait({
        name: 'wall safe',
        description:
          'A small iron safe set into the wall. It has a three-dial combination lock.',
        aliases: [
          'safe',
          'iron safe',
          'combination',
          'dial',
          'dials',
          'lock',
          'combination lock',
        ],
        adjectives: ['wall', 'iron', 'small'],
        article: 'a',
        concealed: true,
      }),
    );
    wallSafe.add(new ContainerTrait({ isTransparent: false }));
    wallSafe.add(new OpenableTrait({ isOpen: false, canClose: true }));
    wallSafe.add(
      new LockableTrait({
        isLocked: true,
        lockedMessage:
          "The safe has a three-dial combination lock. You don't know the combination yet.",
      }),
    );
    wallSafe.add(
      new SceneryTrait({
        cantTakeMessage: 'The safe is embedded in the wall.',
      }),
    );
    wallSafe.add(new PuzzlePropTrait('wall-safe'));
    world.moveEntity(wallSafe.id, study.id);
    q['wall-safe'] = wallSafe.id;

    // Place spring inside safe (temporarily unlock/open, then relock)
    const safeLock = wallSafe.get(LockableTrait);
    const safeOpen = wallSafe.get(OpenableTrait);
    if (safeLock && safeOpen) {
      safeLock.isLocked = false;
      safeOpen.isOpen = true;
      world.moveEntity(clockSpring.id, wallSafe.id);
      safeOpen.isOpen = false;
      safeLock.isLocked = true;
    }

    // === SUPPORTER ===

    const shelf = world.createEntity('dusty shelf', 'supporter');
    shelf.add(
      new IdentityTrait({
        name: 'dusty shelf',
        description: 'A rough plank shelf nailed to the wall studs.',
        aliases: ['shelf', 'plank', 'shelves'],
        adjectives: ['dusty', 'rough'],
        article: 'a',
      }),
    );
    shelf.add(new SupporterTrait());
    shelf.add(
      new SceneryTrait({
        cantTakeMessage: 'The shelf is nailed to the wall.',
      }),
    );
    world.moveEntity(shelf.id, attic.id);

    const musicBox = world.createEntity('old music box', 'container');
    musicBox.add(
      new IdentityTrait({
        name: 'old music box',
        description:
          'A wooden music box with a rose-carved lid and a small keyhole on the side. Inside, the cavity is empty -- the mechanism has been removed.',
        aliases: ['box', 'music box', 'wooden box', 'lid', 'keyhole'],
        adjectives: ['old', 'wooden', 'music', 'rose-carved'],
        article: 'an',
      }),
    );
    musicBox.add(
      new ContainerTrait({ capacity: { maxItems: 2 }, isTransparent: false }),
    );
    musicBox.add(new OpenableTrait({ isOpen: true, canClose: true }));
    world.moveEntity(musicBox.id, shelf.id);
    q['music-box'] = musicBox.id;

    const trunk = world.createEntity('steamer trunk', 'container');
    trunk.add(
      new IdentityTrait({
        name: 'steamer trunk',
        description:
          "A battered steamer trunk with brass fittings. The lock has no keyhole -- just a small slot that looks mechanically connected to the shelf above.",
        aliases: [
          'trunk',
          'chest',
          'old trunk',
          'steamer',
          'fittings',
          'brass fittings',
          'slot',
        ],
        adjectives: ['steamer', 'battered', 'heavy'],
        article: 'a',
      }),
    );
    trunk.add(new ContainerTrait({ isTransparent: false }));
    trunk.add(new OpenableTrait({ isOpen: false, canClose: true }));
    trunk.add(
      new LockableTrait({
        isLocked: true,
        lockedMessage:
          'The trunk has no keyhole. The lock seems mechanically connected to the shelf above.',
      }),
    );
    trunk.add(
      new SceneryTrait({
        cantTakeMessage: 'The trunk is far too heavy to lift.',
      }),
    );
    trunk.add(new PuzzlePropTrait('trunk'));
    world.moveEntity(trunk.id, attic.id);
    q['trunk'] = trunk.id;

    // Place locket inside trunk (temporarily unlock/open, then relock)
    const trunkLock = trunk.get(LockableTrait);
    const trunkOpen = trunk.get(OpenableTrait);
    if (trunkLock && trunkOpen) {
      trunkLock.isLocked = false;
      trunkOpen.isOpen = true;
      world.moveEntity(locket.id, trunk.id);
      trunkOpen.isOpen = false;
      trunkLock.isLocked = true;
    }

    // === SCENERY ===

    // Porch
    createScenery(world, 'woven doormat', porch.id,
      "A faded doormat reading 'WELCOME'. One corner is curled up -- something glints underneath.",
      { aliases: ['mat', 'rug', 'welcome mat', 'doormat', 'corner'], adjectives: ['woven', 'faded'], propId: 'doormat' });
    createScenery(world, 'brass doorbell', porch.id,
      'A tarnished brass button set into the door frame.',
      { aliases: ['bell', 'button', 'buzzer', 'door bell', 'doorbell', 'door frame'], adjectives: ['brass', 'tarnished'], propId: 'doorbell' });
    createScenery(world, 'sagging porch', porch.id,
      'Weathered boards that sag under your weight. The paint peeled away long ago.',
      { aliases: ['porch', 'boards', 'railing'], adjectives: ['sagging', 'wooden', 'weathered'], article: 'the' });

    // Hallway
    createScenery(world, 'coat rack', hallway.id,
      'A wooden coat rack, slightly tilted. An old overcoat hangs from one hook.',
      { aliases: ['rack', 'hook', 'hooks', 'stand'], adjectives: ['wooden', 'tilted'], article: 'the', propId: 'coat-rack' });
    const overcoat = createScenery(world, 'old overcoat', hallway.id,
      'A moth-eaten wool overcoat. The pockets look like they might hold something.',
      { aliases: ['coat', 'jacket', 'overcoat', 'wool coat', 'dusty coat', 'pockets', 'pocket'], adjectives: ['old', 'moth-eaten', 'wool'], article: 'an', propId: 'overcoat' });
    overcoat.scope('if.action.examining', 150);
    overcoat.scope('if.action.searching', 150);
    overcoat.scope('if.action.taking', 150);

    createScenery(world, 'narrow staircase', hallway.id,
      'A wooden staircase with groaning steps. It leads up into shadows.',
      { aliases: ['stairs', 'staircase', 'steps', 'stair'], adjectives: ['narrow', 'wooden', 'groaning'], propId: 'staircase' });
    createScenery(world, 'faded wallpaper', hallway.id,
      'Yellowed wallpaper with a faded floral pattern, peeling at the seams.',
      { aliases: ['wallpaper', 'wall', 'walls', 'paper'], adjectives: ['faded', 'yellowed', 'floral'], article: 'the' });
    createScenery(world, 'creaking floorboards', hallway.id,
      'Dark wooden floorboards that creak underfoot.',
      { aliases: ['floor', 'floorboard', 'boards', 'floorboards'], adjectives: ['creaking', 'dark', 'wooden'], article: 'the', grammaticalNumber: 'plural' });

    // Study
    createScenery(world, 'study bookshelves', study.id,
      'Floor-to-ceiling shelves packed with dusty volumes. Nothing stands out.',
      { aliases: ['bookshelves', 'bookshelf', 'shelves', 'books', 'book', 'volumes', 'volume'], adjectives: ['study', 'built-in', 'dusty'], article: 'the', grammaticalNumber: 'plural' });
    createScenery(world, 'oil painting', study.id,
      'A portrait of a stern woman in a high collar -- your grandmother, perhaps. The frame sits slightly askew on the wall.',
      { aliases: ['painting', 'portrait', 'picture', 'frame', 'woman', 'grandmother'], adjectives: ['oil', 'large'], article: 'an', propId: 'painting' });
    createScenery(world, 'stone fireplace', study.id,
      'A wide stone fireplace with old logs in the grate, ready to burn. The hearthstone is blackened with soot.',
      { aliases: ['fireplace', 'hearth', 'grate', 'fire', 'logs', 'log', 'chimney'], adjectives: ['stone', 'wide', 'cold'], article: 'the', propId: 'fireplace' });
    createScenery(world, 'hearthstone', study.id,
      'A broad flat stone at the base of the fireplace, blackened with soot. Hard to make out any detail.',
      { aliases: ['hearth stone', 'soot'], adjectives: ['broad', 'flat', 'blackened'], article: 'the', propId: 'hearthstone' });
    createScenery(world, 'wood paneling', study.id,
      'Dark wood panels line the walls, polished but dusty.',
      { aliases: ['paneling', 'panels', 'panel', 'wood'], adjectives: ['wood', 'dark', 'polished'], article: 'the' });

    // Kitchen
    createScenery(world, 'stone counters', kitchen.id,
      'Heavy stone countertops, cracked but solid.',
      { aliases: ['counter', 'countertop', 'countertops'], adjectives: ['stone', 'heavy', 'cracked'], article: 'the', grammaticalNumber: 'plural' });
    createScenery(world, 'ceramic sink', kitchen.id,
      'A deep farmhouse sink with a brass faucet. It drips slowly.',
      { aliases: ['sink', 'faucet', 'tap', 'basin'], adjectives: ['ceramic', 'deep', 'farmhouse'], article: 'the', propId: 'sink' });
    createScenery(world, 'copper pots', kitchen.id,
      'Tarnished copper pots hanging from iron hooks. Decorative now.',
      { aliases: ['pots', 'pans', 'pot', 'pan', 'hooks', 'iron hooks'], adjectives: ['copper', 'tarnished'], article: 'the', grammaticalNumber: 'plural' });
    const recipeCard = createScenery(world, 'recipe card', kitchen.id,
      "Your grandmother's handwriting: 'Lavender shortbread -- butter, sugar, flour, and dried lavender from the garden.' The card is stained and well-loved.",
      { aliases: ['recipe', 'card', 'note', 'handwritten'], adjectives: ['recipe', 'handwritten', 'stained'], article: 'the' });
    recipeCard.add(
      new ReadableTrait({
        text: 'Lavender shortbread -- butter, sugar, flour, and dried lavender from the garden.',
        isReadable: true,
        readableType: 'card',
      }),
    );

    // Garden
    createScenery(world, 'flower bed', garden.id,
      'A raised bed of dark soil tangled with dead weeds. The earth looks soft -- someone was digging here recently.',
      { aliases: ['bed', 'flowers', 'weeds', 'soil', 'dirt', 'earth', 'ground'], adjectives: ['flower', 'raised', 'dark'], article: 'the', propId: 'flower-bed' });
    createScenery(world, 'garden shed', garden.id,
      'A small wooden shed with a sagging roof. The door hangs open, revealing empty shelves and cobwebs inside.',
      { aliases: ['shed', 'shack', 'door', 'shed door', 'shelves', 'cobwebs', 'roof'], adjectives: ['garden', 'wooden', 'small', 'sagging'], article: 'the' });

    // Attic
    createScenery(world, 'sloping eaves', attic.id,
      'Low rafters and dusty beams. You have to duck in places.',
      { aliases: ['eaves', 'rafters', 'beams', 'ceiling', 'roof', 'wall', 'dust'], adjectives: ['sloping', 'low', 'dusty'], article: 'the', grammaticalNumber: 'plural' });

    // === SCOPE ===

    ironKey.scope('if.action.unlocking', 150);
    windingKey.scope('if.action.winding', 150);
    musicBox.scope('if.action.winding', 150);

    // === STATE ===

    world.setStateValue('painting-moved', false);
    world.setStateValue('fireplace-lit', false);
    world.setStateValue('last-room', null);

    // === INTERCEPTORS ===

    clearInterceptorRegistry();
    for (const { actionId, interceptor } of getInterceptors()) {
      registerActionInterceptor(PuzzlePropTrait.type, actionId, interceptor);
    }

    // === PLACE PLAYER ===

    const player = world.getPlayer()!;
    world.moveEntity(player.id, porch.id);
  },

  getCustomActions() {
    return getCustomActions();
  },

  extendParser(parser: any): void {
    // Vocabulary synonyms
    parser.registerVocabulary?.([
      { word: 'inspect', partOfSpeech: 'verb', mapsTo: 'examine', priority: 80, source: 'story' },
      { word: 'study', partOfSpeech: 'verb', mapsTo: 'examine', priority: 80, source: 'story' },
      { word: 'view', partOfSpeech: 'verb', mapsTo: 'examine', priority: 80, source: 'story' },
      { word: 'peruse', partOfSpeech: 'verb', mapsTo: 'examine', priority: 80, source: 'story' },
      { word: 'browse', partOfSpeech: 'verb', mapsTo: 'examine', priority: 80, source: 'story' },
      { word: 'flip', partOfSpeech: 'verb', mapsTo: 'examine', priority: 80, source: 'story' },
      { word: 'grab', partOfSpeech: 'verb', mapsTo: 'take', priority: 80, source: 'story' },
      { word: 'collect', partOfSpeech: 'verb', mapsTo: 'take', priority: 80, source: 'story' },
      { word: 'acquire', partOfSpeech: 'verb', mapsTo: 'take', priority: 80, source: 'story' },
      { word: 'snag', partOfSpeech: 'verb', mapsTo: 'take', priority: 80, source: 'story' },
      { word: 'fetch', partOfSpeech: 'verb', mapsTo: 'take', priority: 80, source: 'story' },
      { word: 'obtain', partOfSpeech: 'verb', mapsTo: 'take', priority: 80, source: 'story' },
      { word: 'steal', partOfSpeech: 'verb', mapsTo: 'take', priority: 80, source: 'story' },
      { word: 'nab', partOfSpeech: 'verb', mapsTo: 'take', priority: 80, source: 'story' },
      { word: 'lift', partOfSpeech: 'verb', mapsTo: 'take', priority: 80, source: 'story' },
      { word: 'raise', partOfSpeech: 'verb', mapsTo: 'take', priority: 80, source: 'story' },
      { word: 'peek', partOfSpeech: 'verb', mapsTo: 'look', priority: 80, source: 'story' },
      { word: 'peer', partOfSpeech: 'verb', mapsTo: 'look', priority: 80, source: 'story' },
      { word: 'gaze', partOfSpeech: 'verb', mapsTo: 'look', priority: 80, source: 'story' },
      { word: 'proceed', partOfSpeech: 'verb', mapsTo: 'go', priority: 80, source: 'story' },
      { word: 'head', partOfSpeech: 'verb', mapsTo: 'go', priority: 80, source: 'story' },
      { word: 'pry', partOfSpeech: 'verb', mapsTo: 'open', priority: 80, source: 'story' },
      { word: 'force', partOfSpeech: 'verb', mapsTo: 'open', priority: 80, source: 'story' },
      { word: 'shove', partOfSpeech: 'verb', mapsTo: 'push', priority: 80, source: 'story' },
      { word: 'prod', partOfSpeech: 'verb', mapsTo: 'push', priority: 80, source: 'story' },
      { word: 'yank', partOfSpeech: 'verb', mapsTo: 'pull', priority: 80, source: 'story' },
      { word: 'toss', partOfSpeech: 'verb', mapsTo: 'drop', priority: 80, source: 'story' },
      { word: 'place', partOfSpeech: 'verb', mapsTo: 'put', priority: 80, source: 'story' },
      { word: 'rummage', partOfSpeech: 'verb', mapsTo: 'search', priority: 80, source: 'story' },
      { word: 'strike', partOfSpeech: 'verb', mapsTo: 'attack', priority: 80, source: 'story' },
      { word: 'stab', partOfSpeech: 'verb', mapsTo: 'attack', priority: 80, source: 'story' },
      { word: 'slash', partOfSpeech: 'verb', mapsTo: 'attack', priority: 80, source: 'story' },
      { word: 'kick', partOfSpeech: 'verb', mapsTo: 'attack', priority: 80, source: 'story' },
      { word: 'consume', partOfSpeech: 'verb', mapsTo: 'eat', priority: 80, source: 'story' },
      { word: 'devour', partOfSpeech: 'verb', mapsTo: 'eat', priority: 80, source: 'story' },
      { word: 'upstairs', partOfSpeech: 'direction', mapsTo: 'up', priority: 80, source: 'story' },
      { word: 'downstairs', partOfSpeech: 'direction', mapsTo: 'down', priority: 80, source: 'story' },
      { word: 'check', partOfSpeech: 'verb', mapsTo: 'examine', priority: 80, source: 'story' },
      { word: 'investigate', partOfSpeech: 'verb', mapsTo: 'examine', priority: 80, source: 'story' },
      { word: 'leave', partOfSpeech: 'verb', mapsTo: 'go', priority: 75, source: 'story' },
      { word: 'read', partOfSpeech: 'verb', mapsTo: 'examine', priority: 80, source: 'story' },
      { word: 'try', partOfSpeech: 'verb', mapsTo: 'use', priority: 75, source: 'story' },
      { word: 'walk', partOfSpeech: 'verb', mapsTo: 'go', priority: 75, source: 'story' },
      { word: 'move', partOfSpeech: 'verb', mapsTo: 'push', priority: 80, source: 'story' },
    ]);

    // Story-specific grammar
    const g = parser.getStoryGrammar?.();
    if (!g) {
      console.warn('[Sharpee] getStoryGrammar() not available');
      return;
    }

    try {
      // Looking under/behind
      g.define('look under :target').mapsTo('story.action.looking-under').withPriority(150).build();
      g.define('look underneath :target').mapsTo('story.action.looking-under').withPriority(150).build();
      g.define('look beneath :target').mapsTo('story.action.looking-under').withPriority(150).build();
      g.define('search under :target').mapsTo('story.action.looking-under').withPriority(150).build();
      g.define('search underneath :target').mapsTo('story.action.looking-under').withPriority(150).build();
      g.define('search beneath :target').mapsTo('story.action.looking-under').withPriority(150).build();
      g.define('look behind :target').mapsTo('story.action.looking-behind').withPriority(150).build();
      g.define('check behind :target').mapsTo('story.action.looking-behind').withPriority(150).build();

      // Ringing / knocking
      g.define('ring :target').mapsTo('story.action.ringing').withPriority(150).build();
      g.define('knock :target').mapsTo('story.action.knocking').withPriority(150).build();
      g.define('knock on :target').mapsTo('story.action.knocking').withPriority(150).build();
      g.define('rap :target').mapsTo('story.action.knocking').withPriority(150).build();
      g.define('rap on :target').mapsTo('story.action.knocking').withPriority(150).build();

      // Digging
      g.define('dig :target').mapsTo('story.action.digging').withPriority(150).build();
      g.define('dig in :target').mapsTo('story.action.digging').withPriority(150).build();
      g.define('dig up :target').mapsTo('story.action.digging').withPriority(150).build();
      g.define('excavate :target').mapsTo('story.action.digging').withPriority(150).build();
      g.define('dig').mapsTo('story.action.digging-here').withPriority(150).build();
      g.define('dig here').mapsTo('story.action.digging-here').withPriority(150).build();
      g.define('dig with :tool').mapsTo('story.action.digging-here').withPriority(150).build();
      g.define('dig :target with :tool').mapsTo('story.action.digging').withPriority(150).build();

      // Winding
      g.define('wind :target').mapsTo('story.action.winding').withPriority(150).build();
      g.define('wind up :target').mapsTo('story.action.winding').withPriority(150).build();
      g.define('crank :target').mapsTo('story.action.winding').withPriority(150).build();
      g.define('crank up :target').mapsTo('story.action.winding').withPriority(150).build();
      g.define('wind :target with :tool').mapsTo('story.action.winding').withPriority(160).build();
      g.define('wind up :target with :tool').mapsTo('story.action.winding').withPriority(160).build();
      g.define('crank :target with :tool').mapsTo('story.action.winding').withPriority(160).build();

      // Repairing
      g.define('fix :target').mapsTo('story.action.repairing').withPriority(150).build();
      g.define('repair :target').mapsTo('story.action.repairing').withPriority(150).build();
      g.define('assemble :target').mapsTo('story.action.repairing').withPriority(150).build();
      g.define('mend :target').mapsTo('story.action.repairing').withPriority(150).build();

      // Searching
      g.define('search :target').mapsTo('story.action.searching').withPriority(150).build();
      g.define('rummage :target').mapsTo('story.action.searching').withPriority(150).build();

      // Manipulation
      g.define('pull :target').mapsTo('story.action.pulling').withPriority(150).build();
      g.define('yank :target').mapsTo('story.action.pulling').withPriority(150).build();
      g.define('drag :target').mapsTo('story.action.pulling').withPriority(150).build();
      g.define('turn :target').mapsTo('story.action.turning').withPriority(150).build();
      g.define('rotate :target').mapsTo('story.action.turning').withPriority(150).build();
      g.define('twist :target').mapsTo('story.action.turning').withPriority(150).build();
      g.define('climb :target').mapsTo('story.action.climbing').withPriority(150).build();
      g.define('scale :target').mapsTo('story.action.climbing').withPriority(150).build();

      // Unlocking
      g.define('unlock :target with :key').instrument('key').mapsTo('if.action.unlocking').withPriority(160).build();
      g.define('unlock :target').mapsTo('story.action.unlocking').withPriority(150).build();

      // Burning
      g.define('burn :target').mapsTo('if.action.burning').withPriority(150).build();
      g.define('kindle :target').mapsTo('if.action.burning').withPriority(150).build();
      g.define('ignite :target').mapsTo('if.action.burning').withPriority(150).build();
      g.define('start :target').mapsTo('if.action.burning').withPriority(150).build();
      g.define('light :target').mapsTo('if.action.burning').withPriority(150).build();

      // Assembly
      g.define('attach :item to :container').mapsTo('if.action.inserting').withPriority(150).build();
      g.define('install :item in :container').mapsTo('if.action.inserting').withPriority(150).build();
      g.define('install :item into :container').mapsTo('if.action.inserting').withPriority(150).build();
      g.define('combine :item with :other').mapsTo('story.action.combining').withPriority(150).build();

      // Wearing
      g.define('wear :target').mapsTo('story.action.wearing').withPriority(150).build();
      g.define('don :target').mapsTo('story.action.wearing').withPriority(150).build();

      // Meta
      g.define('help').mapsTo('story.action.help').withPriority(150).build();
      g.define('hint').mapsTo('story.action.help').withPriority(150).build();
      g.define('hints').mapsTo('story.action.help').withPriority(150).build();
      g.define('help me').mapsTo('story.action.help').withPriority(150).build();
      g.define('verbs').mapsTo('story.action.verbs').withPriority(150).build();
      g.define('commands').mapsTo('story.action.verbs').withPriority(150).build();

      // USE
      g.define('use :target').mapsTo('story.action.use').withPriority(150).build();
      g.define('use :target on :other').mapsTo('story.action.use-with').withPriority(150).build();
      g.define('use :target with :other').mapsTo('story.action.use-with').withPriority(150).build();

      // Look/look around
      g.define('look :target').mapsTo('if.action.examining').withPriority(140).build();
      g.define('look around').mapsTo('if.action.looking').withPriority(150).build();

      // Dialing
      g.define('dial :code...').mapsTo('story.action.dialing').withPriority(150).build();
      g.define('set combination [to] :code...').mapsTo('story.action.dialing').withPriority(150).build();
      g.define('set dial [to] :code...').mapsTo('story.action.dialing').withPriority(150).build();
      g.define('slide :target').mapsTo('if.action.pushing').withPriority(150).build();

      // Polite forms
      g.define('[please] go :dir').direction('dir').mapsTo('if.action.going').withPriority(90).build();
      g.define('[please] take :target').mapsTo('if.action.taking').withPriority(90).build();
      g.define('[please] open :target').mapsTo('if.action.opening').withPriority(90).build();
      g.define('[please] close :target').mapsTo('if.action.closing').withPriority(90).build();
      g.define('[please] examine :target').mapsTo('if.action.examining').withPriority(90).build();
      g.define('[please] look at :target').mapsTo('if.action.examining').withPriority(90).build();
      g.define('[please] search :target').mapsTo('story.action.searching').withPriority(90).build();
      g.define('[please] push :target').mapsTo('if.action.pushing').withPriority(90).build();
      g.define('[please] pull :target').mapsTo('story.action.pulling').withPriority(90).build();
      g.define('[please] drop :target').mapsTo('if.action.dropping').withPriority(90).build();
      g.define('[can] [i] go :dir').direction('dir').mapsTo('if.action.going').withPriority(85).build();
      g.define('[can] [i] take :target').mapsTo('if.action.taking').withPriority(85).build();
      g.define('[can] [i] open :target').mapsTo('if.action.opening').withPriority(85).build();
      g.define('[can] [i] look at :target').mapsTo('if.action.examining').withPriority(85).build();
      g.define('[can] [i] have :target').mapsTo('if.action.taking').withPriority(85).build();

      // -----------------------------------------------------------------
      // Disambiguation: reducing guess-the-verb
      // -----------------------------------------------------------------

      // Navigation — "go upstairs/downstairs" (directionMap lacks these)
      g.define('go upstairs').mapsTo('story.action.go-up').withPriority(120).build();
      g.define('go up stairs').mapsTo('story.action.go-up').withPriority(120).build();
      g.define('go up the stairs').mapsTo('story.action.go-up').withPriority(120).build();
      g.define('climb up').mapsTo('story.action.go-up').withPriority(120).build();
      g.define('go downstairs').mapsTo('story.action.go-down').withPriority(120).build();
      g.define('go down stairs').mapsTo('story.action.go-down').withPriority(120).build();
      g.define('go down the stairs').mapsTo('story.action.go-down').withPriority(120).build();

      // Navigation — "go back" / "return"
      g.define('back').mapsTo('story.action.go-back').withPriority(110).build();
      g.define('go back').mapsTo('story.action.go-back').withPriority(110).build();
      g.define('return').mapsTo('story.action.go-back').withPriority(110).build();

      // Navigation — "go to X" / "enter X" (rooms aren't entities → hint)
      g.define('go to :target...').mapsTo('story.action.go-to-hint').withPriority(80).build();
      g.define('enter :target...').mapsTo('story.action.enter-hint').withPriority(120).build();

      // Self-examination (player not in own scope → custom action)
      g.define('examine myself').mapsTo('story.action.examine-self').withPriority(160).build();
      g.define('examine me').mapsTo('story.action.examine-self').withPriority(160).build();
      g.define('examine self').mapsTo('story.action.examine-self').withPriority(160).build();
      g.define('look at myself').mapsTo('story.action.examine-self').withPriority(160).build();
      g.define('look at me').mapsTo('story.action.examine-self').withPriority(160).build();

      // Question forms → stdlib actions
      g.define('where am i').mapsTo('story.action.where-am-i').withPriority(150).build();
      g.define('where').mapsTo('story.action.where-am-i').withPriority(100).build();
      g.define('what do i have').mapsTo('if.action.inventory').withPriority(150).build();
      g.define('what am i carrying').mapsTo('if.action.inventory').withPriority(150).build();
      g.define('what am i holding').mapsTo('if.action.inventory').withPriority(150).build();
      g.define('what can i do').mapsTo('story.action.help').withPriority(150).build();

      // Inventory alternatives
      g.define('check inventory').mapsTo('if.action.inventory').withPriority(110).build();
      g.define('check items').mapsTo('if.action.inventory').withPriority(110).build();
      g.define('my inventory').mapsTo('if.action.inventory').withPriority(110).build();

      // "Examine room" → LOOK
      g.define('examine room').mapsTo('if.action.looking').withPriority(110).build();
      g.define('look at room').mapsTo('if.action.looking').withPriority(110).build();
      g.define('describe room').mapsTo('if.action.looking').withPriority(110).build();

      // "check :target" → EXAMINE (vocab mapping alone doesn't handle entity targets)
      g.define('check :target').mapsTo('if.action.examining').withPriority(100).build();
      g.define('read :target').mapsTo('if.action.examining').withPriority(100).build();

      // "lift :target" → TAKE (stdlib maps lift→raising, but we want the taking interceptor)
      g.define('lift :target').mapsTo('if.action.taking').withPriority(120).build();
      g.define('raise :target').mapsTo('if.action.taking').withPriority(120).build();

      // Multi-word verb phrases → EXAMINE
      g.define('flip through :target').mapsTo('if.action.examining').withPriority(150).build();
      g.define('leaf through :target').mapsTo('if.action.examining').withPriority(150).build();
      g.define('read through :target').mapsTo('if.action.examining').withPriority(150).build();

      // Navigation — "head/walk :direction" (vocab maps word, grammar routes direction)
      g.define('head :dir').direction('dir').mapsTo('if.action.going').withPriority(95).build();
      g.define('walk :dir').direction('dir').mapsTo('if.action.going').withPriority(95).build();
      g.define('walk to [the] :dir').direction('dir').mapsTo('if.action.going').withPriority(90).build();

      // Navigation — "go inside/outside/through" → try door, else hint
      g.define('go inside').mapsTo('story.action.go-through').withPriority(110).build();
      g.define('go outside').mapsTo('story.action.go-through').withPriority(110).build();
      g.define('go through the door').mapsTo('story.action.go-through').withPriority(120).build();
      g.define('walk through the door').mapsTo('story.action.go-through').withPriority(120).build();
      g.define('go through :target').mapsTo('story.action.go-through').withPriority(95).build();
      g.define('walk through :target').mapsTo('story.action.go-through').withPriority(95).build();
      g.define('go back inside').mapsTo('story.action.go-back').withPriority(115).build();

      // Navigation — "leave" (context: go back to previous room)
      g.define('leave').mapsTo('story.action.leave').withPriority(110).build();
      g.define('leave [the] :target...').mapsTo('story.action.leave').withPriority(105).build();

      // Greeting
      g.define('hello').mapsTo('story.action.greeting').withPriority(100).build();
      g.define('hi').mapsTo('story.action.greeting').withPriority(100).build();

      // Question forms (additional)
      g.define('what is this').mapsTo('if.action.looking').withPriority(150).build();
      g.define('what is this place').mapsTo('if.action.looking').withPriority(150).build();

      // Inventory — "check my inventory"
      g.define('check my inventory').mapsTo('if.action.inventory').withPriority(115).build();
      g.define('check my items').mapsTo('if.action.inventory').withPriority(115).build();

      // "look at everything" / "look at this room" → LOOK
      // Priority must beat stdlib's "look at :target" (95) AND story's "look :target" (140)
      g.define('look at everything').mapsTo('if.action.looking').withPriority(160).build();
      g.define('examine everything').mapsTo('if.action.looking').withPriority(160).build();
      g.define('look at this room').mapsTo('if.action.looking').withPriority(160).build();
      g.define('look at this place').mapsTo('if.action.looking').withPriority(160).build();

      // "browse :target" → EXAMINE (vocab browse→examine doesn't create a grammar pattern)
      g.define('browse :target').mapsTo('if.action.examining').withPriority(100).build();
      g.define('browse through :target').mapsTo('if.action.examining').withPriority(150).build();

      // "install :item in :container" already exists, add bare "install :target"
      g.define('install :target').mapsTo('if.action.putting').withPriority(100).build();

      // "try" patterns
      g.define('try :target on :other').mapsTo('story.action.use-with').withPriority(100).build();
      g.define('try to open :target').mapsTo('if.action.opening').withPriority(120).build();
      g.define('try to take :target').mapsTo('if.action.taking').withPriority(120).build();
      g.define('try to :rest...').mapsTo('story.action.go-to-hint').withPriority(80).build();

      // "look at the garden" — room names aren't entities, treat as LOOK
      g.define('look at the garden').mapsTo('if.action.looking').withPriority(160).build();
      g.define('look at the room').mapsTo('if.action.looking').withPriority(160).build();

    } catch (err) {
      console.error('[Sharpee] grammar builder error:', err);
    }
  },

  extendLanguage(language: any): void {
    language.addMessage?.('story.custom', '{fallback}');
    language.addMessage?.('game.message.story.custom', '{fallback}');
    language.addMessage?.('action.success.story.custom', '{fallback}');

    // Override default error messages for better disambiguation feedback
    language.addMessage?.('if.action.going.no_exit_that_way', "You can't go that way.");
    language.addMessage?.('if.action.taking.already_have', "You already have that.");
  },

  onEngineReady(engine: GameEngine): void {
    const registry = engine.getPluginRegistry();
    registry.register(createMovementTrackingPlugin());
    registry.register(createWinCheckPlugin());
    registry.register(createFirstTakePlugin());
    registry.register(createDescriptionPlugin());
  },
};

export default story;
