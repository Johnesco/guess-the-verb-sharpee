/**
 * Guess the Verb — Custom Actions
 *
 * All 20+ story-specific actions following the 4-phase pattern.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  LockableTrait,
  OpenableTrait,
} from '@sharpee/world-model';
import { Action } from '@sharpee/stdlib';
import {
  RoomIds,
  ItemIds,
  Msg,
  ScoreIds,
  ScorePoints,
  getPropId,
  defineAction,
  standardBlocked,
} from './types';
import { getSceneryId } from './world';

// ============================================================================
// WORLD-MUTATION HELPERS
// ============================================================================

/**
 * Reveal the iron key under the doormat.
 * Returns the message ID describing what happened.
 */
export function revealIronKey(world: WorldModel, items: ItemIds, rooms: RoomIds): string {
  if (world.getLocation(items.ironKey) === rooms.porch) {
    return Msg.KEY_ALREADY;
  }
  world.moveEntity(items.ironKey, rooms.porch);
  world.awardScore(ScoreIds.IRON_KEY_FOUND, ScorePoints[ScoreIds.IRON_KEY_FOUND], 'Finding the iron key');
  return Msg.KEY_FOUND;
}

/**
 * Move the painting to reveal the wall safe.
 * Returns the message ID describing what happened.
 */
export function movePainting(world: WorldModel, items: ItemIds): string {
  if (world.getStateValue('painting-moved')) {
    return Msg.PAINTING_ALREADY;
  }
  world.setStateValue('painting-moved', true);
  const safe = world.getEntity(items.wallSafe);
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
export function lightFireplace(world: WorldModel, items: ItemIds, playerId: string): string {
  if (world.getStateValue('fireplace-lit')) {
    return Msg.FIRE_ALREADY;
  }
  const matchLoc = world.getLocation(items.matchbook);
  if (matchLoc !== playerId) {
    return Msg.FIRE_NO_MATCHES;
  }
  world.setStateValue('fireplace-lit', true);
  world.awardScore(ScoreIds.FIREPLACE_LIT, ScorePoints[ScoreIds.FIREPLACE_LIT], 'Lighting the fireplace');

  // Update descriptions to reflect the lit fireplace
  const fireplaceId = getSceneryId('fireplace');
  const fp = fireplaceId ? world.getEntity(fireplaceId) : null;
  if (fp) {
    const id = fp.get(IdentityTrait);
    if (id) id.description = 'The fireplace crackles with warm flames. The logs glow orange.';
  }
  const hearthstoneId = getSceneryId('hearthstone');
  const hs = hearthstoneId ? world.getEntity(hearthstoneId) : null;
  if (hs) {
    const id = hs.get(IdentityTrait);
    if (id) id.description = "In the firelight, you can make out numbers scratched into the hearthstone: 7 - 3 - 9.";
  }
  return Msg.FIRE_LIT;
}

// ============================================================================
// CUSTOM ACTIONS
// ============================================================================

export function getCustomActions(rooms: RoomIds, items: ItemIds): Action[] {
  return [
    // --- LOOKING UNDER ---
    defineAction('story.action.looking-under', 'perception', {
      validate(ctx) {
        const target = ctx.command?.directObject?.entity;
        if (!target) return { valid: false, error: Msg.MISSING_NOUN };
        ctx.sharedData.target = target;
        return { valid: true };
      },
      execute(ctx) {
        const target = ctx.sharedData.target as IFEntity;
        const propId = getPropId(target);
        if (propId === 'doormat') {
          ctx.sharedData.messageId = revealIronKey(ctx.world, items, rooms);
        } else if (propId === 'painting') {
          ctx.sharedData.messageId = movePainting(ctx.world, items);
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
      execute(ctx) {
        const target = ctx.sharedData.target as IFEntity;
        const propId = getPropId(target);
        if (propId === 'painting') {
          ctx.sharedData.messageId = movePainting(ctx.world, items);
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
      execute(ctx) {
        const target = ctx.sharedData.target as IFEntity;
        const propId = getPropId(target);

        if (propId === 'doormat') {
          ctx.sharedData.messageId = revealIronKey(ctx.world, items, rooms);
          return;
        }
        if (propId === 'overcoat' || propId === 'coat-rack') {
          const mbLoc = ctx.world.getLocation(items.matchbook);
          if (mbLoc === ctx.player.id) {
            ctx.sharedData.messageId = Msg.MATCHBOOK_ALREADY;
            return;
          }
          ctx.world.moveEntity(items.matchbook, ctx.player.id);
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
      execute(ctx) {
        const target = ctx.sharedData.target as IFEntity;
        const propId = getPropId(target);
        if (propId === 'flower-bed') {
          const trowelLoc = ctx.world.getLocation(items.trowel);
          if (trowelLoc !== ctx.player.id) {
            ctx.sharedData.messageId = Msg.DIG_NEED_TOOL;
            return;
          }
          const mechLoc = ctx.world.getLocation(items.mechanism);
          if (mechLoc) {
            ctx.sharedData.messageId = Msg.DIG_ALREADY;
            return;
          }
          ctx.world.moveEntity(items.mechanism, rooms.garden);
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
      execute(ctx) {
        const playerLoc = ctx.world.getLocation(ctx.player.id);
        if (playerLoc === rooms.garden) {
          const trowelLoc = ctx.world.getLocation(items.trowel);
          if (trowelLoc !== ctx.player.id) {
            ctx.sharedData.messageId = Msg.DIG_NEED_TOOL;
            return;
          }
          const mechLoc = ctx.world.getLocation(items.mechanism);
          if (mechLoc) {
            ctx.sharedData.messageId = Msg.DIG_ALREADY;
            return;
          }
          ctx.world.moveEntity(items.mechanism, rooms.garden);
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
      validate(ctx) {
        const target = ctx.command?.directObject?.entity;
        if (!target) return { valid: false, error: Msg.MISSING_NOUN };
        ctx.sharedData.target = target;
        if (target.id !== items.musicBox) {
          return { valid: false, error: Msg.WIND_WRONG_TARGET, params: { target: target.name } };
        }
        const wkLoc = ctx.world.getLocation(items.windingKey);
        if (wkLoc !== ctx.player.id) {
          return { valid: false, error: Msg.WIND_NO_KEY };
        }
        const contents = ctx.world.getContents(items.musicBox);
        const hasMech = contents.some((e: IFEntity) => e.id === items.mechanism);
        const hasSpring = contents.some((e: IFEntity) => e.id === items.clockSpring);
        if (!hasMech || !hasSpring) {
          const missing: string[] = [];
          if (!hasMech) missing.push('mechanism');
          if (!hasSpring) missing.push('spring');
          return { valid: false, error: Msg.WIND_MISSING_PARTS, params: { parts: missing.join(' and ') } };
        }
        return { valid: true };
      },
      execute(ctx) {
        // Unlock the trunk — the music box melody releases the mechanical lock
        const trunk = ctx.world.getEntity(items.trunk);
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
      validate(ctx) {
        const target = ctx.command?.directObject?.entity;
        if (!target) return { valid: false, error: Msg.MISSING_NOUN };
        ctx.sharedData.target = target;
        return { valid: true };
      },
      execute() {},
      report(ctx) {
        const target = ctx.sharedData.target as IFEntity;
        if (target.id === items.musicBox) {
          const contents = ctx.world.getContents(items.musicBox);
          const hasMech = contents.some((e: IFEntity) => e.id === items.mechanism);
          const hasSpring = contents.some((e: IFEntity) => e.id === items.clockSpring);
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
      execute(ctx) {
        const target = ctx.sharedData.target as IFEntity;
        const propId = getPropId(target);
        if (propId === 'painting') {
          ctx.sharedData.messageId = movePainting(ctx.world, items);
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
      execute(ctx) {
        const target = ctx.sharedData.target as IFEntity;
        const propId = getPropId(target);
        if (propId === 'painting') {
          ctx.sharedData.messageId = movePainting(ctx.world, items);
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
      report(ctx) {
        const target = ctx.sharedData.target as IFEntity;
        let messageId: string;
        if (target.id === items.trunk) {
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
      execute(ctx) {
        const item = ctx.sharedData.item as IFEntity;
        const other = ctx.sharedData.other as IFEntity;
        if (item.id === items.musicBox || other.id === items.musicBox) {
          const box = item.id === items.musicBox ? item : other;
          const part = item.id === items.musicBox ? other : item;
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
      validate(ctx) {
        const playerLoc = ctx.world.getLocation(ctx.player.id);
        if (playerLoc !== rooms.study) {
          return { valid: false, error: Msg.DIAL_NO_SAFE };
        }
        if (!ctx.world.getStateValue('painting-moved')) {
          return { valid: false, error: Msg.DIAL_NOT_VISIBLE };
        }
        return { valid: true };
      },
      execute(ctx) {
        const textSlots = ctx.command?.parsed?.textSlots as Map<string, string> | undefined;
        const rawCode = textSlots ? Array.from(textSlots.values()).join('') : '';
        const code = rawCode.replace(/[^0-9]/g, '');

        if (code === '739') {
          const safe = ctx.world.getEntity(items.wallSafe);
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
      execute(ctx) {
        const target = ctx.sharedData.target as IFEntity;
        const propId = getPropId(target);
        if (propId === 'fireplace') {
          ctx.sharedData.messageId = lightFireplace(ctx.world, items, ctx.player.id);
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
