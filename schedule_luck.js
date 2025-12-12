// schedule_luck.js
// ------------------------------------------------------------
// Schedule difficulty + schedule luck in wins.
// ------------------------------------------------------------
//
// Exports a single function on window:
//
//   window.computeScheduleLuckFromGames(gameList, options?)
//
// Where gameList is an array of:
//   {
//     home: string,     // teamId
//     away: string,     // teamId
//     homeWinProb: number  // in [0,1]; 1 or 0 for actual results,
//                          // or model probability from spreads
//   }
//
// It returns a map: { [teamId]: Metrics }
//
// Metrics:
//   {
//     teamId,
//     games,                   // total games considered
//     observedWins,
//     observedWinPct,
//     neutralWinPct,           // schedule-adjusted win% (true strength estimate)
//     neutralWins,
//     scheduleLuckWinPct,      // observedWinPct - neutralWinPct
//     scheduleLuckWins,        // in wins
//     difficulty,              // avg opponents' neutralWinPct
//     oppAvgWinsVsOthers,      // avg opponents' wins vs others (your "6.7 wins" metric)
//     oppAvgWinPctVsOthers,    // avg opponents' win% vs others
//   }
//
// The algorithm:
//
// 1) Build per-team vs-per-opponent expected wins (including probabilities).
// 2) Compute observed win% for each team.
// 3) Build an opponent graph + base "vs others" stats.
// 4) Solve the fixed-point system:
//
//      observedWinPct[i] = strength[i] + k * (difficulty[i] - leagueAvgDifficulty)
//
//    where difficulty[i] = average of opponents' strength,
//    via simple fixed-point iteration (like PageRank).
//
// 5) After convergence, compute schedule luck in wins, and the descriptive SoS stats.
//

(function () {
  function clamp01(x) {
    if (!Number.isFinite(x)) return 0.5;
    if (x < 0) return 0;
    if (x > 1) return 1;
    return x;
  }

  function computeScheduleLuckFromGames(gameList, options = {}) {
    const k = options.k ?? 1.0;          // how strongly schedule difficulty moves strength
    const maxIter = options.maxIter ?? 200;
    const tol = options.tol ?? 1e-6;

    // -----------------------------
    // 1. Discover teams
    // -----------------------------
    const teamIdSet = new Set();
    for (const g of gameList) {
      if (!g || !g.home || !g.away) continue;
      teamIdSet.add(g.home);
      teamIdSet.add(g.away);
    }
    const teamIds = Array.from(teamIdSet);
    const n = teamIds.length;
    if (n === 0) return {};

    const indexById = new Map();
    teamIds.forEach((id, idx) => indexById.set(id, idx));

    // -----------------------------
    // 2. Build vs-opponent matrices
    // -----------------------------
    // winsMatrix[i][j] = expected wins of team i vs team j
    // gamesMatrix[i][j] = number of games i has played vs j
    const winsMatrix = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => 0)
    );
    const gamesMatrix = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => 0)
    );

    // opponents[i] = list of opponent indices
    const opponents = Array.from({ length: n }, () => new Set());

    for (const g of gameList) {
      if (!g || !g.home || !g.away) continue;
      const hi = indexById.get(g.home);
      const ai = indexById.get(g.away);
      if (hi == null || ai == null || hi === ai) continue;

      const pHome = clamp01(g.homeWinProb);
      const pAway = 1 - pHome;

      winsMatrix[hi][ai] += pHome;
      winsMatrix[ai][hi] += pAway;

      gamesMatrix[hi][ai] += 1;
      gamesMatrix[ai][hi] += 1;

      opponents[hi].add(ai);
      opponents[ai].add(hi);
    }

    // -----------------------------
    // 3. Totals & base win%
    // -----------------------------
    const totalWins = new Array(n).fill(0);
    const totalGames = new Array(n).fill(0);
    const observedWinPct = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      let w = 0;
      let gCount = 0;
      for (let j = 0; j < n; j++) {
        w += winsMatrix[i][j];
        gCount += gamesMatrix[i][j];
      }
      totalWins[i] = w;
      totalGames[i] = gCount;
      observedWinPct[i] = gCount > 0 ? w / gCount : 0.5;
    }

    // -----------------------------
    // 4. "Vs-others" stats (exclude-i view)
    // -----------------------------
    // For each ordered pair (j -> i) we want:
    //   - j's wins & win% vs everyone except i,
    //   - so we can say "when I look at opponent j, how good are they vs others?"
    const oppWinsExcl = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => 0)
    );
    const oppGamesExcl = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => 0)
    );
    const baseOppWinPctExcl = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => 0.5)
    );

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        if (i === j) continue;
        const winsVsI = winsMatrix[j][i];
        const gamesVsI = gamesMatrix[j][i];

        const wExcl = totalWins[j] - winsVsI;
        const gExcl = totalGames[j] - gamesVsI;

        oppWinsExcl[j][i] = wExcl;
        oppGamesExcl[j][i] = gExcl;
        baseOppWinPctExcl[j][i] = gExcl > 0 ? wExcl / gExcl : 0.5;
      }
    }

    // -----------------------------
    // 5. Fixed-point iteration for
    //    schedule-adjusted strength
    // -----------------------------
    // We want strength (neutralWinPct) such that:
    //
    //   observedWinPct[i] ≈ strength[i] + k * (difficulty[i] - avgDifficulty)
    //
    // where difficulty[i] = avg of opponents' strength.
    //
    // We'll iterate:
    //
    //   difficulty[i]  = avg_j opponents[i] strengthPrev[j]
    //   avgDifficulty  = mean_i difficulty[i]
    //   strength[i]    = observedWinPct[i] - k * (difficulty[i] - avgDifficulty)
    //
    // until convergence.

    let strength = observedWinPct.slice();
    let difficulty = new Array(n).fill(0);

    for (let iter = 0; iter < maxIter; iter++) {
      const prevStrength = strength.slice();

      // difficulty from previous strength
      for (let i = 0; i < n; i++) {
        const oppSet = opponents[i];
        if (!oppSet || oppSet.size === 0) {
          difficulty[i] = 0.5;
          continue;
        }
        let sum = 0;
        for (const j of oppSet) {
          sum += prevStrength[j];
        }
        difficulty[i] = sum / oppSet.size;
      }

      // league-average difficulty
      let sumDiff = 0;
      for (let i = 0; i < n; i++) sumDiff += difficulty[i];
      const avgDifficulty = n > 0 ? sumDiff / n : 0.5;

      // new strength
      let maxDelta = 0;
      for (let i = 0; i < n; i++) {
        const newVal =
          observedWinPct[i] - k * (difficulty[i] - avgDifficulty);
        // clamp to [0,1] just in case
        const clamped = clamp01(newVal);
        const delta = Math.abs(clamped - prevStrength[i]);
        if (delta > maxDelta) maxDelta = delta;
        strength[i] = clamped;
      }

      if (maxDelta < tol) {
        break;
      }
    }

    // -----------------------------
    // 6. Schedule luck + SoS stats
    // -----------------------------
    const metricsByTeam = {};

    // League-average "wins vs others" for interpretability
    let leagueOppWinsVsOthersSum = 0;
    let leagueOppWinsVsOthersCount = 0;

    const oppAvgWinsVsOthersArr = new Array(n).fill(0);
    const oppAvgWinPctVsOthersArr = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      const oppSet = opponents[i];
      if (!oppSet || oppSet.size === 0) {
        oppAvgWinsVsOthersArr[i] = 0;
        oppAvgWinPctVsOthersArr[i] = 0.5;
        continue;
      }

      let sumWinsOthers = 0;
      let sumWinPctOthers = 0;
      let count = 0;

      for (const j of oppSet) {
        const wExcl = oppWinsExcl[j][i];
        const gExcl = oppGamesExcl[j][i];
        const pctExcl = gExcl > 0 ? wExcl / gExcl : 0.5;

        sumWinsOthers += wExcl;
        sumWinPctOthers += pctExcl;
        count++;

        leagueOppWinsVsOthersSum += wExcl;
        leagueOppWinsVsOthersCount++;
      }

      oppAvgWinsVsOthersArr[i] = count > 0 ? sumWinsOthers / count : 0;
      oppAvgWinPctVsOthersArr[i] = count > 0 ? sumWinPctOthers / count : 0.5;
    }

    const leagueAvgOppWinsVsOthers =
      leagueOppWinsVsOthersCount > 0
        ? leagueOppWinsVsOthersSum / leagueOppWinsVsOthersCount
        : 0;

    for (let i = 0; i < n; i++) {
      const games = totalGames[i];
      const obsPct = observedWinPct[i];
      const neutralPct = strength[i];

      const schedLuckPct = obsPct - neutralPct;
      const schedLuckWins = schedLuckPct * games;

      const neutralWins = neutralPct * games;

      metricsByTeam[teamIds[i]] = {
        teamId: teamIds[i],
        games,
        observedWins: totalWins[i],
        observedWinPct: obsPct,
        neutralWinPct: neutralPct,
        neutralWins,
        scheduleLuckWinPct: schedLuckPct,
        scheduleLuckWins: schedLuckWins,
        difficulty: difficulty[i],
        oppAvgWinsVsOthers: oppAvgWinsVsOthersArr[i],
        oppAvgWinPctVsOthers: oppAvgWinPctVsOthersArr[i],
        leagueAvgOppWinsVsOthers
      };
    }

    return metricsByTeam;
  }

  // Expose globally so projections_view.js (and others) can call it
  window.computeScheduleLuckFromGames = computeScheduleLuckFromGames;
})();
