window.PA = window.PA || {};

PA.Config = (function () {
  const CANVAS_W = 800;
  const CANVAS_H = 500;

  // Goal box in canvas space
  const GOAL_RECT = { x: 150, y: 90, w: 500, h: 200 };

  // 3x2 aiming/diving zones inside the goal box
  function buildZones() {
    const cols = ['L', 'C', 'R'];
    const rows = ['T', 'B'];
    const colW = GOAL_RECT.w / 3;
    const rowH = GOAL_RECT.h / 2;
    const zones = [];
    rows.forEach((r, ri) => {
      cols.forEach((c, ci) => {
        zones.push({
          id: r + c,
          rect: {
            x: GOAL_RECT.x + ci * colW,
            y: GOAL_RECT.y + ri * rowH,
            w: colW,
            h: rowH
          }
        });
      });
    });
    return zones;
  }

  const ZONES = buildZones();
  const ZONE_IDS = ZONES.map(z => z.id);

  const TEAMS = [
    {
      id: 'team1',
      name: 'Sarı-Lacivert',
      primary: '#ffd400',
      secondary: '#0a2472',
      pattern: 'stripes-vertical'
    },
    {
      id: 'team2',
      name: 'Sarı-Kırmızı',
      primary: '#ffd400',
      secondary: '#d1131a',
      pattern: 'stripes-diagonal'
    },
    {
      id: 'team3',
      name: 'Siyah-Beyaz',
      primary: '#111111',
      secondary: '#ffffff',
      pattern: 'stripes-vertical-bw'
    }
  ];

  const BESIKTAS_TEAM_ID = 'team3';

  const KEEPER_JERSEY = { primary: '#2e8b57', secondary: '#f2f2f2', pattern: 'solid' };

  const CLEAT_SCALE_FACTOR = 1.6;

  // Power bar timing
  const POWER_BAR_PERIOD_MS = 1400;
  const PERFECT_BAND = [0.42, 0.58];
  const ON_TARGET_BAND = [0.22, 0.78];
  const GREAT_TIMING_THRESHOLD = 0.85;
  const LUCKY_GOAL_CHANCE = 0.30;

  const AI_HISTORY_WEIGHT = 0.30;

  const SHOTS_PER_ROUND = 5;

  return {
    CANVAS_W, CANVAS_H, GOAL_RECT, ZONES, ZONE_IDS, TEAMS, BESIKTAS_TEAM_ID,
    KEEPER_JERSEY, CLEAT_SCALE_FACTOR, POWER_BAR_PERIOD_MS, PERFECT_BAND,
    ON_TARGET_BAND, GREAT_TIMING_THRESHOLD, LUCKY_GOAL_CHANCE,
    AI_HISTORY_WEIGHT, SHOTS_PER_ROUND
  };
})();
