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
} from '@sharpee/engine';
import type { GameEngine } from '@sharpee/engine';
import {
  WorldModel,
  IFEntity,
  ActorTrait,
  ContainerTrait,
  IdentityTrait,
  registerActionInterceptor,
  hasActionInterceptor,
} from '@sharpee/world-model';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';
import { config, PuzzlePropTrait, MAX_SCORE } from './types';
import type { RoomIds, ItemIds } from './types';
export { config } from './types';
import { createRooms, createItems, createScenery } from './world';
import { getCustomActions } from './actions';
import { getInterceptors } from './interceptors';
import { createPlugins } from './plugins';
import { extendParser as extendParserImpl } from './grammar';
import { extendLanguage as extendLanguageImpl } from './language';

// ============================================================================
// STORY CLASS
// ============================================================================

export class GuessTheVerbStory implements Story {
  config = config;

  private rooms!: RoomIds;
  private items!: ItemIds;

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

    // Create world
    this.rooms = createRooms(world);
    this.items = createItems(world, this.rooms);
    createScenery(world, this.rooms, this.items);

    // State
    world.setStateValue('painting-moved', false);
    world.setStateValue('fireplace-lit', false);
    world.setStateValue('last-room', null);

    // Register interceptors with guard
    for (const { actionId, interceptor } of getInterceptors(this.items, this.rooms)) {
      if (!hasActionInterceptor(PuzzlePropTrait.type, actionId)) {
        registerActionInterceptor(PuzzlePropTrait.type, actionId, interceptor);
      }
    }

    // Place player
    const player = world.getPlayer()!;
    world.moveEntity(player.id, this.rooms.porch);
  }

  // =========================================================================
  // Story interface: getCustomActions
  // =========================================================================

  getCustomActions() {
    return getCustomActions(this.rooms, this.items);
  }

  // =========================================================================
  // Story interface: extendParser
  // =========================================================================

  extendParser(parser: Parser): void {
    extendParserImpl(parser);
  }

  // =========================================================================
  // Story interface: extendLanguage
  // =========================================================================

  extendLanguage(language: LanguageProvider): void {
    extendLanguageImpl(language);
  }

  // =========================================================================
  // Story interface: onEngineReady
  // =========================================================================

  onEngineReady(engine: GameEngine): void {
    const plugins = createPlugins(this.items);
    const registry = engine.getPluginRegistry();
    for (const plugin of plugins) {
      registry.register(plugin);
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const story = new GuessTheVerbStory();
export default story;
