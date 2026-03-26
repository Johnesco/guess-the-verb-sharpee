/**
 * Guess the Verb — Parser Extensions
 *
 * Vocabulary synonyms and story-specific grammar patterns.
 */

import type { Parser } from '@sharpee/parser-en-us';

// ============================================================================
// PARSER EXTENSION
// ============================================================================

export function extendParser(parser: Parser): void {
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
