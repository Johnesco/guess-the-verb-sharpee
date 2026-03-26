/**
 * Guess the Verb — Shared Types and Constants
 *
 * Message IDs, score constants, puzzle trait, helper functions,
 * and typed ID interfaces for rooms and items.
 */

import { StoryConfig } from '@sharpee/engine';
import { IFEntity } from '@sharpee/world-model';
import type { ITrait } from '@sharpee/world-model';
import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import type { ISemanticEvent } from '@sharpee/core';

// ============================================================================
// TYPED ID INTERFACES
// ============================================================================

export interface RoomIds {
  porch: string;
  hallway: string;
  study: string;
  kitchen: string;
  garden: string;
  attic: string;
}

export interface ItemIds {
  ironKey: string;
  matchbook: string;
  windingKey: string;
  clockSpring: string;
  trowel: string;
  mechanism: string;
  locket: string;
  frontDoor: string;
  desk: string;
  wallSafe: string;
  musicBox: string;
  trunk: string;
}

// ============================================================================
// STORY CONFIGURATION
// ============================================================================

export const config: StoryConfig = {
  id: 'guess-the-verb',
  title: 'Guess the Verb',
  author: 'John Googol',
  version: '1.0.0',
  description:
    "Explore your grandmother's old house and find the family heirloom she left behind. Every room tests a different verb pattern.",
};

// ============================================================================
// MESSAGE IDS — all player-facing text goes through the language layer
// ============================================================================

export const Msg = {
  // Puzzle: doormat / iron key
  KEY_FOUND: 'story.key.found',
  KEY_ALREADY: 'story.key.already',

  // Puzzle: painting / wall safe
  PAINTING_MOVED: 'story.painting.moved',
  PAINTING_ALREADY: 'story.painting.already',
  SAFE_NO_COMBO: 'story.safe.no_combo',
  SAFE_OPENED: 'story.safe.opened',
  SAFE_AUTO_OPEN: 'story.safe.auto_open',

  // Puzzle: fireplace / hearthstone
  FIRE_ALREADY: 'story.fire.already',
  FIRE_NO_MATCHES: 'story.fire.no_matches',
  FIRE_LIT: 'story.fire.lit',

  // Puzzle: matchbook
  MATCHBOOK_FOUND: 'story.matchbook.found',
  MATCHBOOK_ALREADY: 'story.matchbook.already',

  // Puzzle: digging / mechanism
  DIG_NEED_TOOL: 'story.dig.need_tool',
  DIG_ALREADY: 'story.dig.already',
  DIG_FOUND: 'story.dig.found',
  DIG_NOTHING: 'story.dig.nothing',

  // Puzzle: music box / winding
  WIND_WRONG_TARGET: 'story.wind.wrong_target',
  WIND_NO_KEY: 'story.wind.no_key',
  WIND_MISSING_PARTS: 'story.wind.missing_parts',
  WIND_SUCCESS: 'story.wind.success',

  // Puzzle: repairing music box
  REPAIR_COMPLETE: 'story.repair.complete',
  REPAIR_STATUS: 'story.repair.status',
  REPAIR_NOT_BROKEN: 'story.repair.not_broken',

  // Combining
  COMBINE_PLACED: 'story.combine.placed',
  COMBINE_HINT: 'story.combine.hint',
  COMBINE_WHAT: 'story.combine.what',

  // Simple interactions
  RING_DOORBELL: 'story.ring.doorbell',
  RING_CANT: 'story.ring.cant',
  KNOCK_DOOR: 'story.knock.door',
  KNOCK_NOTHING: 'story.knock.nothing',
  PULL_BUTTON: 'story.pull.button',
  TURN_SINK: 'story.turn.sink',
  TURN_CANT: 'story.turn.cant',
  CLIMB_STAIRS: 'story.climb.stairs',
  CLIMB_CANT: 'story.climb.cant',
  WEAR_OVERCOAT: 'story.wear.overcoat',
  WEAR_CANT: 'story.wear.cant',
  BURN_CANT: 'story.burn.cant',

  // Unlock hint
  UNLOCK_TRUNK_HINT: 'story.unlock.trunk_hint',
  UNLOCK_NEED_KEY: 'story.unlock.need_key',
  UNLOCK_NOT_LOCKED: 'story.unlock.not_locked',

  // Dial
  DIAL_NO_SAFE: 'story.dial.no_safe',
  DIAL_NOT_VISIBLE: 'story.dial.not_visible',
  DIAL_WRONG: 'story.dial.wrong',

  // USE redirects
  USE_HINT: 'story.use.hint',
  USE_WITH_HINT: 'story.use_with.hint',

  // Looking under/behind/searching
  LOOK_UNDER_NOTHING: 'story.look_under.nothing',
  LOOK_BEHIND_NOTHING: 'story.look_behind.nothing',
  SEARCH_NOTHING: 'story.search.nothing',
  SEARCH_CLOSED: 'story.search.closed',
  SEARCH_EMPTY: 'story.search.empty',
  SEARCH_CONTENTS: 'story.search.contents',
  SEARCH_WHAT: 'story.search.what',

  // Interceptor messages
  DOORMAT_TAKE: 'story.doormat.take_hint',
  OVERCOAT_TAKE: 'story.overcoat.take_hint',
  DOORBELL_PUSH: 'story.doorbell.push',

  // Meta
  HELP: 'story.help',
  VERBS: 'story.verbs',
  GREETING: 'story.greeting',
  WHERE_AM_I: 'story.where_am_i',
  EXAMINE_SELF: 'story.examine_self',
  MISSING_NOUN: 'action.missing_noun',

  // Victory
  LOCKET_FOUND: 'story.locket.found',
  VICTORY: 'story.victory',

  // Generic fallbacks
  NOTHING_HAPPENS: 'story.nothing_happens',
} as const;

// ============================================================================
// SCORE CONSTANTS
// ============================================================================

export const ScoreIds = {
  IRON_KEY_FOUND: 'story.score.iron_key',
  MATCHBOOK_FOUND: 'story.score.matchbook',
  FIREPLACE_LIT: 'story.score.fireplace',
  SAFE_OPENED: 'story.score.safe',
  MECHANISM_FOUND: 'story.score.mechanism',
  MUSIC_BOX_WOUND: 'story.score.music_box',
} as const;

export const ScorePoints: Record<string, number> = {
  [ScoreIds.IRON_KEY_FOUND]: 1,
  [ScoreIds.MATCHBOOK_FOUND]: 1,
  [ScoreIds.FIREPLACE_LIT]: 1,
  [ScoreIds.SAFE_OPENED]: 1,
  [ScoreIds.MECHANISM_FOUND]: 1,
  [ScoreIds.MUSIC_BOX_WOUND]: 2,
};

export const MAX_SCORE = 10;

// ============================================================================
// CUSTOM TRAIT — puzzle prop tagging
// ============================================================================

/**
 * Tags scenery entities with a puzzle ID for interceptor/action lookup.
 *
 * Public interface: type field and propId for puzzle matching.
 * Owner context: story-specific trait, not part of stdlib.
 */
export class PuzzlePropTrait implements ITrait {
  static readonly type = 'story.puzzleProp' as const;
  readonly type = PuzzlePropTrait.type;
  propId: string;
  constructor(propId: string) {
    this.propId = propId;
  }
}

/**
 * Get the puzzle prop ID from an entity, if it has one.
 */
export function getPropId(entity: IFEntity): string | undefined {
  return (entity.get(PuzzlePropTrait.type) as PuzzlePropTrait | undefined)?.propId;
}

// ============================================================================
// ACTION HELPERS
// ============================================================================

/**
 * Create a standard Action object following the 4-phase pattern.
 *
 * @param id - Action ID
 * @param group - Action group for categorization
 * @param phases - Object with validate, execute (optional), report, blocked
 */
export function defineAction(
  id: string,
  group: string,
  phases: {
    validate: (ctx: ActionContext) => ValidationResult;
    execute?: (ctx: ActionContext) => void;
    report: (ctx: ActionContext) => ISemanticEvent[];
    blocked: (ctx: ActionContext, result: ValidationResult) => ISemanticEvent[];
  },
): Action {
  return {
    id,
    group,
    validate: phases.validate,
    execute: phases.execute || (() => {}),
    report: phases.report,
    blocked: phases.blocked,
  };
}

/**
 * Shorthand blocked handler that emits the validation error as a game.message.
 */
export function standardBlocked(ctx: ActionContext, result: ValidationResult): ISemanticEvent[] {
  return [ctx.event('action.blocked', {
    messageId: result.error || Msg.NOTHING_HAPPENS,
    params: result.params || {},
  })];
}
