/**
 * Guess the Verb — Language Extensions
 *
 * All message registrations for the language layer.
 */

import type { LanguageProvider } from '@sharpee/lang-en-us';
import { Msg } from './types';

// ============================================================================
// LANGUAGE EXTENSION
// ============================================================================

export function extendLanguage(language: LanguageProvider): void {
  const add = (id: string, text: string) => (language as any).addMessage?.(id, text);

  // Puzzle: doormat / iron key
  add(Msg.KEY_FOUND, 'You lift the corner of the doormat and find an iron key hidden underneath.');
  add(Msg.KEY_ALREADY, 'You already found the key here.');

  // Puzzle: painting / wall safe
  add(Msg.PAINTING_MOVED, 'You push the painting aside, revealing a small wall safe hidden behind it.');
  add(Msg.PAINTING_ALREADY, 'You already moved the painting. The wall safe is visible.');
  add(Msg.SAFE_NO_COMBO, "You don't know the combination yet.");
  add(Msg.SAFE_OPENED, 'You dial 7... 3... 9. Click. The safe door swings open.');
  add(Msg.SAFE_AUTO_OPEN, 'Remembering the numbers on the hearthstone, you dial 7... 3... 9. Click. The safe door swings open.');

  // Puzzle: fireplace
  add(Msg.FIRE_ALREADY, 'The fire is already burning.');
  add(Msg.FIRE_NO_MATCHES, "You don't have anything to light the fire with.");
  add(Msg.FIRE_LIT, "You strike a match and light the logs. The fire catches quickly, casting warm light across the study.\n\nAs the flames illuminate the hearthstone, you notice numbers scratched into the soot-blackened surface: 7 - 3 - 9.");

  // Puzzle: matchbook
  add(Msg.MATCHBOOK_FOUND, "You rummage through the overcoat's pockets and find a small book of matches from 'The Golden Lantern.'");
  add(Msg.MATCHBOOK_ALREADY, "You've already found the matchbook.");

  // Puzzle: digging
  add(Msg.DIG_NEED_TOOL, "You'd need a tool to dig properly.");
  add(Msg.DIG_ALREADY, "You've already dug here and found the mechanism.");
  add(Msg.DIG_FOUND, 'You dig into the soft earth with the trowel and uncover a small brass mechanism -- gears, pins, and a tiny drum with raised bumps. The innards of a music box.');
  add(Msg.DIG_NOTHING, 'You dig around but find nothing.');

  // Puzzle: winding
  add(Msg.WIND_WRONG_TARGET, "You can't wind {target}.");
  add(Msg.WIND_NO_KEY, 'You need a key to wind the music box.');
  add(Msg.WIND_MISSING_PARTS, 'The music box is still missing its {parts}. It can\'t be wound yet.');
  add(Msg.WIND_SUCCESS, "You insert the winding key and turn it gently. The music box comes alive -- a delicate melody fills the attic, tinkling and sweet.\n\nAs the last note fades, you hear a mechanical click from the steamer trunk -- its lock releases and the lid swings open.");

  // Puzzle: repairing
  add(Msg.REPAIR_COMPLETE, 'The music box has both the mechanism and the spring installed. Try winding it.');
  add(Msg.REPAIR_STATUS, 'The {installed} {installedCount, plural, one {is} other {are}} installed. Still missing: {needed}.');
  add(Msg.REPAIR_NOT_BROKEN, "The {target} doesn't seem to need fixing.");

  // Combining
  add(Msg.COMBINE_PLACED, 'You carefully place the {part} inside the music box.');
  add(Msg.COMBINE_HINT, 'Try: PUT {part} IN something.');
  add(Msg.COMBINE_WHAT, 'Combine what with what?');

  // Simple interactions
  add(Msg.RING_DOORBELL, 'You press the doorbell. A faint chime echoes inside the house, unanswered.');
  add(Msg.RING_CANT, "You can't ring {target}.");
  add(Msg.KNOCK_DOOR, 'You rap your knuckles on the door. No answer.');
  add(Msg.KNOCK_NOTHING, 'Nothing happens.');
  add(Msg.PULL_BUTTON, "It's a push button, not a pull cord. Try pressing it.");
  add(Msg.TURN_SINK, 'You turn the faucet. Rusty water sputters out briefly, then runs clear. Nothing else happens.');
  add(Msg.TURN_CANT, "You can't turn {target}.");
  add(Msg.CLIMB_STAIRS, '(Try going UP to climb the stairs.)');
  add(Msg.CLIMB_CANT, "You can't climb {target}.");
  add(Msg.WEAR_OVERCOAT, "The overcoat is too moth-eaten to wear. It would fall apart.");
  add(Msg.WEAR_CANT, "You can't wear {target}.");
  add(Msg.BURN_CANT, "You can't burn {target}.");

  // Unlock hints
  add(Msg.UNLOCK_TRUNK_HINT, 'The trunk has no keyhole. The lock seems mechanically connected to the shelf above.');
  add(Msg.UNLOCK_NEED_KEY, 'You need a key to unlock that.');
  add(Msg.UNLOCK_NOT_LOCKED, "That isn't locked.");

  // Dial
  add(Msg.DIAL_NO_SAFE, "There's nothing here to dial.");
  add(Msg.DIAL_NOT_VISIBLE, "You don't see anything to dial a combination on.");
  add(Msg.DIAL_WRONG, 'You dial {code}... nothing happens.');

  // USE redirects
  add(Msg.USE_HINT, 'How do you want to use {target}? Try a specific verb: OPEN, PUSH, PULL, TURN, EAT, WEAR, etc.');
  add(Msg.USE_WITH_HINT, 'Try: UNLOCK {other} WITH {item}.');

  // Looking under/behind/searching
  add(Msg.LOOK_UNDER_NOTHING, 'You find nothing under {target}.');
  add(Msg.LOOK_BEHIND_NOTHING, 'You find nothing behind {target}.');
  add(Msg.SEARCH_NOTHING, 'You find nothing of interest in {target}.');
  add(Msg.SEARCH_CLOSED, '{target} is closed.');
  add(Msg.SEARCH_EMPTY, '{target} is empty.');
  add(Msg.SEARCH_CONTENTS, 'Inside {target} you find: {contents}.');
  add(Msg.SEARCH_WHAT, 'Search what?');

  // Interceptor messages
  add(Msg.DOORMAT_TAKE, 'You lift the corner of the doormat.');
  add(Msg.OVERCOAT_TAKE, "The coat is too moth-eaten to carry. But you could search the pockets.");
  add(Msg.DOORBELL_PUSH, 'You press the doorbell. A faint chime echoes inside the house, unanswered.');

  // Meta
  add(Msg.HELP, "Your grandmother left something in this old house for you to find. Search everywhere -- under things, behind things, inside things. Some puzzles require combining objects or using one item with another.\n\nType VERBS for a full list of commands.");
  add(Msg.VERBS, "AVAILABLE COMMANDS:\n\nMovement:  N, S, E, W, U, D (or GO direction)\nLooking:   LOOK, EXAMINE (X), LOOK UNDER, LOOK BEHIND, SEARCH\nTaking:    TAKE, DROP, INVENTORY (I)\nUsing:     OPEN, CLOSE, UNLOCK with, LOCK\nSpecial:   DIG, WIND, RING, KNOCK, BURN, LIGHT, CLIMB, TURN, PULL\nAssembly:  PUT IN, PUT ON, COMBINE with, ATTACH to, INSTALL in\nSelf:      WEAR, EAT, READ\nMeta:      HELP, VERBS, SAVE, RESTORE, QUIT");
  add(Msg.GREETING, 'No one answers. The house is quiet. Type LOOK to see your surroundings, or HELP for hints.');
  add(Msg.WHERE_AM_I, 'You are in {location}.');
  add(Msg.EXAMINE_SELF, '{description}');
  add(Msg.MISSING_NOUN, "What do you want to do that to?");

  // Victory
  add(Msg.LOCKET_FOUND, "You lift the locket from the trunk. Inside, your grandmother smiles back at you from a faded photograph. This is what she wanted you to have.");
  add(Msg.VICTORY, "You found your grandmother's heirloom.");

  // Generic
  add(Msg.NOTHING_HAPPENS, 'Nothing happens.');

  // Stdlib overrides for better feedback
  add('if.action.going.no_exit_that_way', "You can't go that way.");
  add('if.action.taking.already_have', 'You already have that.');
  add('if.action.opening.locked', '{cap:item} is locked.');
  add('if.action.opening.not_openable', "You can't open {item}.");
  add('if.action.opening.already_open', '{cap:item} is already open.');
}
