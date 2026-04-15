/**
 * Browser Entry Point for Guess the Verb
 *
 * Uses BrowserClient from @sharpee/platform-browser for save/restore,
 * themes, menus, and dialog management.
 */

import { GameEngine } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { BrowserClient, ThemeManager } from '@sharpee/platform-browser';
import { story, config } from './index.js';

const THEME_STORAGE_KEY = 'guess-the-verb-theme';

// Apply saved theme before DOM renders to avoid flash
ThemeManager.applyEarlyTheme(THEME_STORAGE_KEY);

const title = config.title;
const description = config.description || '';
const authors = Array.isArray(config.author)
  ? config.author.join(', ')
  : config.author;

const client = new BrowserClient({
  storagePrefix: 'guess-the-verb-',
  defaultTheme: 'dos-classic',
  themes: [
    { id: 'dos-classic', name: 'DOS Classic' },
    { id: 'modern-dark', name: 'Modern Dark' },
    { id: 'retro-terminal', name: 'Retro Terminal' },
    { id: 'paper', name: 'Paper' },
  ],
  storyInfo: {
    title,
    description,
    authors,
  },
  callbacks: {
    getHelpText: () =>
      `Commands are simple sentences like LOOK, TAKE KEY, or PUT BOOK ON TABLE.

Common commands:
  LOOK (L)        Describe surroundings
  INVENTORY (I)   List what you're carrying
  EXAMINE (X)     Look closely at something
  TAKE / DROP     Pick up or put down items
  OPEN / CLOSE    Open or close containers
  GO <direction>  Move (N, S, E, W, U, D)
  SAVE / RESTORE  Save or load your game
  QUIT            Leave the game`,
    getAboutText: () =>
      [title, description, `By ${authors}`].filter(Boolean).join('\n'),
    handleStoryEvent: (event: any, display: any) => {
      // Parse failures — structured error feedback
      if (event.type === 'command.failed') {
        const reason = event.data?.reason || '';
        if (reason.includes('UNKNOWN_VERB')) {
          display.displayText("I don't know that word. Type VERBS for available commands.");
        } else if (reason.includes('ENTITY_NOT_FOUND')) {
          display.displayText("You don't see that here. Try LOOK to see what's around you.");
        } else if (reason.includes('INVALID_SYNTAX')) {
          display.displayText("I don't understand that phrasing. Try simpler commands like EXAMINE, TAKE, or GO EAST.");
        } else {
          display.displayText("I don't understand that. Type HELP for hints.");
        }
        return true;
      }
      // Action blocked/failed — contextual feedback
      if (
        event.type?.includes('blocked') ||
        event.type?.includes('failed')
      ) {
        const data = event.data || {};
        const messageId = data.messageId || data.reason;
        if (messageId) {
          const targetName = data.targetName || data.target || '';
          const action = messageId
            .replace(/^if\.\w+\./, '')
            .replace(/_/g, ' ');
          display.displayText(
            targetName ? `You can't ${action}.` : "You can't do that.",
          );
          return true;
        }
      }
      return false;
    },
  },
});

async function start(): Promise<void> {
  console.log('=== Guess the Verb BROWSER START ===');

  client.initialize({
    statusLocation: document.getElementById('location-name'),
    statusScore: document.getElementById('score-turns'),
    textContent: document.getElementById('text-content'),
    mainWindow: document.getElementById('main-window'),
    commandInput: document.getElementById('command-input') as HTMLInputElement,
    modalOverlay: document.getElementById('modal-overlay'),
    saveDialog: document.getElementById('save-dialog'),
    restoreDialog: document.getElementById('restore-dialog'),
    startupDialog: document.getElementById('startup-dialog'),
    saveNameInput: document.getElementById('save-name-input') as HTMLInputElement,
    saveSlotsListEl: document.getElementById('save-slots-list'),
    restoreSlotsListEl: document.getElementById('restore-slots-list'),
    noSavesMessage: document.getElementById('no-saves-message'),
    startupSaveInfo: document.getElementById('startup-save-info'),
    menuBar: document.getElementById('menu-bar'),
  } as any);

  const world = new WorldModel();
  const player = world.createEntity('player', EntityType.ACTOR);
  world.setPlayer(player.id);

  const language = new LanguageProvider();
  const parser = new Parser(language);

  if (story.extendParser) story.extendParser(parser);
  if (story.extendLanguage) story.extendLanguage(language);

  const perceptionService = new PerceptionService();

  const engine = new GameEngine({
    world,
    player,
    parser,
    language,
    perceptionService,
  });

  client.connectEngine(engine, world);

  engine.setStory(story);

  // Get hooks and override restart to avoid race between page reload and engine restart
  const hooks = client.getSaveRestoreHooks();
  hooks.onRestartRequested = async (context: any) => {
    if (confirm('Are you sure you want to restart? All unsaved progress will be lost.')) {
      (client as any).saveManager.clearAutosave();
      window.location.reload();
      // Return false so the engine does NOT call restartGame() while the page is reloading.
      // Returning true would race: restartGame() emits events that auto-save bad state.
      return false;
    }
    return false;
  };
  engine.registerSaveRestoreHooks(hooks);

  await client.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
