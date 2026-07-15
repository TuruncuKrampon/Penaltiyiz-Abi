window.PA = window.PA || {};

PA.AI = (function () {
  const CFG = PA.Config;
  const U = PA.Utils;

  // Pure function: decides the outcome of a single shot.
  function resolveShot({ onTarget, aimZone, diveZone, timingAccuracy }) {
    if (!onTarget) return 'miss';
    if (diveZone !== aimZone) return 'goal';
    if (timingAccuracy >= CFG.GREAT_TIMING_THRESHOLD && Math.random() < CFG.LUCKY_GOAL_CHANCE) {
      return 'goal';
    }
    return 'save';
  }

  // Picks a zone, blending uniform randomness with a history-weighted bias.
  function pickAIZone(historyMap, weight) {
    weight = weight != null ? weight : CFG.AI_HISTORY_WEIGHT;
    const zoneIds = CFG.ZONE_IDS;
    const total = zoneIds.reduce((s, id) => s + (historyMap[id] || 0), 0);
    const finalWeights = {};
    zoneIds.forEach(id => {
      const uniformProb = 1 / zoneIds.length;
      const historyProb = total > 0 ? (historyMap[id] || 0) / total : uniformProb;
      finalWeights[id] = (1 - weight) * uniformProb + weight * historyProb;
    });
    return U.weightedPick(finalWeights);
  }

  function recordHistory(historyMap, zoneId) {
    if (historyMap[zoneId] == null) historyMap[zoneId] = 0;
    historyMap[zoneId]++;
  }

  // Simulated AI kicker timing (no power-bar UI for AI).
  function simulateAiTiming() {
    const poorRoll = Math.random() < 0.10;
    if (poorRoll) {
      return { timingAccuracy: U.randomInRange(0, 0.3), onTarget: false };
    }
    const accuracy = U.randomInRange(0.6, 1.0);
    return { timingAccuracy: accuracy, onTarget: true };
  }

  return { resolveShot, pickAIZone, recordHistory, simulateAiTiming };
})();
