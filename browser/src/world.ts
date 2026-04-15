/**
 * Guess the Verb — World Creation
 *
 * Factory functions for rooms, items, and scenery.
 */

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
  DoorTrait,
} from '@sharpee/world-model';
import { RoomIds, ItemIds, PuzzlePropTrait } from './types';

// ============================================================================
// HELPER — create scenery with optional puzzle-prop tagging
// ============================================================================

/**
 * Registry for scenery entity IDs keyed by propId.
 * Populated by createScenery when a propId is supplied.
 */
const sceneryIds: Record<string, string> = {};

/** Retrieve a scenery entity ID by its propId. */
export function getSceneryId(propId: string): string {
  return sceneryIds[propId];
}

function createSceneryEntity(
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
    sceneryIds[opts.propId] = entity.id;
  }
  world.moveEntity(entity.id, locationId);
  return entity;
}

// ============================================================================
// ROOMS
// ============================================================================

export function createRooms(world: WorldModel): RoomIds {
  const porch = world.createEntity('Front Porch', EntityType.ROOM);
  porch.add(new IdentityTrait({
    name: 'Front Porch',
    description: "A sagging wooden porch wraps around the front of the house. A woven doormat lies before the front door. A tarnished brass doorbell is set beside the frame.\n\nThe front door leads inside to the east.",
    properName: true,
  }));
  porch.add(new RoomTrait());

  const hallway = world.createEntity('Hallway', EntityType.ROOM);
  hallway.add(new IdentityTrait({
    name: 'Hallway',
    description: "A dim hallway with faded wallpaper and creaking floorboards. A coat rack stands by the door with an old overcoat hanging from it.\n\nDoors lead east to a study and south to the kitchen. A narrow staircase leads up.",
    properName: true,
  }));
  hallway.add(new RoomTrait());

  const study = world.createEntity('Study', EntityType.ROOM);
  study.add(new IdentityTrait({
    name: 'Study',
    description: "A wood-paneled study with built-in bookshelves. A heavy desk sits in the center, its drawers shut. An oil painting of a woman hangs on the far wall. A stone fireplace squats in the corner, cold and dark.\n\nThe hallway is back to the west.",
    properName: true,
  }));
  study.add(new RoomTrait());

  const kitchen = world.createEntity('Kitchen', EntityType.ROOM);
  kitchen.add(new IdentityTrait({
    name: 'Kitchen',
    description: "A rustic kitchen with stone counters and a deep ceramic sink. Copper pots hang from hooks above. A handwritten recipe card sits on the counter.\n\nThe hallway is north. A doorway leads south to the garden.",
    properName: true,
  }));
  kitchen.add(new RoomTrait());

  const garden = world.createEntity('Garden', EntityType.ROOM);
  garden.add(new IdentityTrait({
    name: 'Garden',
    description: "An overgrown garden behind the house. A flower bed runs along the back wall, thick with weeds. A small shed leans in one corner with its door ajar. A rusty trowel leans against the shed.\n\nThe kitchen doorway is back to the north.",
    properName: true,
  }));
  garden.add(new RoomTrait({ outdoor: true }));

  const attic = world.createEntity('Attic', EntityType.ROOM);
  attic.add(new IdentityTrait({
    name: 'Attic',
    description: "A cramped attic under sloping eaves, thick with dust. A dusty shelf holds an old music box. A heavy steamer trunk sits against the wall.\n\nThe stairs lead back down.",
    properName: true,
  }));
  attic.add(new RoomTrait());

  return {
    porch: porch.id,
    hallway: hallway.id,
    study: study.id,
    kitchen: kitchen.id,
    garden: garden.id,
    attic: attic.id,
  };
}

// ============================================================================
// ITEMS
// ============================================================================

export function createItems(world: WorldModel, rooms: RoomIds): ItemIds {
  // === KEY (created before door so keyId can reference it) ===

  const ironKey = world.createEntity('iron key', EntityType.ITEM);
  ironKey.add(new IdentityTrait({
    name: 'iron key',
    description: 'A heavy iron key, dark with age.',
    aliases: ['old key', 'heavy key', 'house key', 'key'],
    adjectives: ['iron', 'heavy', 'old'],
    article: 'an',
  }));
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
  frontDoor.add(new DoorTrait({ room1: rooms.porch, room2: rooms.hallway }));
  frontDoor.add(new SceneryTrait());
  world.moveEntity(frontDoor.id, rooms.porch);

  // === ROOM CONNECTIONS ===

  const porchEntity = world.getEntity(rooms.porch);
  const hallwayEntity = world.getEntity(rooms.hallway);
  const porchRoom = porchEntity?.get(RoomTrait);
  const hallwayRoom = hallwayEntity?.get(RoomTrait);
  if (porchRoom) porchRoom.exits[Direction.EAST] = { destination: rooms.hallway, via: frontDoor.id };
  if (hallwayRoom) hallwayRoom.exits[Direction.WEST] = { destination: rooms.porch, via: frontDoor.id };

  world.connectRooms(rooms.hallway, rooms.study, Direction.EAST);
  world.connectRooms(rooms.hallway, rooms.kitchen, Direction.SOUTH);
  world.connectRooms(rooms.hallway, rooms.attic, Direction.UP);
  world.connectRooms(rooms.kitchen, rooms.garden, Direction.SOUTH);

  // === PORTABLE ITEMS ===

  const matchbook = world.createEntity('matchbook', EntityType.ITEM);
  matchbook.add(new IdentityTrait({
    name: 'matchbook',
    description: "A small book of matches from 'The Golden Lantern.' A few matches remain.",
    aliases: ['matches', 'match', 'book of matches'],
    adjectives: ['small'],
    article: 'a',
  }));
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

  const clockSpring = world.createEntity('clock spring', EntityType.ITEM);
  clockSpring.add(new IdentityTrait({
    name: 'clock spring',
    description: 'A tightly coiled metal spring, the kind found inside clockwork.',
    aliases: ['spring', 'coiled spring', 'metal spring', 'coil'],
    adjectives: ['clock', 'coiled', 'metal', 'tightly'],
    article: 'a',
  }));

  const trowel = world.createEntity('garden trowel', EntityType.ITEM);
  trowel.add(new IdentityTrait({
    name: 'garden trowel',
    description: 'A short-handled garden trowel, rusty but solid.',
    aliases: ['trowel', 'spade', 'shovel', 'tool'],
    adjectives: ['garden', 'rusty', 'short-handled'],
    article: 'a',
  }));
  world.moveEntity(trowel.id, rooms.garden);

  const mechanism = world.createEntity('brass mechanism', EntityType.ITEM);
  mechanism.add(new IdentityTrait({
    name: 'brass mechanism',
    description: 'A small brass mechanism -- gears, pins, and a tiny drum with raised bumps. The innards of a music box.',
    aliases: ['mechanism', 'gears', 'gear', 'clockwork', 'innards', 'drum', 'pins', 'pin', 'brass thing'],
    adjectives: ['brass', 'small'],
    article: 'a',
  }));
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
  world.moveEntity(desk.id, rooms.study);

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
  world.moveEntity(wallSafe.id, rooms.study);

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
  world.moveEntity(shelf.id, rooms.attic);

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
  world.moveEntity(trunk.id, rooms.attic);

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

  // === SCOPE ===

  ironKey.scope('if.action.unlocking', 150);
  windingKey.scope('if.action.winding', 150);
  musicBox.scope('if.action.winding', 150);

  return {
    ironKey: ironKey.id,
    matchbook: matchbook.id,
    windingKey: windingKey.id,
    clockSpring: clockSpring.id,
    trowel: trowel.id,
    mechanism: mechanism.id,
    locket: locket.id,
    frontDoor: frontDoor.id,
    desk: desk.id,
    wallSafe: wallSafe.id,
    musicBox: musicBox.id,
    trunk: trunk.id,
  };
}

// ============================================================================
// SCENERY
// ============================================================================

export function createScenery(world: WorldModel, rooms: RoomIds, _items: ItemIds): void {
  // Porch
  createSceneryEntity(world, 'woven doormat', rooms.porch,
    "A faded doormat reading 'WELCOME'. One corner is curled up -- something glints underneath.",
    { aliases: ['mat', 'rug', 'welcome mat', 'doormat', 'corner'], adjectives: ['woven', 'faded'], propId: 'doormat' });
  createSceneryEntity(world, 'brass doorbell', rooms.porch,
    'A tarnished brass button set into the door frame.',
    { aliases: ['bell', 'button', 'buzzer', 'door bell', 'doorbell', 'door frame'], adjectives: ['brass', 'tarnished'], propId: 'doorbell' });
  createSceneryEntity(world, 'sagging porch', rooms.porch,
    'Weathered boards that sag under your weight. The paint peeled away long ago.',
    { aliases: ['porch', 'boards', 'railing'], adjectives: ['sagging', 'wooden', 'weathered'], article: 'the' });

  // Hallway
  createSceneryEntity(world, 'coat rack', rooms.hallway,
    'A wooden coat rack, slightly tilted. An old overcoat hangs from one hook.',
    { aliases: ['rack', 'hook', 'hooks', 'stand'], adjectives: ['wooden', 'tilted'], article: 'the', propId: 'coat-rack' });
  const overcoat = createSceneryEntity(world, 'old overcoat', rooms.hallway,
    'A moth-eaten wool overcoat. The pockets look like they might hold something.',
    { aliases: ['coat', 'jacket', 'overcoat', 'wool coat', 'dusty coat', 'pockets', 'pocket'], adjectives: ['old', 'moth-eaten', 'wool'], article: 'an', propId: 'overcoat' });
  overcoat.scope('if.action.examining', 150);
  overcoat.scope('if.action.searching', 150);
  overcoat.scope('if.action.taking', 150);

  createSceneryEntity(world, 'narrow staircase', rooms.hallway,
    'A wooden staircase with groaning steps. It leads up into shadows.',
    { aliases: ['stairs', 'staircase', 'steps', 'stair'], adjectives: ['narrow', 'wooden', 'groaning'], propId: 'staircase' });
  createSceneryEntity(world, 'faded wallpaper', rooms.hallway,
    'Yellowed wallpaper with a faded floral pattern, peeling at the seams.',
    { aliases: ['wallpaper', 'wall', 'walls', 'paper'], adjectives: ['faded', 'yellowed', 'floral'], article: 'the' });
  createSceneryEntity(world, 'creaking floorboards', rooms.hallway,
    'Dark wooden floorboards that creak underfoot.',
    { aliases: ['floor', 'floorboard', 'boards', 'floorboards'], adjectives: ['creaking', 'dark', 'wooden'], article: 'the', grammaticalNumber: 'plural' });

  // Study
  createSceneryEntity(world, 'study bookshelves', rooms.study,
    'Floor-to-ceiling shelves packed with dusty volumes. Nothing stands out.',
    { aliases: ['bookshelves', 'bookshelf', 'shelves', 'books', 'book', 'volumes', 'volume'], adjectives: ['study', 'built-in', 'dusty'], article: 'the', grammaticalNumber: 'plural' });
  createSceneryEntity(world, 'oil painting', rooms.study,
    'A portrait of a stern woman in a high collar -- your grandmother, perhaps. The frame sits slightly askew on the wall.',
    { aliases: ['painting', 'portrait', 'picture', 'frame', 'woman', 'grandmother'], adjectives: ['oil', 'large'], article: 'an', propId: 'painting' });
  createSceneryEntity(world, 'stone fireplace', rooms.study,
    'A wide stone fireplace with old logs in the grate, ready to burn. The hearthstone is blackened with soot.',
    { aliases: ['fireplace', 'hearth', 'grate', 'fire', 'logs', 'log', 'chimney'], adjectives: ['stone', 'wide', 'cold'], article: 'the', propId: 'fireplace' });
  createSceneryEntity(world, 'hearthstone', rooms.study,
    'A broad flat stone at the base of the fireplace, blackened with soot. Hard to make out any detail.',
    { aliases: ['hearth stone', 'soot'], adjectives: ['broad', 'flat', 'blackened'], article: 'the', propId: 'hearthstone' });
  createSceneryEntity(world, 'wood paneling', rooms.study,
    'Dark wood panels line the walls, polished but dusty.',
    { aliases: ['paneling', 'panels', 'panel', 'wood'], adjectives: ['wood', 'dark', 'polished'], article: 'the' });

  // Kitchen
  createSceneryEntity(world, 'stone counters', rooms.kitchen,
    'Heavy stone countertops, cracked but solid.',
    { aliases: ['counter', 'countertop', 'countertops'], adjectives: ['stone', 'heavy', 'cracked'], article: 'the', grammaticalNumber: 'plural' });
  createSceneryEntity(world, 'ceramic sink', rooms.kitchen,
    'A deep farmhouse sink with a brass faucet. It drips slowly.',
    { aliases: ['sink', 'faucet', 'tap', 'basin'], adjectives: ['ceramic', 'deep', 'farmhouse'], article: 'the', propId: 'sink' });
  createSceneryEntity(world, 'copper pots', rooms.kitchen,
    'Tarnished copper pots hanging from iron hooks. Decorative now.',
    { aliases: ['pots', 'pans', 'pot', 'pan', 'hooks', 'iron hooks'], adjectives: ['copper', 'tarnished'], article: 'the', grammaticalNumber: 'plural' });
  const recipeCard = createSceneryEntity(world, 'recipe card', rooms.kitchen,
    "Your grandmother's handwriting: 'Lavender shortbread -- butter, sugar, flour, and dried lavender from the garden.' The card is stained and well-loved.",
    { aliases: ['recipe', 'card', 'note', 'handwritten'], adjectives: ['recipe', 'handwritten', 'stained'], article: 'the' });
  recipeCard.add(new ReadableTrait({
    text: 'Lavender shortbread -- butter, sugar, flour, and dried lavender from the garden.',
    isReadable: true,
  }));

  // Garden
  createSceneryEntity(world, 'flower bed', rooms.garden,
    'A raised bed of dark soil tangled with dead weeds. The earth looks soft -- someone was digging here recently.',
    { aliases: ['bed', 'flowers', 'weeds', 'soil', 'dirt', 'earth', 'ground'], adjectives: ['flower', 'raised', 'dark'], article: 'the', propId: 'flower-bed' });
  createSceneryEntity(world, 'garden shed', rooms.garden,
    'A small wooden shed with a sagging roof. The door hangs open, revealing empty shelves and cobwebs inside.',
    { aliases: ['shed', 'shack', 'door', 'shed door', 'shelves', 'cobwebs', 'roof'], adjectives: ['garden', 'wooden', 'small', 'sagging'], article: 'the' });

  // Attic
  createSceneryEntity(world, 'sloping eaves', rooms.attic,
    'Low rafters and dusty beams. You have to duck in places.',
    { aliases: ['eaves', 'rafters', 'beams', 'ceiling', 'roof', 'wall', 'dust'], adjectives: ['sloping', 'low', 'dusty'], article: 'the', grammaticalNumber: 'plural' });
}
