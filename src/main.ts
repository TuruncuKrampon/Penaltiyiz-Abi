import Phaser from 'phaser';
import '@fontsource/archivo-black';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/700.css';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config/theme';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { MatchScene } from './scenes/MatchScene';
import { ResultScene } from './scenes/ResultScene';
import { isDebug } from './systems/debug';
import { resolveKick } from './systems/kickResolver';
import { Rng } from './systems/rng';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.nightNavyCss,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, PreloadScene, MainMenuScene, CharacterSelectScene, MatchScene, ResultScene]
});

// Test hooks, only behind ?debug=1: lets automated tests read scene state
// and run statistical checks on the pure resolver.
if (isDebug()) {
  (window as unknown as Record<string, unknown>).__TK = { game, resolveKick, Rng };
}
