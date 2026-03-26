/**
 * Guess the Verb — Turn Plugins
 *
 * Win-check, movement tracking, first-take notification, and dynamic descriptions.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  LockableTrait,
  OpenableTrait,
} from '@sharpee/world-model';
import type { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';
import type { ISemanticEvent } from '@sharpee/core';
import { ItemIds, Msg, MAX_SCORE } from './types';

// ============================================================================
// PLUGIN FACTORIES
// ============================================================================

function createWinCheckPlugin(): TurnPlugin {
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

function createMovementTrackingPlugin(): TurnPlugin {
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

function createFirstTakePlugin(items: ItemIds): TurnPlugin {
  return {
    id: 'story.first-take',
    priority: 100,
    onAfterAction: (ctx: TurnPluginContext): ISemanticEvent[] => {
      const result = ctx.actionResult;
      if (
        result?.actionId === 'if.action.taking' &&
        result?.success &&
        result?.targetId === items.locket
      ) {
        return [{ type: 'game.message', data: { messageId: Msg.LOCKET_FOUND } } as any];
      }
      return [];
    },
  };
}

function createDescriptionPlugin(items: ItemIds): TurnPlugin {
  return {
    id: 'story.descriptions',
    priority: 50,
    onAfterAction: (ctx: TurnPluginContext): ISemanticEvent[] => {
      const world = ctx.world;

      // Dynamic desk description
      const desk = world.getEntity(items.desk);
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
      const box = world.getEntity(items.musicBox);
      if (box) {
        const id = box.get(IdentityTrait);
        if (id) {
          const contents = world.getContents(items.musicBox);
          const parts = contents
            .filter((e: IFEntity) => e.id === items.mechanism || e.id === items.clockSpring)
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
      const trunk = world.getEntity(items.trunk);
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
      const safe = world.getEntity(items.wallSafe);
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

// ============================================================================
// EXPORT
// ============================================================================

export function createPlugins(items: ItemIds): TurnPlugin[] {
  return [
    createMovementTrackingPlugin(),
    createWinCheckPlugin(),
    createFirstTakePlugin(items),
    createDescriptionPlugin(items),
  ];
}
