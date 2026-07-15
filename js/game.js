window.PA = window.PA || {};

PA.Game = (function () {
  const CFG = PA.Config;
  const U = PA.Utils;

  const ZONE_LABELS = {
    TL: 'Sol Üst', TC: 'Orta Üst', TR: 'Sağ Üst',
    BL: 'Sol Alt', BC: 'Orta Alt', BR: 'Sağ Alt'
  };

  let ctx = null;
  let dom = {};
  let shotTimeouts = [];

  const GameState = {
    screen: 'MENU',
    mode: null,
    match: null
  };

  let kickerChar = null;
  let keeperChar = null;

  function $(id) { return document.getElementById(id); }

  function cacheDom() {
    dom = {
      screens: document.querySelectorAll('.screen'),
      screenMenu: $('screen-menu'),
      screenTeamSelect: $('screen-team-select'),
      screenNameEntry: $('screen-name-entry'),
      screenMatchEnd: $('screen-match-end'),
      hudMatch: $('hud-match'),

      btnVsComputer: $('btn-vs-computer'),
      btnOnline: $('btn-online'),

      teamSwatches: document.querySelectorAll('.team-swatch'),
      cpuTeamPreview: $('cpu-team-preview'),
      btnTeamContinue: $('btn-team-continue'),

      inputNameA: $('input-name-a'),
      nameBDisplay: $('name-b-display'),
      btnStartMatch: $('btn-start-match'),

      hudNameA: $('hud-name-a'),
      hudNameB: $('hud-name-b'),
      hudScoreA: $('hud-score-a'),
      hudScoreB: $('hud-score-b'),
      hudShotsA: $('hud-shots-a'),
      hudShotsB: $('hud-shots-b'),
      hudTurnLabel: $('hud-turn-label'),
      hudRoundLabel: $('hud-round-label'),

      matchEndTitle: $('match-end-title'),
      matchEndScore: $('match-end-score'),
      btnReplay: $('btn-replay'),
      btnBackMenu: $('btn-back-menu')
    };
  }

  function showScreen(id) {
    dom.screens.forEach(s => s.classList.add('hidden'));
    if (id) $(id).classList.remove('hidden');
  }

  // ---------- Setup wizard state ----------
  let pendingTeamA = null;
  let pendingTeamB = null;
  let pendingNameA = 'Böcek 1';

  function init() {
    cacheDom();
    ctx = $('game-canvas').getContext('2d');

    dom.btnVsComputer.addEventListener('click', () => {
      PA.Audio.initAudio();
      GameState.mode = 'single';
      showScreen('screen-team-select');
    });

    dom.teamSwatches.forEach(el => {
      el.addEventListener('click', () => {
        dom.teamSwatches.forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        pendingTeamA = el.getAttribute('data-team-id');
        const others = CFG.TEAMS.filter(t => t.id !== pendingTeamA);
        pendingTeamB = others[Math.floor(Math.random() * others.length)].id;
        const teamBDef = CFG.TEAMS.find(t => t.id === pendingTeamB);
        dom.cpuTeamPreview.textContent = 'Bilgisayarın forması: ' + teamBDef.name;
        dom.cpuTeamPreview.classList.remove('hidden');
        dom.btnTeamContinue.disabled = false;
      });
    });

    dom.btnTeamContinue.addEventListener('click', () => {
      showScreen('screen-name-entry');
    });

    dom.btnStartMatch.addEventListener('click', () => {
      pendingNameA = (dom.inputNameA.value || '').trim() || 'Böcek 1';
      startSinglePlayerMatch();
    });

    dom.btnReplay.addEventListener('click', () => {
      showScreen('screen-team-select');
      dom.teamSwatches.forEach(e => e.classList.remove('selected'));
      dom.cpuTeamPreview.classList.add('hidden');
      dom.btnTeamContinue.disabled = true;
      GameState.screen = 'TEAM_SELECT';
      GameState.match = null;
    });

    dom.btnBackMenu.addEventListener('click', () => {
      showScreen('screen-menu');
      GameState.screen = 'MENU';
      GameState.match = null;
    });

    kickerChar = {
      x: CFG.CANVAS_W / 2 + 4, y: CFG.CANVAS_H - 58, scale: 1.35, facing: 1,
      team: CFG.TEAMS[0], role: 'kicker', anim: null, pose: null
    };
    keeperChar = {
      x: CFG.GOAL_RECT.x + CFG.GOAL_RECT.w / 2, y: CFG.GOAL_RECT.y + CFG.GOAL_RECT.h - 6,
      scale: 0.72, facing: 1, team: CFG.KEEPER_JERSEY, role: 'keeper', anim: null, pose: null,
      diveZone: 'TC'
    };

    PA.Roach.playAnimation(kickerChar, 'idle', 2200, null, true);
    PA.Roach.playAnimation(keeperChar, 'idle', 2200, null, true);

    GameState.screen = 'MENU';
    showScreen('screen-menu');
  }

  // ---------- Match setup ----------

  function startSinglePlayerMatch() {
    const teamA = CFG.TEAMS.find(t => t.id === pendingTeamA) || CFG.TEAMS[0];
    const teamB = CFG.TEAMS.find(t => t.id === pendingTeamB) || CFG.TEAMS[1];

    GameState.match = {
      teams: { A: teamA, B: teamB },
      players: { A: 'human', B: 'ai' },
      names: { A: pendingNameA, B: 'Bilgisayar' },
      score: { A: 0, B: 0 },
      shotHistory: { A: [], B: [] },
      aiHistory: {
        playerAimHistory: U.makeEmptyZoneHistory(CFG.ZONE_IDS),
        playerDiveHistory: U.makeEmptyZoneHistory(CFG.ZONE_IDS)
      },
      currentShot: null,
      besiktasBubble: null
    };

    dom.hudNameA.textContent = pendingNameA;
    dom.hudNameB.textContent = 'Bilgisayar';

    GameState.screen = 'MATCH';
    showScreen(null);
    dom.hudMatch.classList.remove('hidden');
    updateScoreboardUI();
    updateShotIndicatorsUI();
    PA.Audio.startCrowdMurmur();
    startShot();
  }

  // ---------- Shootout flow control ----------

  function isRegulationPhase() {
    const m = GameState.match;
    return m.shotHistory.A.length < CFG.SHOTS_PER_ROUND || m.shotHistory.B.length < CFG.SHOTS_PER_ROUND;
  }

  function remainingRegulation(side) {
    const m = GameState.match;
    return Math.max(0, CFG.SHOTS_PER_ROUND - m.shotHistory[side].length);
  }

  function checkMatchDecided() {
    const m = GameState.match;
    const A = m.score.A, B = m.score.B;
    if (isRegulationPhase()) {
      const remA = remainingRegulation('A');
      const remB = remainingRegulation('B');
      if (A > B + remB) return 'A';
      if (B > A + remA) return 'B';
      if (m.shotHistory.A.length === CFG.SHOTS_PER_ROUND && m.shotHistory.B.length === CFG.SHOTS_PER_ROUND && A !== B) {
        return A > B ? 'A' : 'B';
      }
      return null;
    }
    if (m.shotHistory.A.length === m.shotHistory.B.length && A !== B) {
      return A > B ? 'A' : 'B';
    }
    return null;
  }

  function nextKickingSide() {
    const m = GameState.match;
    return (m.shotHistory.A.length + m.shotHistory.B.length) % 2 === 0 ? 'A' : 'B';
  }

  function clearShotTimeouts() {
    shotTimeouts.forEach(id => clearTimeout(id));
    shotTimeouts = [];
  }

  function setPhase(phase, label) {
    GameState.match.currentShot.phase = phase;
    if (label) dom.hudTurnLabel.textContent = label;
  }

  function startShot() {
    const m = GameState.match;
    const kickingSide = nextKickingSide();
    const keepingSide = kickingSide === 'A' ? 'B' : 'A';

    m.currentShot = {
      kickingSide, keepingSide,
      aimZone: null, timingAccuracy: null, onTarget: null, diveZone: null,
      outcome: null, isBesiktasGoal: false,
      phase: null, powerElapsed: 0, ballAnim: null
    };
    m.besiktasBubble = null;

    kickerChar.team = m.teams[kickingSide];
    keeperChar.diveZone = 'TC';
    PA.Roach.playAnimation(kickerChar, 'idle', 2200, null, true);
    PA.Roach.playAnimation(keeperChar, 'idle', 2200, null, true);

    const suddenDeath = !isRegulationPhase();
    dom.hudRoundLabel.textContent = suddenDeath ? 'Altın Gol' :
      'Atış ' + (Math.max(m.shotHistory.A.length, m.shotHistory.B.length) + 1) + ' / ' + CFG.SHOTS_PER_ROUND;

    const kickerIsHuman = m.players[kickingSide] === 'human';
    if (kickerIsHuman) {
      setPhase('AIMING', 'Kaleye nişan al: bir bölge seç');
    } else {
      setPhase('AI_THINK', m.names[kickingSide] + ' şut için hazırlanıyor...');
      shotTimeouts.push(setTimeout(() => {
        const aimZone = PA.AI.pickAIZone(m.aiHistory.playerDiveHistory, CFG.AI_HISTORY_WEIGHT);
        const timing = PA.AI.simulateAiTiming();
        m.currentShot.aimZone = aimZone;
        m.currentShot.timingAccuracy = timing.timingAccuracy;
        m.currentShot.onTarget = timing.onTarget;
        proceedToKeeperChoice();
      }, U.randomInRange(400, 750)));
    }
  }

  function proceedToKeeperChoice() {
    const m = GameState.match;
    const keepingSide = m.currentShot.keepingSide;
    const keeperIsHuman = m.players[keepingSide] === 'human';
    if (keeperIsHuman) {
      setPhase('KEEPER_CHOICE', 'Kaleci: dalacağın bölgeyi seç');
    } else {
      setPhase('AI_THINK', m.names[keepingSide] + ' dalış için hazırlanıyor...');
      shotTimeouts.push(setTimeout(() => {
        const diveZone = PA.AI.pickAIZone(m.aiHistory.playerAimHistory, CFG.AI_HISTORY_WEIGHT);
        m.currentShot.diveZone = diveZone;
        resolveCurrentShot();
      }, U.randomInRange(350, 650)));
    }
  }

  function resolveCurrentShot() {
    const m = GameState.match;
    const cs = m.currentShot;
    const kickerIsHuman = m.players[cs.kickingSide] === 'human';
    const keeperIsHuman = m.players[cs.keepingSide] === 'human';

    if (kickerIsHuman) PA.AI.recordHistory(m.aiHistory.playerAimHistory, cs.aimZone);
    if (keeperIsHuman) PA.AI.recordHistory(m.aiHistory.playerDiveHistory, cs.diveZone);

    cs.outcome = PA.AI.resolveShot({
      onTarget: cs.onTarget, aimZone: cs.aimZone, diveZone: cs.diveZone, timingAccuracy: cs.timingAccuracy
    });

    const scoringTeam = m.teams[cs.kickingSide];
    cs.isBesiktasGoal = cs.outcome === 'goal' && scoringTeam.id === CFG.BESIKTAS_TEAM_ID;

    m.shotHistory[cs.kickingSide].push(cs.outcome);
    if (cs.outcome === 'goal') m.score[cs.kickingSide]++;

    updateScoreboardUI();
    updateShotIndicatorsUI();

    setPhase('ANIM', outcomeLabel(cs.outcome));
    playShotAnimationSequence();
  }

  function outcomeLabel(outcome) {
    if (outcome === 'goal') return 'GOOOOL!';
    if (outcome === 'save') return 'Kurtardı!';
    return 'Kaçtı!';
  }

  function playShotAnimationSequence() {
    const m = GameState.match;
    const cs = m.currentShot;
    clearShotTimeouts();

    PA.Audio.playWhistle();
    PA.Roach.playAnimation(kickerChar, 'runup', 500, null, false);
    startBallRestPosition();

    shotTimeouts.push(setTimeout(() => {
      PA.Roach.playAnimation(kickerChar, 'kickImpact', 420, null, false);
      keeperChar.diveZone = cs.diveZone;
      PA.Roach.playAnimation(keeperChar, 'keeperDive', 420, null, false);
      startBallFlight();
    }, 500));

    shotTimeouts.push(setTimeout(() => {
      applyResultReactions();
    }, 500 + 430));

    shotTimeouts.push(setTimeout(() => {
      finishShot();
    }, 500 + 430 + 1100));
  }

  function startBallRestPosition() {
    const cs = GameState.match.currentShot;
    cs.ballAnim = null;
    cs.ballPos = { x: CFG.CANVAS_W / 2 + 6, y: CFG.CANVAS_H - 78 };
    cs.ballScale = 1.15;
  }

  function startBallFlight() {
    const cs = GameState.match.currentShot;
    const from = { x: CFG.CANVAS_W / 2 + 6, y: CFG.CANVAS_H - 78 };
    let to;
    if (cs.onTarget) {
      const zone = CFG.ZONES.find(z => z.id === cs.aimZone);
      to = PA.Render.zoneCenter(zone);
    } else {
      const zone = CFG.ZONES.find(z => z.id === cs.aimZone) || CFG.ZONES[0];
      const c = PA.Render.zoneCenter(zone);
      const gc = { x: CFG.GOAL_RECT.x + CFG.GOAL_RECT.w / 2, y: CFG.GOAL_RECT.y + CFG.GOAL_RECT.h / 2 };
      const dx = c.x - gc.x, dy = c.y - gc.y;
      const norm = Math.hypot(dx, dy) || 1;
      to = { x: c.x + (dx / norm) * 110, y: c.y + (dy / norm) * 110 - 50 };
    }
    cs.ballAnim = { from, to, duration: 420, elapsed: 0 };
  }

  function applyResultReactions() {
    const m = GameState.match;
    const cs = m.currentShot;

    if (cs.outcome === 'goal') {
      if (cs.isBesiktasGoal) {
        PA.Roach.playAnimation(kickerChar, 'celebrateBesiktas', 1600, null, false);
        m.besiktasBubble = { text: 'BABANIZ BEŞİKTAŞ ULAN!', until: Date.now() + 1800 };
        PA.Audio.playBesiktasCelebration();
        PA.Audio.playCrowdCheer();
      } else {
        PA.Roach.playAnimation(kickerChar, 'celebrateGoal', 1000, null, false);
        PA.Audio.playGoalHorn();
        PA.Audio.playCrowdCheer();
      }
    } else if (cs.outcome === 'save') {
      PA.Roach.playAnimation(keeperChar, 'reactSaveKeeper', 800, null, false);
      PA.Roach.playAnimation(kickerChar, 'reactSaveKicker', 800, null, false);
      PA.Audio.playSaveThud();
      PA.Audio.playCrowdGroan();
    } else {
      PA.Roach.playAnimation(kickerChar, 'reactMissKicker', 800, null, false);
      PA.Audio.playMissWhoosh();
      PA.Audio.playCrowdGroan();
    }
  }

  function finishShot() {
    const winnerSide = checkMatchDecided();
    if (winnerSide) {
      endMatch(winnerSide);
    } else {
      startShot();
    }
  }

  function endMatch(winnerSide) {
    const m = GameState.match;
    GameState.screen = 'MATCH_END';
    PA.Audio.stopCrowdMurmur();
    dom.hudMatch.classList.add('hidden');
    dom.matchEndTitle.textContent = m.names[winnerSide] + ' KAZANDI!';
    dom.matchEndScore.textContent = m.names.A + ' ' + m.score.A + ' - ' + m.score.B + ' ' + m.names.B;
    showScreen('screen-match-end');

    kickerChar.team = m.teams[winnerSide];
    kickerChar.x = CFG.CANVAS_W / 2;
    kickerChar.y = CFG.CANVAS_H - 90;
    kickerChar.scale = 1.6;
    PA.Roach.playAnimation(kickerChar, 'victoryDance', 900, null, true);
    keeperChar.x = -500; // move offscreen during victory display
  }

  // ---------- UI updates ----------

  function updateScoreboardUI() {
    const m = GameState.match;
    dom.hudScoreA.textContent = m.score.A;
    dom.hudScoreB.textContent = m.score.B;
  }

  function updateShotIndicatorsUI() {
    const m = GameState.match;
    ['A', 'B'].forEach(side => {
      const container = side === 'A' ? dom.hudShotsA : dom.hudShotsB;
      container.innerHTML = '';
      const total = Math.max(CFG.SHOTS_PER_ROUND, m.shotHistory[side].length);
      for (let i = 0; i < Math.max(CFG.SHOTS_PER_ROUND, m.shotHistory.A.length, m.shotHistory.B.length); i++) {
        const outcome = m.shotHistory[side][i];
        const dot = document.createElement('span');
        dot.className = 'shot-dot';
        if (outcome === 'goal') { dot.classList.add('shot-goal'); dot.textContent = '✓'; }
        else if (outcome != null) { dot.classList.add('shot-miss'); dot.textContent = '✗'; }
        else { dot.textContent = '·'; }
        container.appendChild(dot);
      }
    });
  }

  // ---------- Per-frame update/render ----------

  function update(dt) {
    PA.Roach.update(kickerChar, dt);
    PA.Roach.update(keeperChar, dt);

    if (GameState.screen !== 'MATCH' || !GameState.match || !GameState.match.currentShot) return;
    const cs = GameState.match.currentShot;

    if (cs.phase === 'POWER') {
      cs.powerElapsed += dt;
    }

    if (cs.ballAnim) {
      cs.ballAnim.elapsed += dt;
      const t = U.clamp(cs.ballAnim.elapsed / cs.ballAnim.duration, 0, 1);
      cs.ballPos = {
        x: U.lerp(cs.ballAnim.from.x, cs.ballAnim.to.x, t),
        y: U.lerp(cs.ballAnim.from.y, cs.ballAnim.to.y, t)
      };
      cs.ballScale = U.lerp(1.15, 0.6, t);
      if (t >= 1) cs.ballAnim = null;
    }

    if (GameState.match.besiktasBubble && Date.now() > GameState.match.besiktasBubble.until) {
      GameState.match.besiktasBubble = null;
    }
  }

  function render(context) {
    PA.Render.drawStadium(context);
    PA.Render.drawGoal(context);

    if (GameState.screen === 'MATCH' && GameState.match) {
      renderMatch(context);
    } else if (GameState.screen === 'MATCH_END') {
      PA.Roach.drawRoach(context, kickerChar);
    } else {
      // idle preview on menu/setup screens
      PA.Roach.drawRoach(context, keeperChar);
      PA.Roach.drawRoach(context, kickerChar);
    }
  }

  function renderMatch(context) {
    const m = GameState.match;
    const cs = m.currentShot;
    if (!cs) return;

    if (cs.phase === 'AIMING') {
      PA.Render.drawZoneGrid(context, { selectedZone: cs.aimZone, interactive: true });
    } else if (cs.phase === 'KEEPER_CHOICE') {
      PA.Render.drawZoneGrid(context, { diveZone: cs.diveZone, interactive: true });
    }

    PA.Roach.drawRoach(context, keeperChar);
    PA.Roach.drawRoach(context, kickerChar);

    if (cs.ballPos) {
      PA.Render.drawBall(context, cs.ballPos, cs.ballScale || 1);
    }

    if (cs.phase === 'POWER') {
      const pos = U.triangleWave(cs.powerElapsed, CFG.POWER_BAR_PERIOD_MS);
      PA.Render.drawPowerBar(context, { position: pos });
    }

    if (m.besiktasBubble) {
      PA.Render.drawSpeechBubble(context, {
        x: kickerChar.x, y: kickerChar.y - 90, text: m.besiktasBubble.text, big: true
      });
    }
  }

  // ---------- Input ----------

  function onPointerDown(pt) {
    if (GameState.screen !== 'MATCH' || !GameState.match || !GameState.match.currentShot) return;
    const cs = GameState.match.currentShot;

    if (cs.phase === 'AIMING') {
      const zone = CFG.ZONES.find(z => U.pointInRect(pt, z.rect));
      if (!zone) return;
      cs.aimZone = zone.id;
      cs.powerElapsed = 0;
      setPhase('POWER', 'Güç barını doğru anda durdur!');
    } else if (cs.phase === 'POWER') {
      lockPower();
    } else if (cs.phase === 'KEEPER_CHOICE') {
      const zone = CFG.ZONES.find(z => U.pointInRect(pt, z.rect));
      if (!zone) return;
      cs.diveZone = zone.id;
      resolveCurrentShot();
    }
  }

  function lockPower() {
    const cs = GameState.match.currentShot;
    const pos = U.triangleWave(cs.powerElapsed, CFG.POWER_BAR_PERIOD_MS);
    cs.timingAccuracy = 1 - Math.abs(pos - 0.5) * 2;
    cs.onTarget = pos >= CFG.ON_TARGET_BAND[0] && pos <= CFG.ON_TARGET_BAND[1];
    proceedToKeeperChoice();
  }

  function onPointerUp() {}

  function onActionKey() {
    if (GameState.screen === 'MATCH' && GameState.match && GameState.match.currentShot &&
        GameState.match.currentShot.phase === 'POWER') {
      lockPower();
    }
  }

  return {
    init, update, render, onPointerDown, onPointerUp, onActionKey,
    GameState
  };
})();
