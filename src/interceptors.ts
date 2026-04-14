/**
 * Guess the Verb — Action Interceptors
 *
 * Intercept stdlib actions to inject story-specific behavior
 * (e.g., TAKE doormat reveals key, PUSH painting reveals safe).
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  LockableTrait,
  OpenableTrait,
  createEffect,
} from '@sharpee/world-model';
import type { ActionInterceptor } from '@sharpee/world-model';
import {
  ItemIds,
  RoomIds,
  Msg,
  ScoreIds,
  ScorePoints,
  getPropId,
} from './types';
import { revealIronKey, movePainting } from './actions';
import { getSceneryId } from './world';

// ============================================================================
// INTERCEPTOR DEFINITIONS
// ============================================================================

export function getInterceptors(
  items: ItemIds,
  rooms: RoomIds,
): { actionId: string; interceptor: ActionInterceptor }[] {
  /**
   * Light the fireplace with a matchbook (interceptor version).
   */
  function lightFireplaceInterceptor(world: WorldModel, actorId: string): string {
    if (world.getStateValue('fireplace-lit')) {
      return Msg.FIRE_ALREADY;
    }
    const matchLoc = world.getLocation(items.matchbook);
    if (matchLoc !== actorId) {
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
        onBlocked: (entity: IFEntity, world: WorldModel, _actorId: string, error: string) => {
          if (error === 'story.doormat.take') {
            const messageId = revealIronKey(world, items, rooms);
            return [createEffect('game.message', { messageId })];
          }
          if (error === 'story.overcoat.take') {
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
            const messageId = movePainting(world, items);
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
            const messageId = lightFireplaceInterceptor(world, actorId);
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
