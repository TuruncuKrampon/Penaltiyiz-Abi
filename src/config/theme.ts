/** Design tokens. Never hardcode colors or fonts in scene code. */

export const COLORS = {
  nightNavy: 0x0e1526,
  nightNavyCss: '#0E1526',
  chalk: 0xedede6,
  chalkCss: '#EDEDE6',
  turuncu: 0xff6a00,
  turuncuCss: '#FF6A00',
  alertRed: 0xe2483d,
  alertRedCss: '#E2483D',
  panel: 0x16203a,
  panelCss: '#16203A',
  grassDark: 0x2c7a3a,
  grassLight: 0x349144,
  white: 0xffffff
} as const;

export const FONTS = {
  display: '"Archivo Black", sans-serif',
  body: '"Space Grotesk", system-ui, sans-serif'
} as const;

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
