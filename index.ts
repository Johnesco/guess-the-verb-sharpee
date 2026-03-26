/**
 * Guess the Verb
 *
 * Explore your grandmother's old house and find the family heirloom
 * she left behind. Every room tests a different verb pattern.
 *
 * Public interface: exports `story` singleton for engine consumption.
 * Owner context: standalone game — puzzle-based IF with verb exploration.
 */

import {
  Story,
  StoryConfig,
} from '@sharpee/engine';
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
  DoorTrait,
  registerActionInterceptor,
  clearInterceptorRegistry,
  createEffect,
} from '@sharpee/world-model';
import type { ActionInterceptor, ITrait } from '@sharpee/world-model';
import type { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';
import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';
import type { ISemanticEvent } from '@sharpee/core';

// ============================================================================
// MESSAGE IDS — all player-facing text goes through the language layer
// ============================================================================

const Msg = {
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

const ScoreIds = {
  IRON_KEY_FOUND: 'story.score.iron_key',
  MATCHBOOK_FOUND: 'story.score.matchbook',
  FIREPLACE_LIT: 'story.score.fireplace',
  SAFE_OPENED: 'story.score.safe',
  MECHANISM_FOUND: 'story.score.mechanism',
  MUSIC_BOX_WOUND: 'story.score.music_box',
} as const;

const ScorePoints: Record<string, number> = {
  [ScoreIds.IRON_KEY_FOUND]: 1,
  [ScoreIds.MATCHBOOK_FOUND]: 1,
  [ScoreIds.FIREPLACE_LIT]: 1,
  [ScoreIds.SAFE_OPENED]: 1,
  [ScoreIds.MECHANISM_FOUND]: 1,
  [ScoreIds.MUSIC_BOX_WOUND]: 2,
};

const MAX_SCORE = 10;

// ============================================================================
// CUSTOM TRAIT — puzzle prop tagging
// ============================================================================

/**
 * Tags scenery entities with a puzzle ID for interceptor/action lookup.
 *
 * Public interface: type field and propId for puzzle matching.
 * Owner context: story-specific trait, not part of stdlib.
 */
class PuzzlePropTrait implements ITrait {
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
function getPropId(entity: IFEntity): string | undefined {
  return (entity.get(PuzzlePropTrait.type) as PuzzlePropTrait | undefined)?.propId;
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
// ACTION DEFINITIONS — proper 4-phase pattern
// ============================================================================

/**
 * Create a standard Action object following the 4-phase pattern.
 *
 * @param id - Action ID
 * @param group - Action group for categorization
 * @param phases - Object with validate, execute (optional), report, blocked
 */
function defineAction(
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
function standardBlocked(ctx: ActionContext, result: ValidationResult): ISemanticEvent[] {
  return [ctx.event('action.blocked', {
    messageId: result.error || Msg.NOTHING_HAPPENS,
    params: result.params || {},
  })];
}

// ============================================================================
// STORY CLASS
// ============================================================================

export class GuessTheVerbStory implements Story {
  config = config;

  /** Registry of entity IDs keyed by short name. */
  private q: Record<string, string> = {};

  // =========================================================================
  // World-mutation helpers (called from execute phases)
  // =========================================================================

  /**
   * Reveal the iron key under the doormat.
   * Returns the message ID describing what happened.
   */
  private revealIronKey(world: WorldModel): string {
    const keyId = this.q['iron-key'];
    const porchId = this.q['porch'];
    if (world.getLocation(keyId) === porchId) {
      return Msg.KEY_ALREADY;
    }
    world.moveEntity(keyId, porchId);
    world.awardScore(ScoreIds.IRON_KEY_FOUND, ScorePoints[ScoreIds.IRON_KEY_FOUND], 'Finding the iron key');
    return Msg.KEY_FOUND;
  }

  /**
   * Move the painting to reveal the wall safe.
   * Returns the message ID describing what happened.
   */
  private movePainting(world: WorldModel): string {
    if (world.getStateValue('painting-moved')) {
      return Msg.PAINTING_ALREADY;
    }
    world.setStateValue('painting-moved', true);
    const safe = world.getEntity(this.q['wall-safe']);
    if (safe) {
      const id = safe.get(IdentityTrait);
      if (id) id.concealed = false;
    }
    return Msg.PAINTING_MOVED;
  }

  /**
   * Light the fireplace with a matchbook.
   * Returns the message ID describing what happened.
   */
  private lightFireplace(world: WorldModel, playerId: string): string {
    if (world.getStateValue('fireplace-lit')) {
      return Msg.FIRE_ALREADY;
    }
    const matchLoc = world.getLocation(this.q['matchbook']);
    if (matchLoc !== playerId) {
      return Msg.FIRE_NO_MATCHES;
    }
    world.setStateValue('fireplace-lit', true);
    world.awardScore(ScoreIds.FIREPLACE_LIT, ScorePoints[ScoreIds.FIREPLACE_LIT], 'Lighting the fireplace');

    // Update descriptions to reflect the lit fireplace
    const fp = world.getEntity(this.q['fireplace']);
    if (fp) {
      const id = fp.get(IdentityTrait);
      if (id) id.description = 'The fireplace crackles with warm flames. The logs glow orange.';
    }
    const hs = world.getEntity(this.q['hearthstone']);
    if (hs) {
      const id = hs.get(IdentityTrait);
      if (id) id.description = "In the firelight, you can make out numbers scratched into the hearthstone: 7 - 3 - 9.";
    }
    return Msg.FIRE_LIT;
  }

  /** Create a scenery entity with optional puzzle-prop tagging. */
  private createScenery(
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
    const entity = world.createEntity(name, EntityType.ITEM);
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
      this.q[opts.propId] = entity.id;
    }
    world.moveEntity(entity.id, locationId);
    return entity;
  }

  // =========================================================================
  // Custom actions — 4-phase pattern
  // =========================================================================

  /**
   * Return all story-specific actions.
   */
  getCustomActions() {
    return [
      // --- LOOKING UNDER ---
      defineAction('story.action.looking-under', 'perception', {
        validate(ctx) {
          const target = ctx.command?.directObject?.entity;
          if (!target) return { valid: false, error: Msg.MISSING_NOUN };
          ctx.sharedData.target = target;
          return { valid: true };
        },
        execute: (ctx) => {
          const target = ctx.sharedData.target as IFEntity;
          const propId = getPropId(target);
          if (propId === 'doormat') {
            ctx.sharedData.messageId = this.revealIronKey(ctx.world);
          } else if (propId === 'painting') {
            ctx.sharedData.messageId = this.movePainting(ctx.world);
          } else {
            ctx.sharedData.messageId = Msg.LOOK_UNDER_NOTHING;
          }
        },
        report(ctx) {
          const target = ctx.sharedData.target as IFEntity;
          return [ctx.event('action.success', {
            messageId: ctx.sharedData.messageId,
            params: { target: target.name },
          })];
        },
        blocked: standardBlocked,
      }),

      // --- LOOKING BEHIND ---
      defineAction('story.action.looking-behind', 'perception', {
        validate(ctx) {
          const target = ctx.command?.directObject?.entity;
          if (!target) return { valid: false, error: Msg.MISSING_NOUN };
          ctx.sharedData.target = target;
          return { valid: true };
        },
        execute: (ctx) => {
          const target = ctx.sharedData.target as IFEntity;
          const propId = getPropId(target);
          if (propId === 'painting') {
            ctx.sharedData.messageId = this.movePainting(ctx.world);
          } else {
            ctx.sharedData.messageId = Msg.LOOK_BEHIND_NOTHING;
          }
        },
        report(ctx) {
          const target = ctx.sharedData.target as IFEntity;
          return [ctx.event('action.success', {
            messageId: ctx.sharedData.messageId,
            params: { target: target.name },
          })];
        },
        blocked: standardBlocked,
      }),

      // --- SEARCHING ---
      defineAction('story.action.searching', 'perception', {
        validate(ctx) {
          const target = ctx.command?.directObject?.entity;
          if (!target) return { valid: false, error: Msg.SEARCH_WHAT };
          ctx.sharedData.target = target;
          return { valid: true };
        },
        execute: (ctx) => {
          const target = ctx.sharedData.target as IFEntity;
          const propId = getPropId(target);

          if (propId === 'doormat') {
            ctx.sharedData.messageId = this.revealIronKey(ctx.world);
            return;
          }
          if (propId === 'overcoat' || propId === 'coat-rack') {
            const mbLoc = ctx.world.getLocation(this.q['matchbook']);
            if (mbLoc === ctx.player.id) {
              ctx.sharedData.messageId = Msg.MATCHBOOK_ALREADY;
              return;
            }
            ctx.world.moveEntity(this.q['matchbook'], ctx.player.id);
            ctx.world.awardScore(ScoreIds.MATCHBOOK_FOUND, ScorePoints[ScoreIds.MATCHBOOK_FOUND], 'Finding the matchbook');
            ctx.sharedData.messageId = Msg.MATCHBOOK_FOUND;
            return;
          }
          if (target.isContainer) {
            if (target.isOpenable && !target.isOpen) {
              ctx.sharedData.messageId = Msg.SEARCH_CLOSED;
              return;
            }
            const contents = ctx.world.getContents(target.id);
            if (contents.length === 0) {
              ctx.sharedData.messageId = Msg.SEARCH_EMPTY;
              return;
            }
            ctx.sharedData.messageId = Msg.SEARCH_CONTENTS;
            ctx.sharedData.contentNames = contents.map((e: IFEntity) => e.name).join(', ');
            return;
          }
          ctx.sharedData.messageId = Msg.SEARCH_NOTHING;
        },
        report(ctx) {
          const target = ctx.sharedData.target as IFEntity;
          return [ctx.event('action.success', {
            messageId: ctx.sharedData.messageId,
            params: { target: target.name, contents: ctx.sharedData.contentNames || '' },
          })];
        },
        blocked: standardBlocked,
      }),

      // --- DIGGING ---
      defineAction('story.action.digging', 'special', {
        validate(ctx) {
          const target = ctx.command?.directObject?.entity;
          if (!target) return { valid: false, error: Msg.MISSING_NOUN };
          ctx.sharedData.target = target;
          return { valid: true };
        },
        execute: (ctx) => {
          const target = ctx.sharedData.target as IFEntity;
          const propId = getPropId(target);
          if (propId === 'flower-bed') {
            const trowelLoc = ctx.world.getLocation(this.q['trowel']);
            if (trowelLoc !== ctx.player.id) {
              ctx.sharedData.messageId = Msg.DIG_NEED_TOOL;
              return;
            }
            const mechLoc = ctx.world.getLocation(this.q['mechanism']);
            if (mechLoc) {
              ctx.sharedData.messageId = Msg.DIG_ALREADY;
              return;
            }
            ctx.world.moveEntity(this.q['mechanism'], this.q['garden']);
            ctx.world.awardScore(ScoreIds.MECHANISM_FOUND, ScorePoints[ScoreIds.MECHANISM_FOUND], 'Unearthing the mechanism');
            ctx.sharedData.messageId = Msg.DIG_FOUND;
            return;
          }
          ctx.sharedData.messageId = Msg.DIG_NOTHING;
        },
        report(ctx) {
          return [ctx.event('action.success', { messageId: ctx.sharedData.messageId })];
        },
        blocked: standardBlocked,
      }),

      // --- DIGGING HERE (no target) ---
      defineAction('story.action.digging-here', 'special', {
        validate: () => ({ valid: true }),
        execute: (ctx) => {
          const playerLoc = ctx.world.getLocation(ctx.player.id);
          if (playerLoc === this.q['garden']) {
            const trowelLoc = ctx.world.getLocation(this.q['trowel']);
            if (trowelLoc !== ctx.player.id) {
              ctx.sharedData.messageId = Msg.DIG_NEED_TOOL;
              return;
            }
            const mechLoc = ctx.world.getLocation(this.q['mechanism']);
            if (mechLoc) {
              ctx.sharedData.messageId = Msg.DIG_ALREADY;
              return;
            }
            ctx.world.moveEntity(this.q['mechanism'], this.q['garden']);
            ctx.world.awardScore(ScoreIds.MECHANISM_FOUND, ScorePoints[ScoreIds.MECHANISM_FOUND], 'Unearthing the mechanism');
            ctx.sharedData.messageId = Msg.DIG_FOUND;
            return;
          }
          ctx.sharedData.messageId = Msg.DIG_NOTHING;
        },
        report(ctx) {
          return [ctx.event('action.success', { messageId: ctx.sharedData.messageId })];
        },
        blocked: standardBlocked,
      }),

      // --- WINDING ---
      defineAction('story.action.winding', 'special', {
        validate: (ctx) => {
          const target = ctx.command?.directObject?.entity;
          if (!target) return { valid: false, error: Msg.MISSING_NOUN };
          ctx.sharedData.target = target;
          if (target.id !== this.q['music-box']) {
            return { valid: false, error: Msg.WIND_WRONG_TARGET, params: { target: target.name } };
          }
          const wkLoc = ctx.world.getLocation(this.q['winding-key']);
          if (wkLoc !== ctx.player.id) {
            return { valid: false, error: Msg.WIND_NO_KEY };
          }
          const contents = ctx.world.getContents(this.q['music-box']);
          const hasMech = contents.some((e: IFEntity) => e.id === this.q['mechanism']);
          const hasSpring = contents.some((e: IFEntity) => e.id === this.q['spring']);
          if (!hasMech || !hasSpring) {
            const missing: string[] = [];
            if (!hasMech) missing.push('mechanism');
            if (!hasSpring) missing.push('spring');
            return { valid: false, error: Msg.WIND_MISSING_PARTS, params: { parts: missing.join(' and ') } };
          }
          return { valid: true };
        },
        execute: (ctx) => {
          // Unlock the trunk — the music box melody releases the mechanical lock
          const trunk = ctx.world.getEntity(this.q['trunk']);
          if (trunk) {
            const lockable = trunk.get(LockableTrait);
            const openable = trunk.get(OpenableTrait);
            if (lockable) lockable.isLocked = false;
            if (openable) openable.isOpen = true;
          }
          ctx.world.awardScore(ScoreIds.MUSIC_BOX_WOUND, ScorePoints[ScoreIds.MUSIC_BOX_WOUND], 'Winding the music box');
        },
        report(ctx) {
          return [ctx.event('action.success', { messageId: Msg.WIND_SUCCESS })];
        },
        blocked: standardBlocked,
      }),

      // --- RINGING ---
      defineAction('story.action.ringing', 'special', {
        validate(ctx) {
          const target = ctx.command?.directObject?.entity;
          if (!target) return { valid: false, error: Msg.MISSING_NOUN };
          ctx.sharedData.target = target;
          return { valid: true };
        },
        execute() {},
        report(ctx) {
          const target = ctx.sharedData.target as IFEntity;
          const propId = getPropId(target);
          const messageId = propId === 'doorbell' ? Msg.RING_DOORBELL : Msg.RING_CANT;
          return [ctx.event('action.success', { messageId, params: { target: target.name } })];
        },
        blocked: standardBlocked,
      }),

      // --- KNOCKING ---
      defineAction('story.action.knocking', 'special', {
        validate(ctx) {
          const target = ctx.command?.directObject?.entity;
          if (!target) return { valid: false, error: Msg.MISSING_NOUN };
          ctx.sharedData.target = target;
          return { valid: true };
        },
        execute() {},
        report(ctx) {
          const target = ctx.sharedData.target as IFEntity;
          const messageId = target.name?.includes('door') ? Msg.KNOCK_DOOR : Msg.KNOCK_NOTHING;
          return [ctx.event('action.success', { messageId })];
        },
        blocked: standardBlocked,
      }),

      // --- REPAIRING ---
      defineAction('story.action.repairing', 'special', {
        validate: (ctx) => {
          const target = ctx.command?.directObject?.entity;
          if (!target) return { valid: false, error: Msg.MISSING_NOUN };
          ctx.sharedData.target = target;
          return { valid: true };
        },
        execute() {},
        report: (ctx) => {
          const target = ctx.sharedData.target as IFEntity;
          if (target.id === this.q['music-box']) {
            const contents = ctx.world.getContents(this.q['music-box']);
            const hasMech = contents.some((e: IFEntity) => e.id === this.q['mechanism']);
            const hasSpring = contents.some((e: IFEntity) => e.id === this.q['spring']);
            if (hasMech && hasSpring) {
              return [ctx.event('action.success', { messageId: Msg.REPAIR_COMPLETE })];
            }
            const installed: string[] = [];
            const needed: string[] = [];
            if (hasMech) installed.push('mechanism'); else needed.push('mechanism');
            if (hasSpring) installed.push('spring'); else needed.push('spring');
            return [ctx.event('action.success', {
              messageId: Msg.REPAIR_STATUS,
              params: {
                installed: installed.join(' and '),
                needed: needed.join(' and '),
                installedCount: installed.length,
              },
            })];
          }
          return [ctx.event('action.success', { messageId: Msg.REPAIR_NOT_BROKEN, params: { target: target.name } })];
        },
        blocked: standardBlocked,
      }),

      // --- PULLING ---
      defineAction('story.action.pulling', 'manipulation', {
        validate(ctx) {
          const target = ctx.command?.directObject?.entity;
          if (!target) return { valid: false, error: Msg.MISSING_NOUN };
          ctx.sharedData.target = target;
          return { valid: true };
        },
        execute: (ctx) => {
          const target = ctx.sharedData.target as IFEntity;
          const propId = getPropId(target);
          if (propId === 'painting') {
            ctx.sharedData.messageId = this.movePainting(ctx.world);
          } else if (propId === 'doorbell') {
            ctx.sharedData.messageId = Msg.PULL_BUTTON;
          } else {
            ctx.sharedData.messageId = Msg.NOTHING_HAPPENS;
          }
        },
        report(ctx) {
          return [ctx.event('action.success', { messageId: ctx.sharedData.messageId })];
        },
        blocked: standardBlocked,
      }),

      // --- TURNING ---
      defineAction('story.action.turning', 'manipulation', {
        validate(ctx) {
          const target = ctx.command?.directObject?.entity;
          if (!target) return { valid: false, error: Msg.MISSING_NOUN };
          ctx.sharedData.target = target;
          return { valid: true };
        },
        execute: (ctx) => {
          const target = ctx.sharedData.target as IFEntity;
          const propId = getPropId(target);
          if (propId === 'painting') {
            ctx.sharedData.messageId = this.movePainting(ctx.world);
          } else if (propId === 'sink') {
            ctx.sharedData.messageId = Msg.TURN_SINK;
          } else {
            ctx.sharedData.messageId = Msg.TURN_CANT;
          }
        },
        report(ctx) {
          const target = ctx.sharedData.target as IFEntity;
          return [ctx.event('action.success', { messageId: ctx.sharedData.messageId, params: { target: target.name } })];
        },
        blocked: standardBlocked,
      }),

      // --- CLIMBING ---
      defineAction('story.action.climbing', 'movement', {
        validate(ctx) {
          const target = ctx.command?.directObject?.entity;
          if (!target) return { valid: false, error: Msg.MISSING_NOUN };
          ctx.sharedData.target = target;
          return { valid: true };
        },
        execute() {},
        report(ctx) {
          const target = ctx.sharedData.target as IFEntity;
          const propId = getPropId(target);
          const messageId = propId === 'staircase' ? Msg.CLIMB_STAIRS : Msg.CLIMB_CANT;
          return [ctx.event('action.success', { messageId, params: { target: target.name } })];
        },
        blocked: standardBlocked,
      }),

      // --- UNLOCKING (story hint for trunk; stdlib handles door+key) ---
      defineAction('story.action.unlocking', 'manipulation', {
        validate(ctx) {
          const target = ctx.command?.directObject?.entity;
          if (!target) return { valid: false, error: Msg.MISSING_NOUN };
          ctx.sharedData.target = target;
          return { valid: true };
        },
        execute() {},
        report: (ctx) => {
          const target = ctx.sharedData.target as IFEntity;
          let messageId: string;
          if (target.id === this.q['trunk']) {
            messageId = Msg.UNLOCK_TRUNK_HINT;
          } else if (target.isLocked) {
            messageId = Msg.UNLOCK_NEED_KEY;
          } else {
            messageId = Msg.UNLOCK_NOT_LOCKED;
          }
          return [ctx.event('action.success', { messageId })];
        },
        blocked: standardBlocked,
      }),

      // --- COMBINING ---
      defineAction('story.action.combining', 'special', {
        validate(ctx) {
          const item = ctx.command?.directObject?.entity;
          const other = ctx.command?.indirectObject?.entity;
          if (!item || !other) return { valid: false, error: Msg.COMBINE_WHAT };
          ctx.sharedData.item = item;
          ctx.sharedData.other = other;
          return { valid: true };
        },
        execute: (ctx) => {
          const item = ctx.sharedData.item as IFEntity;
          const other = ctx.sharedData.other as IFEntity;
          if (item.id === this.q['music-box'] || other.id === this.q['music-box']) {
            const box = item.id === this.q['music-box'] ? item : other;
            const part = item.id === this.q['music-box'] ? other : item;
            ctx.world.moveEntity(part.id, box.id);
            ctx.sharedData.messageId = Msg.COMBINE_PLACED;
            ctx.sharedData.partName = part.name;
          } else {
            ctx.sharedData.messageId = Msg.COMBINE_HINT;
            ctx.sharedData.partName = item.name;
          }
        },
        report(ctx) {
          return [ctx.event('action.success', {
            messageId: ctx.sharedData.messageId,
            params: { part: ctx.sharedData.partName },
          })];
        },
        blocked: standardBlocked,
      }),

      // --- WEARING ---
      defineAction('story.action.wearing', 'manipulation', {
        validate(ctx) {
          const target = ctx.command?.directObject?.entity;
          if (!target) return { valid: false, error: Msg.MISSING_NOUN };
          ctx.sharedData.target = target;
          return { valid: true };
        },
        execute() {},
        report(ctx) {
          const target = ctx.sharedData.target as IFEntity;
          const propId = getPropId(target);
          const messageId = propId === 'overcoat' ? Msg.WEAR_OVERCOAT : Msg.WEAR_CANT;
          return [ctx.event('action.success', { messageId, params: { target: target.name } })];
        },
        blocked: standardBlocked,
      }),

      // --- DIALING ---
      defineAction('story.action.dialing', 'special', {
        validate: (ctx) => {
          const playerLoc = ctx.world.getLocation(ctx.player.id);
          if (playerLoc !== this.q['study']) {
            return { valid: false, error: Msg.DIAL_NO_SAFE };
          }
          if (!ctx.world.getStateValue('painting-moved')) {
            return { valid: false, error: Msg.DIAL_NOT_VISIBLE };
          }
          return { valid: true };
        },
        execute: (ctx) => {
          const textSlots = ctx.command?.parsed?.textSlots as Map<string, string> | undefined;
          const rawCode = textSlots ? Array.from(textSlots.values()).join('') : '';
          const code = rawCode.replace(/[^0-9]/g, '');

          if (code === '739') {
            const safe = ctx.world.getEntity(this.q['wall-safe']);
            if (safe) {
              const lockable = safe.get(LockableTrait);
              const openable = safe.get(OpenableTrait);
              if (lockable) lockable.isLocked = false;
              if (openable) openable.isOpen = true;
            }
            ctx.world.awardScore(ScoreIds.SAFE_OPENED, ScorePoints[ScoreIds.SAFE_OPENED], 'Opening the wall safe');
            ctx.sharedData.messageId = Msg.SAFE_OPENED;
          } else {
            ctx.sharedData.messageId = Msg.DIAL_WRONG;
            ctx.sharedData.rawCode = rawCode;
          }
        },
        report(ctx) {
          return [ctx.event('action.success', {
            messageId: ctx.sharedData.messageId,
            params: { code: ctx.sharedData.rawCode || '' },
          })];
        },
        blocked: standardBlocked,
      }),

      // --- HELP ---
      defineAction('story.action.help', 'meta', {
        validate: () => ({ valid: true }),
        report(ctx) {
          return [ctx.event('action.success', { messageId: Msg.HELP })];
        },
        blocked: standardBlocked,
      }),

      // --- VERBS ---
      defineAction('story.action.verbs', 'meta', {
        validate: () => ({ valid: true }),
        report(ctx) {
          return [ctx.event('action.success', { messageId: Msg.VERBS })];
        },
        blocked: standardBlocked,
      }),

      // --- BURNING / LIGHTING ---
      defineAction('if.action.burning', 'special', {
        validate(ctx) {
          const target = ctx.command?.directObject?.entity;
          if (!target) return { valid: false, error: Msg.MISSING_NOUN };
          ctx.sharedData.target = target;
          return { valid: true };
        },
        execute: (ctx) => {
          const target = ctx.sharedData.target as IFEntity;
          const propId = getPropId(target);
          if (propId === 'fireplace') {
            ctx.sharedData.messageId = this.lightFireplace(ctx.world, ctx.player.id);
          } else {
            ctx.sharedData.messageId = Msg.BURN_CANT;
          }
        },
        report(ctx) {
          const target = ctx.sharedData.target as IFEntity;
          return [ctx.event('action.success', {
            messageId: ctx.sharedData.messageId,
            params: { target: target.name },
          })];
        },
        blocked: standardBlocked,
      }),

      // --- USE (redirect) ---
      defineAction('story.action.use', 'special', {
        validate(ctx) {
          const target = ctx.command?.directObject?.entity;
          if (!target) return { valid: false, error: Msg.MISSING_NOUN };
          ctx.sharedData.target = target;
          return { valid: true };
        },
        report(ctx) {
          const target = ctx.sharedData.target as IFEntity;
          return [ctx.event('action.success', { messageId: Msg.USE_HINT, params: { target: target.name } })];
        },
        blocked: standardBlocked,
      }),

      // --- USE WITH ---
      defineAction('story.action.use-with', 'special', {
        validate(ctx) {
          const item = ctx.command?.directObject?.entity;
          const other = ctx.command?.indirectObject?.entity;
          if (!item || !other) return { valid: false, error: Msg.MISSING_NOUN };
          ctx.sharedData.item = item;
          ctx.sharedData.other = other;
          return { valid: true };
        },
        report(ctx) {
          const item = ctx.sharedData.item as IFEntity;
          const other = ctx.sharedData.other as IFEntity;
          const messageId = other.isLockable ? Msg.USE_WITH_HINT : Msg.COMBINE_HINT;
          return [ctx.event('action.success', {
            messageId,
            params: { item: item.name, other: other.name },
          })];
        },
        blocked: standardBlocked,
      }),

      // --- WHERE AM I ---
      defineAction('story.action.where-am-i', 'meta', {
        validate: () => ({ valid: true }),
        report(ctx) {
          const locId = ctx.world.getLocation(ctx.player.id);
          const loc = locId ? ctx.world.getEntity(locId) : null;
          return [ctx.event('action.success', {
            messageId: Msg.WHERE_AM_I,
            params: { location: loc?.name || 'an unknown place' },
          })];
        },
        blocked: standardBlocked,
      }),

      // --- EXAMINE SELF ---
      defineAction('story.action.examine-self', 'meta', {
        validate: () => ({ valid: true }),
        report(ctx) {
          const p = ctx.world.getPlayer();
          return [ctx.event('action.success', {
            messageId: Msg.EXAMINE_SELF,
            params: { description: p?.description || 'As good-looking as ever.' },
          })];
        },
        blocked: standardBlocked,
      }),

      // --- GREETING ---
      defineAction('story.action.greeting', 'meta', {
        validate: () => ({ valid: true }),
        report(ctx) {
          return [ctx.event('action.success', { messageId: Msg.GREETING })];
        },
        blocked: standardBlocked,
      }),
    ];
  }

  // =========================================================================
  // Action interceptors — no mutations in preValidate
  // =========================================================================

  private getInterceptors(): { actionId: string; interceptor: ActionInterceptor }[] {
    return [
      // TAKE doormat -> reveal key instead
      {
        actionId: 'if.action.taking',
        interceptor: {
          preValidate: (entity: IFEntity) => {
            const propId = getPropId(entity);
            if (propId === 'doormat') return { valid: false, error: 'story.doormat.take' };
            if (propId === 'overcoat') return { valid: false, error: 'story.overcoat.take' };
            return null;
          },
          onBlocked: (entity: IFEntity, world: WorldModel) => {
            const propId = getPropId(entity);
            if (propId === 'doormat') {
              const messageId = this.revealIronKey(world);
              return [createEffect('game.message', { messageId })];
            }
            if (propId === 'overcoat') {
              return [createEffect('game.message', { messageId: Msg.OVERCOAT_TAKE })];
            }
            return null;
          },
        },
      },

      // PUSH doorbell -> chime; PUSH painting -> reveal safe
      {
        actionId: 'if.action.pushing',
        interceptor: {
          preValidate: (entity: IFEntity) => {
            const propId = getPropId(entity);
            if (propId === 'doorbell') return { valid: false, error: 'story.doorbell.push' };
            if (propId === 'painting') return { valid: false, error: 'story.painting.push' };
            return null;
          },
          onBlocked: (entity: IFEntity, world: WorldModel) => {
            const propId = getPropId(entity);
            if (propId === 'doorbell') {
              return [createEffect('game.message', { messageId: Msg.DOORBELL_PUSH })];
            }
            if (propId === 'painting') {
              const messageId = this.movePainting(world);
              return [createEffect('game.message', { messageId })];
            }
            return null;
          },
        },
      },

      // SWITCH ON fireplace -> light it
      {
        actionId: 'if.action.switching_on',
        interceptor: {
          preValidate: (entity: IFEntity) => {
            const propId = getPropId(entity);
            if (propId === 'fireplace') return { valid: false, error: 'story.fireplace.switch' };
            return null;
          },
          onBlocked: (entity: IFEntity, world: WorldModel, actorId: string) => {
            const propId = getPropId(entity);
            if (propId === 'fireplace') {
              const messageId = this.lightFireplace(world, actorId);
              return [createEffect('game.message', { messageId })];
            }
            return null;
          },
        },
      },

      // OPEN safe -> auto-dial if fireplace lit (no mutations in preValidate)
      {
        actionId: 'if.action.opening',
        interceptor: {
          preValidate: (entity: IFEntity, world: WorldModel) => {
            const propId = getPropId(entity);
            if (propId === 'wall-safe') {
              const lockable = entity.get(LockableTrait);
              if (lockable?.isLocked) {
                if (!world.getStateValue('fireplace-lit')) {
                  return { valid: false, error: 'story.safe.no-combo' };
                }
                // Player knows the combo — block and handle in onBlocked
                return { valid: false, error: 'story.safe.auto-open' };
              }
            }
            return null;
          },
          onBlocked: (entity: IFEntity, world: WorldModel, _actorId: string, error: string) => {
            if (error === 'story.safe.no-combo') {
              return [createEffect('game.message', { messageId: Msg.SAFE_NO_COMBO })];
            }
            if (error === 'story.safe.auto-open') {
              // Mutation happens here in the blocked handler, not in preValidate
              const lockable = entity.get(LockableTrait);
              const openable = entity.get(OpenableTrait);
              if (lockable) lockable.isLocked = false;
              if (openable) openable.isOpen = true;
              world.awardScore(ScoreIds.SAFE_OPENED, ScorePoints[ScoreIds.SAFE_OPENED], 'Opening the wall safe');
              return [createEffect('game.message', { messageId: Msg.SAFE_AUTO_OPEN })];
            }
            return null;
          },
        },
      },
    ];
  }

  // =========================================================================
  // Plugins
  // =========================================================================

  private createWinCheckPlugin(): TurnPlugin {
    return {
      id: 'story.win-check',
      priority: 1000,
      onAfterAction: (ctx: TurnPluginContext): ISemanticEvent[] => {
        if (ctx.world.getScore() >= MAX_SCORE) {
          return [
            { type: 'game.message', data: { messageId: Msg.VICTORY } } as any,
            { type: 'game.ended', data: { reason: 'victory' } } as any,
          ];
        }
        return [];
      },
    };
  }

  private createMovementTrackingPlugin(): TurnPlugin {
    return {
      id: 'story.movement-tracking',
      priority: 10,
      onAfterAction(ctx: TurnPluginContext): ISemanticEvent[] {
        if (ctx.actionResult?.actionId === 'if.action.going' && ctx.actionResult?.success) {
          for (const evt of (ctx.actionEvents || [])) {
            if (evt.type === 'if.event.actor_moved' && (evt.data as any)?.fromRoom) {
              ctx.world.setStateValue('last-room', (evt.data as any).fromRoom);
              break;
            }
          }
        }
        return [];
      },
    };
  }

  private createFirstTakePlugin(): TurnPlugin {
    return {
      id: 'story.first-take',
      priority: 100,
      onAfterAction: (ctx: TurnPluginContext): ISemanticEvent[] => {
        const result = ctx.actionResult;
        if (
          result?.actionId === 'if.action.taking' &&
          result?.success &&
          result?.targetId === this.q['locket']
        ) {
          return [{ type: 'game.message', data: { messageId: Msg.LOCKET_FOUND } } as any];
        }
        return [];
      },
    };
  }

  private createDescriptionPlugin(): TurnPlugin {
    return {
      id: 'story.descriptions',
      priority: 50,
      onAfterAction: (ctx: TurnPluginContext): ISemanticEvent[] => {
        const world = ctx.world;

        // Dynamic desk description
        const desk = world.getEntity(this.q['desk']);
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
        const box = world.getEntity(this.q['music-box']);
        if (box) {
          const id = box.get(IdentityTrait);
          if (id) {
            const contents = world.getContents(this.q['music-box']);
            const parts = contents
              .filter((e: IFEntity) => e.id === this.q['mechanism'] || e.id === this.q['spring'])
              .map((e: IFEntity) => e.name);
            if (parts.length === 0) {
              id.description = 'A wooden music box with a rose-carved lid and a small keyhole on the side. Inside, the cavity is empty -- the mechanism has been removed.';
            } else if (parts.length === 1) {
              id.description = `A wooden music box with a rose-carved lid. The ${parts[0]} has been installed inside.`;
            } else {
              id.description = 'A wooden music box with a rose-carved lid. The mechanism and spring are installed inside, ready to be wound.';
            }
          }
        }

        // Dynamic trunk description
        const trunk = world.getEntity(this.q['trunk']);
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
        const safe = world.getEntity(this.q['wall-safe']);
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

  // =========================================================================
  // Story interface: createPlayer
  // =========================================================================

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
  }

  // =========================================================================
  // Story interface: initializeWorld
  // =========================================================================

  initializeWorld(world: WorldModel): void {
    world.setMaxScore(MAX_SCORE);

    // === ROOMS ===

    const porch = world.createEntity('Front Porch', EntityType.ROOM);
    porch.add(new IdentityTrait({
      name: 'Front Porch',
      description: "A sagging wooden porch wraps around the front of the house. A woven doormat lies before the front door. A tarnished brass doorbell is set beside the frame.\n\nThe front door leads inside to the east.",
      properName: true,
    }));
    porch.add(new RoomTrait());
    this.q['porch'] = porch.id;

    const hallway = world.createEntity('Hallway', EntityType.ROOM);
    hallway.add(new IdentityTrait({
      name: 'Hallway',
      description: "A dim hallway with faded wallpaper and creaking floorboards. A coat rack stands by the door with an old overcoat hanging from it.\n\nDoors lead east to a study and south to the kitchen. A narrow staircase leads up.",
      properName: true,
    }));
    hallway.add(new RoomTrait());
    this.q['hallway'] = hallway.id;

    const study = world.createEntity('Study', EntityType.ROOM);
    study.add(new IdentityTrait({
      name: 'Study',
      description: "A wood-paneled study with built-in bookshelves. A heavy desk sits in the center, its drawers shut. An oil painting of a woman hangs on the far wall. A stone fireplace squats in the corner, cold and dark.\n\nThe hallway is back to the west.",
      properName: true,
    }));
    study.add(new RoomTrait());
    this.q['study'] = study.id;

    const kitchen = world.createEntity('Kitchen', EntityType.ROOM);
    kitchen.add(new IdentityTrait({
      name: 'Kitchen',
      description: "A rustic kitchen with stone counters and a deep ceramic sink. Copper pots hang from hooks above. A handwritten recipe card sits on the counter.\n\nThe hallway is north. A doorway leads south to the garden.",
      properName: true,
    }));
    kitchen.add(new RoomTrait());
    this.q['kitchen'] = kitchen.id;

    const garden = world.createEntity('Garden', EntityType.ROOM);
    garden.add(new IdentityTrait({
      name: 'Garden',
      description: "An overgrown garden behind the house. A flower bed runs along the back wall, thick with weeds. A small shed leans in one corner with its door ajar. A rusty trowel leans against the shed.\n\nThe kitchen doorway is back to the north.",
      properName: true,
    }));
    garden.add(new RoomTrait({ outdoor: true }));
    this.q['garden'] = garden.id;

    const attic = world.createEntity('Attic', EntityType.ROOM);
    attic.add(new IdentityTrait({
      name: 'Attic',
      description: "A cramped attic under sloping eaves, thick with dust. A dusty shelf holds an old music box. A heavy steamer trunk sits against the wall.\n\nThe stairs lead back down.",
      properName: true,
    }));
    attic.add(new RoomTrait());
    this.q['attic'] = attic.id;

    // === KEY (created before door so keyId can reference it) ===

    const ironKey = world.createEntity('iron key', EntityType.ITEM);
    ironKey.add(new IdentityTrait({
      name: 'iron key',
      description: 'A heavy iron key, dark with age.',
      aliases: ['old key', 'heavy key', 'house key', 'key'],
      adjectives: ['iron', 'heavy', 'old'],
      article: 'an',
    }));
    this.q['iron-key'] = ironKey.id;
    // Key is NOT placed anywhere initially — revealed by looking under doormat

    // === DOOR (EntityType.DOOR + DoorTrait + LockableTrait.keyId) ===

    const frontDoor = world.createEntity('front door', EntityType.DOOR);
    frontDoor.add(new IdentityTrait({
      name: 'front door',
      description: 'A heavy oak door with peeling green paint and an old-fashioned keyhole.',
      aliases: ['oak door', 'door', 'keyhole'],
      adjectives: ['front', 'oak', 'heavy', 'green'],
      article: 'the',
    }));
    frontDoor.add(new OpenableTrait({ isOpen: false }));
    frontDoor.add(new LockableTrait({ isLocked: true, keyId: ironKey.id }));
    frontDoor.add(new DoorTrait({ room1: porch.id, room2: hallway.id }));
    frontDoor.add(new SceneryTrait());
    world.moveEntity(frontDoor.id, porch.id);
    this.q['front-door'] = frontDoor.id;

    // === ROOM CONNECTIONS ===

    const porchRoom = porch.get(RoomTrait);
    const hallwayRoom = hallway.get(RoomTrait);
    if (porchRoom) porchRoom.exits[Direction.EAST] = { destination: hallway.id, via: frontDoor.id };
    if (hallwayRoom) hallwayRoom.exits[Direction.WEST] = { destination: porch.id, via: frontDoor.id };

    world.connectRooms(hallway.id, study.id, Direction.EAST);
    world.connectRooms(hallway.id, kitchen.id, Direction.SOUTH);
    world.connectRooms(hallway.id, attic.id, Direction.UP);
    world.connectRooms(kitchen.id, garden.id, Direction.SOUTH);

    // === PORTABLE ITEMS ===

    const matchbook = world.createEntity('matchbook', EntityType.ITEM);
    matchbook.add(new IdentityTrait({
      name: 'matchbook',
      description: "A small book of matches from 'The Golden Lantern.' A few matches remain.",
      aliases: ['matches', 'match', 'book of matches'],
      adjectives: ['small'],
      article: 'a',
    }));
    this.q['matchbook'] = matchbook.id;
    // Hidden in overcoat, revealed by searching

    const windingKey = world.createEntity('winding key', EntityType.ITEM);
    windingKey.add(new IdentityTrait({
      name: 'winding key',
      description: 'A small key shaped like a butterfly, clearly meant for winding something delicate.',
      aliases: ['butterfly key', 'small key', 'delicate key', 'key'],
      adjectives: ['winding', 'butterfly', 'small', 'delicate'],
      article: 'a',
      points: 1,
      pointsDescription: 'Finding the winding key',
    }));
    this.q['winding-key'] = windingKey.id;

    const clockSpring = world.createEntity('clock spring', EntityType.ITEM);
    clockSpring.add(new IdentityTrait({
      name: 'clock spring',
      description: 'A tightly coiled metal spring, the kind found inside clockwork.',
      aliases: ['spring', 'coiled spring', 'metal spring', 'coil'],
      adjectives: ['clock', 'coiled', 'metal', 'tightly'],
      article: 'a',
    }));
    this.q['spring'] = clockSpring.id;

    const trowel = world.createEntity('garden trowel', EntityType.ITEM);
    trowel.add(new IdentityTrait({
      name: 'garden trowel',
      description: 'A short-handled garden trowel, rusty but solid.',
      aliases: ['trowel', 'spade', 'shovel', 'tool'],
      adjectives: ['garden', 'rusty', 'short-handled'],
      article: 'a',
    }));
    world.moveEntity(trowel.id, garden.id);
    this.q['trowel'] = trowel.id;

    const mechanism = world.createEntity('brass mechanism', EntityType.ITEM);
    mechanism.add(new IdentityTrait({
      name: 'brass mechanism',
      description: 'A small brass mechanism -- gears, pins, and a tiny drum with raised bumps. The innards of a music box.',
      aliases: ['mechanism', 'gears', 'gear', 'clockwork', 'innards', 'drum', 'pins', 'pin', 'brass thing'],
      adjectives: ['brass', 'small'],
      article: 'a',
    }));
    this.q['mechanism'] = mechanism.id;
    // Hidden in flower bed, revealed by digging

    const locket = world.createEntity('family locket', EntityType.ITEM);
    locket.add(new IdentityTrait({
      name: 'family locket',
      description: 'A silver locket on a fine chain. Inside, a tiny photograph shows your grandmother as a young woman, smiling.',
      aliases: ['locket', 'silver locket', 'heirloom', 'necklace', 'chain', 'photograph', 'photo'],
      adjectives: ['family', 'silver', 'fine'],
      article: 'a',
      points: 2,
      pointsDescription: "Finding grandmother's heirloom",
    }));
    this.q['locket'] = locket.id;

    // === CONTAINERS (EntityType.ITEM + ContainerTrait) ===

    const desk = world.createEntity('heavy desk', EntityType.ITEM);
    desk.add(new IdentityTrait({
      name: 'heavy desk',
      description: 'A mahogany desk with brass handles. The drawers are closed.',
      aliases: ['desk', 'drawers', 'drawer', 'mahogany desk', 'handles', 'handle', 'brass handles'],
      adjectives: ['heavy', 'mahogany'],
      article: 'a',
    }));
    desk.add(new ContainerTrait({ isTransparent: false }));
    desk.add(new OpenableTrait({ isOpen: false, canClose: true }));
    desk.add(new SceneryTrait({ cantTakeMessage: 'The desk is far too heavy to carry.' }));
    world.moveEntity(desk.id, study.id);
    this.q['desk'] = desk.id;

    // Place winding key inside desk (AuthorModel bypass: open, place, close)
    const deskOpen = desk.get(OpenableTrait);
    if (deskOpen) {
      deskOpen.isOpen = true;
      world.moveEntity(windingKey.id, desk.id);
      deskOpen.isOpen = false;
    }

    const wallSafe = world.createEntity('wall safe', EntityType.ITEM);
    wallSafe.add(new IdentityTrait({
      name: 'wall safe',
      description: 'A small iron safe set into the wall. It has a three-dial combination lock.',
      aliases: ['safe', 'iron safe', 'combination', 'dial', 'dials', 'lock', 'combination lock'],
      adjectives: ['wall', 'iron', 'small'],
      article: 'a',
      concealed: true,
    }));
    wallSafe.add(new ContainerTrait({ isTransparent: false }));
    wallSafe.add(new OpenableTrait({ isOpen: false, canClose: true }));
    wallSafe.add(new LockableTrait({
      isLocked: true,
      lockedMessage: "The safe has a three-dial combination lock. You don't know the combination yet.",
    }));
    wallSafe.add(new SceneryTrait({ cantTakeMessage: 'The safe is embedded in the wall.' }));
    wallSafe.add(new PuzzlePropTrait('wall-safe'));
    world.moveEntity(wallSafe.id, study.id);
    this.q['wall-safe'] = wallSafe.id;

    // Place spring inside safe (AuthorModel bypass)
    const safeLock = wallSafe.get(LockableTrait);
    const safeOpen = wallSafe.get(OpenableTrait);
    if (safeLock && safeOpen) {
      safeLock.isLocked = false;
      safeOpen.isOpen = true;
      world.moveEntity(clockSpring.id, wallSafe.id);
      safeOpen.isOpen = false;
      safeLock.isLocked = true;
    }

    // === SUPPORTER (EntityType.ITEM + SupporterTrait) ===

    const shelf = world.createEntity('dusty shelf', EntityType.ITEM);
    shelf.add(new IdentityTrait({
      name: 'dusty shelf',
      description: 'A rough plank shelf nailed to the wall studs.',
      aliases: ['shelf', 'plank', 'shelves'],
      adjectives: ['dusty', 'rough'],
      article: 'a',
    }));
    shelf.add(new SupporterTrait());
    shelf.add(new SceneryTrait({ cantTakeMessage: 'The shelf is nailed to the wall.' }));
    world.moveEntity(shelf.id, attic.id);

    const musicBox = world.createEntity('old music box', EntityType.ITEM);
    musicBox.add(new IdentityTrait({
      name: 'old music box',
      description: 'A wooden music box with a rose-carved lid and a small keyhole on the side. Inside, the cavity is empty -- the mechanism has been removed.',
      aliases: ['box', 'music box', 'wooden box', 'lid', 'keyhole'],
      adjectives: ['old', 'wooden', 'music', 'rose-carved'],
      article: 'an',
    }));
    musicBox.add(new ContainerTrait({ capacity: { maxItems: 2 }, isTransparent: false }));
    musicBox.add(new OpenableTrait({ isOpen: true, canClose: true }));
    world.moveEntity(musicBox.id, shelf.id);
    this.q['music-box'] = musicBox.id;

    const trunk = world.createEntity('steamer trunk', EntityType.ITEM);
    trunk.add(new IdentityTrait({
      name: 'steamer trunk',
      description: "A battered steamer trunk with brass fittings. The lock has no keyhole -- just a small slot that looks mechanically connected to the shelf above.",
      aliases: ['trunk', 'chest', 'old trunk', 'steamer', 'fittings', 'brass fittings', 'slot'],
      adjectives: ['steamer', 'battered', 'heavy'],
      article: 'a',
    }));
    trunk.add(new ContainerTrait({ isTransparent: false }));
    trunk.add(new OpenableTrait({ isOpen: false, canClose: true }));
    trunk.add(new LockableTrait({
      isLocked: true,
      lockedMessage: 'The trunk has no keyhole. The lock seems mechanically connected to the shelf above.',
    }));
    trunk.add(new SceneryTrait({ cantTakeMessage: 'The trunk is far too heavy to lift.' }));
    trunk.add(new PuzzlePropTrait('trunk'));
    world.moveEntity(trunk.id, attic.id);
    this.q['trunk'] = trunk.id;

    // Place locket inside trunk (AuthorModel bypass)
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
    this.createScenery(world, 'woven doormat', porch.id,
      "A faded doormat reading 'WELCOME'. One corner is curled up -- something glints underneath.",
      { aliases: ['mat', 'rug', 'welcome mat', 'doormat', 'corner'], adjectives: ['woven', 'faded'], propId: 'doormat' });
    this.createScenery(world, 'brass doorbell', porch.id,
      'A tarnished brass button set into the door frame.',
      { aliases: ['bell', 'button', 'buzzer', 'door bell', 'doorbell', 'door frame'], adjectives: ['brass', 'tarnished'], propId: 'doorbell' });
    this.createScenery(world, 'sagging porch', porch.id,
      'Weathered boards that sag under your weight. The paint peeled away long ago.',
      { aliases: ['porch', 'boards', 'railing'], adjectives: ['sagging', 'wooden', 'weathered'], article: 'the' });

    // Hallway
    this.createScenery(world, 'coat rack', hallway.id,
      'A wooden coat rack, slightly tilted. An old overcoat hangs from one hook.',
      { aliases: ['rack', 'hook', 'hooks', 'stand'], adjectives: ['wooden', 'tilted'], article: 'the', propId: 'coat-rack' });
    const overcoat = this.createScenery(world, 'old overcoat', hallway.id,
      'A moth-eaten wool overcoat. The pockets look like they might hold something.',
      { aliases: ['coat', 'jacket', 'overcoat', 'wool coat', 'dusty coat', 'pockets', 'pocket'], adjectives: ['old', 'moth-eaten', 'wool'], article: 'an', propId: 'overcoat' });
    overcoat.scope('if.action.examining', 150);
    overcoat.scope('if.action.searching', 150);
    overcoat.scope('if.action.taking', 150);

    this.createScenery(world, 'narrow staircase', hallway.id,
      'A wooden staircase with groaning steps. It leads up into shadows.',
      { aliases: ['stairs', 'staircase', 'steps', 'stair'], adjectives: ['narrow', 'wooden', 'groaning'], propId: 'staircase' });
    this.createScenery(world, 'faded wallpaper', hallway.id,
      'Yellowed wallpaper with a faded floral pattern, peeling at the seams.',
      { aliases: ['wallpaper', 'wall', 'walls', 'paper'], adjectives: ['faded', 'yellowed', 'floral'], article: 'the' });
    this.createScenery(world, 'creaking floorboards', hallway.id,
      'Dark wooden floorboards that creak underfoot.',
      { aliases: ['floor', 'floorboard', 'boards', 'floorboards'], adjectives: ['creaking', 'dark', 'wooden'], article: 'the', grammaticalNumber: 'plural' });

    // Study
    this.createScenery(world, 'study bookshelves', study.id,
      'Floor-to-ceiling shelves packed with dusty volumes. Nothing stands out.',
      { aliases: ['bookshelves', 'bookshelf', 'shelves', 'books', 'book', 'volumes', 'volume'], adjectives: ['study', 'built-in', 'dusty'], article: 'the', grammaticalNumber: 'plural' });
    this.createScenery(world, 'oil painting', study.id,
      'A portrait of a stern woman in a high collar -- your grandmother, perhaps. The frame sits slightly askew on the wall.',
      { aliases: ['painting', 'portrait', 'picture', 'frame', 'woman', 'grandmother'], adjectives: ['oil', 'large'], article: 'an', propId: 'painting' });
    this.createScenery(world, 'stone fireplace', study.id,
      'A wide stone fireplace with old logs in the grate, ready to burn. The hearthstone is blackened with soot.',
      { aliases: ['fireplace', 'hearth', 'grate', 'fire', 'logs', 'log', 'chimney'], adjectives: ['stone', 'wide', 'cold'], article: 'the', propId: 'fireplace' });
    this.createScenery(world, 'hearthstone', study.id,
      'A broad flat stone at the base of the fireplace, blackened with soot. Hard to make out any detail.',
      { aliases: ['hearth stone', 'soot'], adjectives: ['broad', 'flat', 'blackened'], article: 'the', propId: 'hearthstone' });
    this.createScenery(world, 'wood paneling', study.id,
      'Dark wood panels line the walls, polished but dusty.',
      { aliases: ['paneling', 'panels', 'panel', 'wood'], adjectives: ['wood', 'dark', 'polished'], article: 'the' });

    // Kitchen
    this.createScenery(world, 'stone counters', kitchen.id,
      'Heavy stone countertops, cracked but solid.',
      { aliases: ['counter', 'countertop', 'countertops'], adjectives: ['stone', 'heavy', 'cracked'], article: 'the', grammaticalNumber: 'plural' });
    this.createScenery(world, 'ceramic sink', kitchen.id,
      'A deep farmhouse sink with a brass faucet. It drips slowly.',
      { aliases: ['sink', 'faucet', 'tap', 'basin'], adjectives: ['ceramic', 'deep', 'farmhouse'], article: 'the', propId: 'sink' });
    this.createScenery(world, 'copper pots', kitchen.id,
      'Tarnished copper pots hanging from iron hooks. Decorative now.',
      { aliases: ['pots', 'pans', 'pot', 'pan', 'hooks', 'iron hooks'], adjectives: ['copper', 'tarnished'], article: 'the', grammaticalNumber: 'plural' });
    const recipeCard = this.createScenery(world, 'recipe card', kitchen.id,
      "Your grandmother's handwriting: 'Lavender shortbread -- butter, sugar, flour, and dried lavender from the garden.' The card is stained and well-loved.",
      { aliases: ['recipe', 'card', 'note', 'handwritten'], adjectives: ['recipe', 'handwritten', 'stained'], article: 'the' });
    recipeCard.add(new ReadableTrait({
      text: 'Lavender shortbread -- butter, sugar, flour, and dried lavender from the garden.',
      isReadable: true,
    }));

    // Garden
    this.createScenery(world, 'flower bed', garden.id,
      'A raised bed of dark soil tangled with dead weeds. The earth looks soft -- someone was digging here recently.',
      { aliases: ['bed', 'flowers', 'weeds', 'soil', 'dirt', 'earth', 'ground'], adjectives: ['flower', 'raised', 'dark'], article: 'the', propId: 'flower-bed' });
    this.createScenery(world, 'garden shed', garden.id,
      'A small wooden shed with a sagging roof. The door hangs open, revealing empty shelves and cobwebs inside.',
      { aliases: ['shed', 'shack', 'door', 'shed door', 'shelves', 'cobwebs', 'roof'], adjectives: ['garden', 'wooden', 'small', 'sagging'], article: 'the' });

    // Attic
    this.createScenery(world, 'sloping eaves', attic.id,
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
    for (const { actionId, interceptor } of this.getInterceptors()) {
      registerActionInterceptor(PuzzlePropTrait.type, actionId, interceptor);
    }

    // === PLACE PLAYER ===

    const player = world.getPlayer()!;
    world.moveEntity(player.id, porch.id);
  }

  // =========================================================================
  // Story interface: extendParser
  // =========================================================================

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
      { word: 'try', partOfSpeech: 'verb', mapsTo: 'use', priority: 75, source: 'story' },
      { word: 'walk', partOfSpeech: 'verb', mapsTo: 'go', priority: 75, source: 'story' },
      { word: 'move', partOfSpeech: 'verb', mapsTo: 'push', priority: 80, source: 'story' },
    ]);

    // Story-specific grammar
    const g = parser.getStoryGrammar?.();
    if (!g) return;

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

      // Unlocking — stdlib handles "unlock X with Y"; story catches bare "unlock X" for trunk hint
      g.define('unlock :target').mapsTo('story.action.unlocking').withPriority(80).build();

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

      // Reading — route to stdlib reading action for ReadableTrait entities
      g.define('read :target').mapsTo('if.action.reading').withPriority(120).build();

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

      // Pick up → TAKE
      g.define('pick up :target').mapsTo('if.action.taking').withPriority(150).build();
      g.define('pick :target up').mapsTo('if.action.taking').withPriority(150).build();

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

      // Navigation — "go upstairs/downstairs" → stdlib going UP/DOWN
      g.define('go upstairs').mapsTo('if.action.going').withPriority(120).build();
      g.define('go up stairs').mapsTo('if.action.going').withPriority(120).build();
      g.define('go up the stairs').mapsTo('if.action.going').withPriority(120).build();
      g.define('climb up').mapsTo('if.action.going').withPriority(120).build();
      g.define('go downstairs').mapsTo('if.action.going').withPriority(120).build();
      g.define('go down stairs').mapsTo('if.action.going').withPriority(120).build();
      g.define('go down the stairs').mapsTo('if.action.going').withPriority(120).build();

      // Self-examination
      g.define('examine myself').mapsTo('story.action.examine-self').withPriority(160).build();
      g.define('examine me').mapsTo('story.action.examine-self').withPriority(160).build();
      g.define('examine self').mapsTo('story.action.examine-self').withPriority(160).build();
      g.define('look at myself').mapsTo('story.action.examine-self').withPriority(160).build();
      g.define('look at me').mapsTo('story.action.examine-self').withPriority(160).build();

      // Question forms
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
      g.define('check my inventory').mapsTo('if.action.inventory').withPriority(115).build();
      g.define('check my items').mapsTo('if.action.inventory').withPriority(115).build();

      // "Examine room" → LOOK
      g.define('examine room').mapsTo('if.action.looking').withPriority(110).build();
      g.define('look at room').mapsTo('if.action.looking').withPriority(110).build();
      g.define('describe room').mapsTo('if.action.looking').withPriority(110).build();

      // "check :target" → EXAMINE
      g.define('check :target').mapsTo('if.action.examining').withPriority(100).build();

      // "lift :target" → TAKE
      g.define('lift :target').mapsTo('if.action.taking').withPriority(120).build();
      g.define('raise :target').mapsTo('if.action.taking').withPriority(120).build();

      // Multi-word verb phrases → EXAMINE
      g.define('flip through :target').mapsTo('if.action.examining').withPriority(150).build();
      g.define('leaf through :target').mapsTo('if.action.examining').withPriority(150).build();
      g.define('read through :target').mapsTo('if.action.examining').withPriority(150).build();

      // Navigation
      g.define('head :dir').direction('dir').mapsTo('if.action.going').withPriority(95).build();
      g.define('walk :dir').direction('dir').mapsTo('if.action.going').withPriority(95).build();
      g.define('walk to [the] :dir').direction('dir').mapsTo('if.action.going').withPriority(90).build();

      // Greeting
      g.define('hello').mapsTo('story.action.greeting').withPriority(100).build();
      g.define('hi').mapsTo('story.action.greeting').withPriority(100).build();

      // Room/place → LOOK
      g.define('what is this').mapsTo('if.action.looking').withPriority(150).build();
      g.define('what is this place').mapsTo('if.action.looking').withPriority(150).build();
      g.define('look at everything').mapsTo('if.action.looking').withPriority(160).build();
      g.define('examine everything').mapsTo('if.action.looking').withPriority(160).build();
      g.define('look at this room').mapsTo('if.action.looking').withPriority(160).build();
      g.define('look at this place').mapsTo('if.action.looking').withPriority(160).build();
      g.define('look at the garden').mapsTo('if.action.looking').withPriority(160).build();
      g.define('look at the room').mapsTo('if.action.looking').withPriority(160).build();

      // Browse → EXAMINE
      g.define('browse :target').mapsTo('if.action.examining').withPriority(100).build();
      g.define('browse through :target').mapsTo('if.action.examining').withPriority(150).build();

      // Install bare → PUT
      g.define('install :target').mapsTo('if.action.putting').withPriority(100).build();

      // Try patterns
      g.define('try :target on :other').mapsTo('story.action.use-with').withPriority(100).build();
      g.define('try to open :target').mapsTo('if.action.opening').withPriority(120).build();
      g.define('try to take :target').mapsTo('if.action.taking').withPriority(120).build();

    } catch (err) {
      console.error('[Sharpee] grammar builder error:', err);
    }
  }

  // =========================================================================
  // Story interface: extendLanguage — register all message IDs
  // =========================================================================

  extendLanguage(language: any): void {
    const add = (id: string, text: string) => language.addMessage?.(id, text);

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

  // =========================================================================
  // Story interface: onEngineReady
  // =========================================================================

  onEngineReady(engine: GameEngine): void {
    const registry = engine.getPluginRegistry();
    registry.register(this.createMovementTrackingPlugin());
    registry.register(this.createWinCheckPlugin());
    registry.register(this.createFirstTakePlugin());
    registry.register(this.createDescriptionPlugin());
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const story = new GuessTheVerbStory();
export default story;
