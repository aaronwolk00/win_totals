// projections_view.js
// ------------------------------------------------------------
// Teams tab: projections, division summaries, team detail modal,
// and CSV export.
// ------------------------------------------------------------
//
// Depends on globals defined elsewhere:
//   - teams, games, teamPalettes, QUICK_SPREAD_PRESETS, NEUTRAL_SPREAD
//   - state, teamIds, TABLE_HEADERS
//   - COMPLETED_RESULTS_2025 (from completed_results_2025.js)
//   - resultHasAnyPickedGame (helper from shared.js)
//   - formatNumber, formatPercent
//   - saveStateToStorage, updateProgressUI
//   - homeWinProbFromSpread
//   - computeScheduleLuckFromGames OR window.computeScheduleLuckFromGames
//   - window.refreshBettingFromStorage (optional)

// ---------------------------
// Core projection math
// ---------------------------

// Compute distribution P(exactly k wins), k = 0..4, via 2^4 combinations
function computeExactDistribution(probs) {
  const result = [0, 0, 0, 0, 0]; // k=0..4
  const n = 4;

  for (let mask = 0; mask < (1 << n); mask++) {
    let prob = 1;
    let wins = 0;
    for (let i = 0; i < n; i++) {
      const p = probs[i];
      if (mask & (1 << i)) {
        prob *= p;
        wins++;
      } else {
        prob *= 1 - p;
      }
    }
    result[wins] += prob;
  }

  return result;
}

// Convert exact[] into cumulative[] = P(≥k wins)
function computeCumulative(exact) {
  // exact[0..4]
  const cumulative = [1, 0, 0, 0, 0]; // atLeast0,1,2,3,4
  cumulative[4] = exact[4];
  cumulative[3] = exact[3] + cumulative[4];
  cumulative[2] = exact[2] + cumulative[3];
  cumulative[1] = exact[1] + cumulative[2];
  return cumulative;
}

// ---------------------------
// Name → teamId mapping for completed results
// ---------------------------

const TEAM_NAME_TO_ID = (() => {
  const map = {};
  for (const teamId of teamIds) {
    const info = teams[teamId];
    if (!info) continue;

    const candidates = [];
    if (info.fullName) candidates.push(info.fullName);  // e.g. "New England Patriots"
    if (info.name) candidates.push(info.name);          // e.g. "Patriots"
    if (info.longName) candidates.push(info.longName);

    for (const name of candidates) {
      if (typeof name === "string" && name.trim()) {
        map[name] = teamId;
      }
    }
  }
  return map;
})();

// ---------------------------
// Completed results helpers
// ---------------------------

// Current wins per team, derived purely from COMPLETED_RESULTS_2025
function computeCurrentWinsFromCompletedResults() {
  const wins = {};
  for (const teamId of teamIds) {
    wins[teamId] = 0;
  }

  if (typeof COMPLETED_RESULTS_2025 === "undefined" ||
      !Array.isArray(COMPLETED_RESULTS_2025)) {
    return wins;
  }

  for (const g of COMPLETED_RESULTS_2025) {
    const homeId = TEAM_NAME_TO_ID[g.homeName];
    const awayId = TEAM_NAME_TO_ID[g.visitorName];
    if (!homeId || !awayId) continue;

    const hs = g.homeScore;
    const vs = g.visitorScore;
    if (!Number.isFinite(hs) || !Number.isFinite(vs)) continue;

    if (hs > vs) {
      wins[homeId] += 1;
    } else if (vs > hs) {
      wins[awayId] += 1;
    } else {
      // If ties ever exist: half win each
      wins[homeId] += 0.5;
      wins[awayId] += 0.5;
    }
  }

  return wins;
}

// Build game list from completed real results (Weeks 1+)
function buildGameListFromCompletedResults() {
  const list = [];
  if (typeof COMPLETED_RESULTS_2025 === "undefined" ||
      !Array.isArray(COMPLETED_RESULTS_2025)) {
    return list;
  }

  for (const g of COMPLETED_RESULTS_2025) {
    const homeId = TEAM_NAME_TO_ID[g.homeName];
    const awayId = TEAM_NAME_TO_ID[g.visitorName];
    if (!homeId || !awayId) {
      // Name mismatch → skip
      continue;
    }

    let homeProb = 0.5;
    const hs = g.homeScore;
    const vs = g.visitorScore;

    if (Number.isFinite(hs) && Number.isFinite(vs)) {
      if (hs > vs) homeProb = 1;
      else if (hs < vs) homeProb = 0;
      else homeProb = 0.5;
    }

    list.push({
      home: homeId,
      away: awayId,
      homeWinProb: homeProb
    });
  }

  return list;
}

// Build game list from remaining schedule + current spreads (Weeks 15–18)
function buildGameListFromSpreads() {
  const list = [];

  for (const g of games) {
    const key = String(g.id);
    let homeProb = 0.5;

    if (Object.prototype.hasOwnProperty.call(state.spreads, key)) {
      const s = state.spreads[key];
      if (typeof s === "number" && Number.isFinite(s)) {
        homeProb = homeWinProbFromSpread(s);
      }
    }

    list.push({
      home: g.home,
      away: g.away,
      homeWinProb: homeProb
    });
  }

  return list;
}

// Full-season view = completed games + remaining games
function buildFullSeasonGameList() {
  const completed = buildGameListFromCompletedResults();
  const remaining = buildGameListFromSpreads();
  return completed.concat(remaining);
}

// ---------------------------
// Compute and render everything
// ---------------------------

function computeAndRenderResults() {
  const precision = state.precision;

  // 1) Current wins from completed results
  const currentWinsByTeam = computeCurrentWinsFromCompletedResults();
  // Optionally keep teams[*].currentWins in sync for other views
  for (const teamId of teamIds) {
    if (!teams[teamId]) continue;
    teams[teamId].currentWins = currentWinsByTeam[teamId] ?? 0;
  }

  // 2) Build remaining 4-game probabilities from spreads
  const teamGameProbs = {};
  for (const teamId of teamIds) {
    teamGameProbs[teamId] = [];
  }

  const touchedTeams = new Set();
  const gameWinProbs = {}; // gameId -> { homeProb, awayProb }

  for (const game of games) {
    const key = String(game.id);
    let homeProb = 0.5;

    if (Object.prototype.hasOwnProperty.call(state.spreads, key)) {
      const spreadVal = state.spreads[key];
      if (typeof spreadVal === "number") {
        homeProb = homeWinProbFromSpread(spreadVal);
        touchedTeams.add(game.home);
        touchedTeams.add(game.away);
      }
    }

    const awayProb = 1 - homeProb;
    gameWinProbs[game.id] = { homeProb, awayProb };

    teamGameProbs[game.home].push(homeProb);
    teamGameProbs[game.away].push(awayProb);
  }

  // Pad to 4 games (fixed horizon). Padding with 0.5 doesn't
  // affect "edge vs neutral" because (0.5 - 0.5) = 0.
  for (const teamId of teamIds) {
    const arr = teamGameProbs[teamId];
    while (arr.length < 4) {
      arr.push(0.5);
    }
  }

  const results = [];

  for (const teamId of teamIds) {
    if (!touchedTeams.has(teamId)) {
      // User has not picked any spreads for this team yet
      continue;
    }

    const info = teams[teamId];
    const probs = teamGameProbs[teamId];

    const currentWins = currentWinsByTeam[teamId] ?? 0;
    const expectedAdditionalWins = probs.reduce((sum, p) => sum + p, 0);
    const projectedWins = currentWins + expectedAdditionalWins;

    const exact = computeExactDistribution(probs); // length 5: P(0..4)
    const cumulative = computeCumulative(exact);   // length 5: P(≥0..≥4)

    // Edge from remaining schedule vs a neutral 50/50 slate:
    // sum over remaining games of (p(win) - 0.5)
    const remainingScheduleEdgeWins = probs.reduce(
      (sum, p) => sum + (p - 0.5),
      0
    );

    results.push({
      teamId,
      division: info.division,
      currentWins,
      expectedAdditionalWins,
      projectedWins,
      exact,
      cumulative,
      probs,
      remainingScheduleEdgeWins,
      // schedule / SoS fields attached below
    });
  }

  // 3) Full-season schedule luck + SoS from completed results + spreads
  try {
    const fullSeasonGames = buildFullSeasonGameList();

    let scheduleFn = null;
    if (typeof computeScheduleLuckFromGames === "function") {
      scheduleFn = computeScheduleLuckFromGames;
    } else if (
      typeof window !== "undefined" &&
      typeof window.computeScheduleLuckFromGames === "function"
    ) {
      scheduleFn = window.computeScheduleLuckFromGames;
    }

    if (scheduleFn && fullSeasonGames.length > 0) {
      const metricsByTeam = scheduleFn(fullSeasonGames, {
        k: 1.0,
        maxIter: 200,
        tol: 1e-6,
      });

      for (const r of results) {
        const m = metricsByTeam[r.teamId];
        if (!m) continue;

        // Full-season neutral strength / wins
        r.neutralWinPctSeason = m.neutralWinPct;
        r.neutralWinsSeason = m.neutralWins;

        // Full-season schedule luck in wins
        r.scheduleLuckWinPctSeason = m.scheduleLuckWinPct;
        r.scheduleLuckWinsSeason = m.scheduleLuckWins;

        // Strength-of-schedule: opponents’ avg wins vs others
        r.sosOppWinsAvg = m.oppAvgWinsVsOthers;
        r.sosOppWinPctAvg = m.oppAvgWinPctVsOthers;
        r.sosLeagueAvgOppWins = m.leagueAvgOppWinsVsOthers;

        // Alias used by table sorting
        r.sos = r.sosOppWinsAvg;
      }
    }
  } catch (err) {
    console.warn("Schedule luck / SoS computation failed:", err);
  }

  // 4) Save & render
  state.results = results;
  renderTeamTable();
  renderDivisionSummary();
  saveStateToStorage();
  updateProgressUI();

  if (window.refreshBettingFromStorage) {
    window.refreshBettingFromStorage();
  }
}

// ---------------------------
// Main projections table
// ---------------------------

function renderTeamTable() {
  const container = document.getElementById("teamTableContainer");
  if (!container) return;

  container.innerHTML = "";

  const resultsCopy = [...state.results];
  const { key, direction } = state.currentSort;
  const dir = direction === "asc" ? 1 : -1;

  const valueForKey = (r) => {
    switch (key) {
      case "team":
        return r.teamId;
      case "division":
        return r.division;
      case "projected":
        return r.projectedWins;
      case "current":
        return r.currentWins;
      case "sos":
        return r.sos != null ? r.sos : 0;
      default:
        return r.projectedWins;
    }
  };

  resultsCopy.sort((a, b) => {
    const va = valueForKey(a);
    const vb = valueForKey(b);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });

  const precision = state.precision;
  const table = document.createElement("table");
  table.className = "table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  for (const h of TABLE_HEADERS) {
    if (!state.visibleColumns[h.key]) continue;

    const th = document.createElement("th");
    th.textContent = h.label;

    if (["team", "division", "projected", "current", "sos"].includes(h.key)) {
      th.classList.add("sortable");
      const span = document.createElement("span");
      span.className = "sort-indicator";
      span.textContent =
        state.currentSort.key === h.key
          ? state.currentSort.direction === "asc"
            ? "▲"
            : "▼"
          : "◆";
      th.appendChild(span);

      th.addEventListener("click", () => {
        if (state.currentSort.key === h.key) {
          state.currentSort.direction =
            state.currentSort.direction === "asc" ? "desc" : "asc";
        } else {
          state.currentSort.key = h.key;
          state.currentSort.direction =
            h.key === "team" || h.key === "division" ? "asc" : "desc";
        }
        renderTeamTable();
      });
    }

    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  for (const r of resultsCopy) {
    if (!resultHasAnyPickedGame(r)) continue;

    const tr = document.createElement("tr");
    tr.dataset.teamId = r.teamId;

    const palette = teamPalettes[r.teamId] || {};
    tr.style.setProperty("--team-color-main", palette.primary || "#334155");
    tr.style.setProperty("--team-color-alt", palette.secondary || "#64748b");

    tr.addEventListener("click", () => {
      showTeamDetail(r.teamId);
    });

    for (const h of TABLE_HEADERS) {
      if (!state.visibleColumns[h.key]) continue;

      const td = document.createElement("td");

      switch (h.key) {
        case "team":
          td.className = "team-cell";
          td.textContent = r.teamId;
          break;

        case "division":
          td.innerHTML = `<span class="badge-division">${r.division}</span>`;
          break;

        case "current":
          td.textContent = r.currentWins.toString();
          break;

        case "expected":
          td.textContent = formatNumber(r.expectedAdditionalWins, precision);
          break;

        case "projected":
          td.textContent = formatNumber(r.projectedWins, precision);
          break;

        case "sos": {
          td.classList.add("numeric-cell");
          if (r.sosOppWinsAvg == null) {
            td.textContent = "—";
          } else {
            td.textContent = formatNumber(r.sosOppWinsAvg, 2);
          }
          break;
        }

        case "P0":
        case "P1":
        case "P2":
        case "P3":
        case "P4": {
          const k = Number(h.key.slice(1));
          td.textContent = formatPercent(r.exact[k], precision);
          break;
        }

        case "PA1":
        case "PA2":
        case "PA3":
        case "PA4": {
          const k = Number(h.key.slice(2));
          td.textContent = formatPercent(r.cumulative[k], precision);
          break;
        }

        default:
          break;
      }

      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  container.appendChild(table);
}

// ---------------------------
// Column picker
// ---------------------------

function renderColumnPicker() {
  const picker = document.getElementById("columnPicker");
  if (!picker) return;

  picker.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "column-picker-grid";

  TABLE_HEADERS.forEach((h) => {
    const wrap = document.createElement("label");
    wrap.className = "column-toggle";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = state.visibleColumns[h.key] !== false;

    input.addEventListener("change", () => {
      state.visibleColumns[h.key] = input.checked;
      saveStateToStorage();
      renderTeamTable();
    });

    const span = document.createElement("span");
    span.textContent = h.label;

    wrap.appendChild(input);
    wrap.appendChild(span);
    grid.appendChild(wrap);
  });

  picker.appendChild(grid);
}

// ---------------------------
// Division summaries + note
// ---------------------------

function renderDivisionSummary() {
  const container = document.getElementById("divisionSummaryContainer");
  if (!container) return;

  container.innerHTML = "";

  const resultsByDiv = {};
  for (const r of state.results) {
    if (!resultHasAnyPickedGame(r)) continue;
    if (!resultsByDiv[r.division]) resultsByDiv[r.division] = [];
    resultsByDiv[r.division].push(r);
  }

  const divisionNote = document.getElementById("divisionNote");
  if (divisionNote) divisionNote.textContent = "";

  const divisionCodes = Object.keys(resultsByDiv).sort();
  for (const division of divisionCodes) {
    const arr = resultsByDiv[division].slice();
    arr.sort((a, b) => b.projectedWins - a.projectedWins);

    let hasTie = false;
    for (let i = 1; i < arr.length; i++) {
      if (Math.abs(arr[i].projectedWins - arr[i - 1].projectedWins) < 1e-4) {
        hasTie = true;
        break;
      }
    }

    if (hasTie && divisionNote && !divisionNote.textContent) {
      divisionNote.textContent =
        "Note: One or more divisions have projected win ties; tiebreakers are not implemented, so rankings there are approximate.";
    }

    const card = document.createElement("div");
    card.className = "division-card";

    const header = document.createElement("div");
    header.className = "division-card-header";
    const title = document.createElement("strong");
    title.textContent = division;

    const subt = document.createElement("span");
    subt.textContent = hasTie
      ? "tie detected · ordering by projected wins"
      : "ordering by projected wins + opponent strength";
    header.appendChild(title);
    header.appendChild(subt);
    card.appendChild(header);

    arr.forEach((r, idx) => {
      const row = document.createElement("div");
      row.className = "division-team-row team-row-heat";

      const palette = teamPalettes[r.teamId] || {};
      row.style.setProperty("--team-color-main", palette.primary || "#4b5563");
      row.style.setProperty("--team-color-alt", palette.secondary || "#9ca3af");

      const left = document.createElement("div");
      left.innerHTML = `<span class="division-rank">${idx + 1}.</span> <span class="division-team-code">${r.teamId}</span>`;

      const right = document.createElement("div");
      right.className = "division-team-proj";

      const sosAvg = r.sosOppWinsAvg;
      let sosPart;
      if (sosAvg == null) {
        sosPart = "opp avg — wins vs others";
      } else {
        sosPart = `opp avg ${formatNumber(sosAvg, 1)} wins vs others`;
      }

      right.textContent = `${formatNumber(
        r.projectedWins,
        state.precision
      )} wins · ${sosPart}`;

      row.appendChild(left);
      row.appendChild(right);
      card.appendChild(row);
    });

    container.appendChild(card);
  }
}

// ---------------------------
// Team detail overlay + chart
// ---------------------------

// Render bar chart for a team's win distribution inside the detail modal.
function renderTeamChart(teamId, mode) {
  const barsContainer = document.getElementById("teamChartBars");
  if (!barsContainer) return;

  const result = state.results.find((r) => r.teamId === teamId);
  if (!result) return;

  const palette = teamPalettes[teamId] || {};
  const barColor = palette.primary || "#22c55e";
  const barColorAlt = palette.secondary || "#16a34a";

  const exact = result.exact;
  const cumulative = result.cumulative;

  let values;
  if (mode === "atLeast") {
    values = [0, 1, 2, 3, 4].map((k) => cumulative[k]);
  } else {
    values = exact.slice();
  }

  const maxVal = Math.max(...values, 0.0001);
  barsContainer.innerHTML = "";

  values.forEach((prob, k) => {
    const barWrapper = document.createElement("div");
    barWrapper.className = "team-detail-chart-bar";

    const valueLabel = document.createElement("div");
    valueLabel.className = "team-detail-chart-bar-value";
    valueLabel.textContent = formatPercent(prob, 1);

    const track = document.createElement("div");
    track.className = "team-detail-chart-bar-track";

    const fill = document.createElement("div");
    fill.className = "team-detail-chart-bar-fill";
    fill.style.height = `${(prob / maxVal) * 100}%`;
    fill.style.background = `linear-gradient(to top, ${barColor}, ${barColorAlt})`;

    track.appendChild(fill);

    const xLabel = document.createElement("div");
    xLabel.className = "team-detail-chart-bar-label";
    xLabel.textContent = mode === "atLeast" ? `≥${k}` : String(k);

    barWrapper.appendChild(valueLabel);
    barWrapper.appendChild(track);
    barWrapper.appendChild(xLabel);

    barsContainer.appendChild(barWrapper);
  });
}

// Narrative block inside team detail
function buildTeamNarrative(teamInfo, result) {
  const current = result.currentWins;
  const projected = result.projectedWins;

  // Most likely additional wins
  let bestK = 0;
  let bestProb = 0;
  for (let k = 0; k <= 4; k++) {
    if (result.exact[k] > bestProb) {
      bestProb = result.exact[k];
      bestK = k;
    }
  }

  const mostLikelyTotal = current + bestK;
  const p3Plus = result.cumulative[3]; // ≥3 of 4
  const p0or1 = result.exact[0] + result.exact[1];

  // Full-season schedule luck in wins
  const schedLuck = result.scheduleLuckWinsSeason ?? 0;
  const schedLuckAbs = Math.abs(schedLuck);

  // Opponents’ avg wins vs others
  const oppAvg = result.sosOppWinsAvg;
  const leagueAvg = result.sosLeagueAvgOppWins;

  let sosLine;
  if (oppAvg == null || leagueAvg == null) {
    sosLine = "Opponent-strength context isn’t fully available yet.";
  } else {
    const diff = oppAvg - leagueAvg;
    const diffAbs = Math.abs(diff);

    if (diffAbs < 0.1) {
      sosLine = `Across the full season, their opponents (excluding this team in each matchup) average about <strong>${formatNumber(
        oppAvg,
        1
      )}</strong> wins, essentially dead-on league-average.`;
    } else if (diff > 0) {
      sosLine = `Across the full season, their opponents (excluding this team in each matchup) average about <strong>${formatNumber(
        oppAvg,
        1
      )}</strong> wins, which is a <strong>tougher</strong> slate than the league-wide baseline of roughly <strong>${formatNumber(
        leagueAvg,
        1
      )}</strong> wins.`;
    } else {
      sosLine = `Across the full season, their opponents (excluding this team in each matchup) average about <strong>${formatNumber(
        oppAvg,
        1
      )}</strong> wins, which is a <strong>softer</strong> slate than the league-wide baseline of roughly <strong>${formatNumber(
        leagueAvg,
        1
      )}</strong> wins.`;
    }
  }

  let schedLuckLine;
  if (schedLuckAbs < 0.05) {
    schedLuckLine =
      "Your full-season model treats their schedule as effectively neutral — almost no net wins gained or lost purely from who they play.";
  } else if (schedLuck > 0) {
    schedLuckLine = `Relative to a league-average schedule, your full-season model credits them with about <strong>${formatNumber(
      schedLuck,
      2
    )}</strong> extra wins that can be attributed purely to an easier slate.`;
  } else {
    schedLuckLine = `Relative to a league-average schedule, your full-season model penalizes them by about <strong>${formatNumber(
      -schedLuck,
      2
    )}</strong> wins due purely to a tougher slate.`;
  }

  // Edge from remaining 4 games vs neutral
  const remEdge = result.remainingScheduleEdgeWins ?? 0;
  const remEdgeAbs = Math.abs(remEdge);
  let remScheduleLine;
  if (remEdgeAbs < 0.05) {
    remScheduleLine =
      "Over the final four games, your spreads treat their closing run as basically neutral versus a generic 50/50 schedule.";
  } else if (remEdge > 0) {
    remScheduleLine = `Over just the final four games, their remaining schedule is worth about <strong>${formatNumber(
      remEdge,
      2
    )}</strong> extra wins versus a neutral 50/50 slate based on your spreads.`;
  } else {
    remScheduleLine = `Over just the final four games, their remaining schedule is costing them about <strong>${formatNumber(
      -remEdge,
      2
    )}</strong> wins versus a neutral 50/50 slate based on your spreads.`;
  }

  let html = `<div class="team-detail-narrative"><ul>`;

  html += `<li>Most likely outcome: <strong>${bestK} additional wins</strong> (${mostLikelyTotal} total).</li>`;
  html += `<li>Chance to win <strong>3 or more</strong> of the remaining 4: <strong>${formatPercent(
    p3Plus,
    1
  )}</strong>.</li>`;
  html += `<li>They finish with <strong>0–1 more wins</strong> only <strong>${formatPercent(
    p0or1,
    1
  )}</strong> of the time.</li>`;
  html += `<li>Your model’s average full-season projection (actual so far + these four games): <strong>${formatNumber(
    projected,
    2
  )}</strong> wins.</li>`;
  html += `<li>${sosLine}</li>`;
  html += `<li>${schedLuckLine}</li>`;
  html += `<li>${remScheduleLine}</li>`;

  html += `</ul></div>`;
  return html;
}

// Open the team detail modal
function showTeamDetail(teamId) {
  const overlay = document.getElementById("teamDetailOverlay");
  const content = document.getElementById("teamDetailContent");
  const teamInfo = teams[teamId];
  const result = state.results.find((r) => r.teamId === teamId);
  if (!teamInfo || !result || !overlay || !content) return;

  // Collect this team's remaining games (Weeks 15–18)
  const teamGames = [];
  for (const game of games) {
    if (game.home === teamId || game.away === teamId) {
      const key = String(game.id);
      const spread =
        typeof state.spreads[key] === "number"
          ? state.spreads[key]
          : NEUTRAL_SPREAD;

      const homeProb = homeWinProbFromSpread(spread);
      const teamProb = game.home === teamId ? homeProb : 1 - homeProb;

      teamGames.push({
        game,
        spread,
        teamProb,
        isHome: game.home === teamId,
      });
    }
  }

  teamGames.sort((a, b) => a.game.week - b.game.week);
  const precision = state.precision;

  // Header + high-level summary
  let html = "";
  html += `<h3 id="teamDetailTitle">${teamId} · ${teamInfo.name}</h3>`;
  html += `<p id="teamDetailSummary">Current wins: <strong>${
    result.currentWins
  }</strong> · Expected additional wins (Weeks 15–18): <strong>${formatNumber(
    result.expectedAdditionalWins,
    precision
  )}</strong> · Full-season projection: <strong>${formatNumber(
    result.projectedWins,
    precision
  )}</strong></p>`;

  // Narrative
  html += buildTeamNarrative(teamInfo, result);

  // Chart + toggle
  html += `
      <h4>Win distribution (remaining 4 games)</h4>
      <div class="team-detail-chart" data-team-id="${teamId}">
        <div class="team-detail-chart-header">
          <span>Probability by wins</span>
          <div class="team-detail-chart-toggle">
            <button
              type="button"
              class="btn btn-xs chart-mode-btn active"
              data-mode="exact"
            >
              Exact
            </button>
            <button
              type="button"
              class="btn btn-xs chart-mode-btn"
              data-mode="atLeast"
            >
              At least
            </button>
          </div>
        </div>
        <div class="team-detail-chart-bars" id="teamChartBars"></div>
      </div>
    `;

  // Numeric list
  html += `<ul class="team-detail-dist">`;
  for (let k = 0; k <= 4; k++) {
    html += `<li>${k} wins: <strong>${formatPercent(
      result.exact[k],
      precision
    )}</strong> &nbsp;|&nbsp; ≥${k} wins: <strong>${formatPercent(
      result.cumulative[k],
      precision
    )}</strong></li>`;
  }
  html += `</ul>`;

  // Game editor
  html += `<h4>Edit remaining games</h4>`;
  html += `<p class="team-detail-note">Click a preset to set the spread for this game. Changes immediately update projections, schedule metrics, and the betting view.</p>`;

  html += `<table class="team-detail-games"><thead><tr>`;
  html += `<th>Week</th><th>Matchup</th><th>Side</th><th>Spread</th><th>Presets</th><th>P(win)</th>`;
  html += `</tr></thead><tbody>`;

  for (const tg of teamGames) {
    const g = tg.game;
    const opponentId = tg.isHome ? g.away : g.home;
    const sideLabel = tg.isHome ? "Home" : "Away";

    const spreadLabel =
      (tg.spread > 0 ? "+" : tg.spread < 0 ? "" : "") +
      tg.spread.toFixed(1).replace(/\.0$/, ".0");

    html += `<tr data-game-id="${g.id}">
        <td>${g.week}</td>
        <td>${opponentId} (${teams[opponentId].name})</td>
        <td>${sideLabel}</td>
        <td class="team-detail-spread">${spreadLabel}</td>
        <td class="team-detail-presets">`;

    for (const val of QUICK_SPREAD_PRESETS) {
      const label =
        (val > 0 ? "+" : "") + val.toFixed(1).replace(/\.0$/, ".0");
      html += `<button
          type="button"
          class="btn btn-xs preset-btn"
          data-game-id="${g.id}"
          data-value="${val}"
        >${label}</button>`;
    }

    html += `</td>
        <td>${formatPercent(tg.teamProb, precision)}</td>
      </tr>`;
  }

  html += `</tbody></table>`;

  content.innerHTML = html;
  overlay.classList.remove("hidden");

  // Initial chart render (exact mode)
  renderTeamChart(teamId, "exact");

  // Wire up chart mode toggle
  const toggleWrap = content.querySelector(".team-detail-chart-toggle");
  if (toggleWrap) {
    const modeButtons = toggleWrap.querySelectorAll(".chart-mode-btn");
    modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.mode === "atLeast" ? "atLeast" : "exact";
        modeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderTeamChart(teamId, mode);
      });
    });
  }

  // Wire up preset buttons
  content.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const gameId = Number(btn.dataset.gameId);
      const value = parseFloat(btn.dataset.value);
      setSpreadForGame(gameId, value);

      const row = content.querySelector(`tr[data-game-id="${gameId}"]`);
      if (!row) return;

      // Update spread cell
      const spreadCell = row.querySelector(".team-detail-spread");
      if (spreadCell) {
        const lbl =
          (value > 0 ? "+" : value < 0 ? "" : "") +
          value.toFixed(1).replace(/\.0$/, ".0");
        spreadCell.textContent = lbl;
      }

      // Recompute global results (re-runs schedule luck / SoS)
      computeAndRenderResults();

      const updatedResult = state.results.find((r) => r.teamId === teamId);
      if (!updatedResult) return;

      const precisionLocal = state.precision;

      // Update numeric distribution list
      const distLis = content.querySelectorAll(".team-detail-dist li");
      for (let k = 0; k <= 4; k++) {
        const li = distLis[k];
        if (!li) continue;
        li.innerHTML = `${k} wins: <strong>${formatPercent(
          updatedResult.exact[k],
          precisionLocal
        )}</strong> &nbsp;|&nbsp; ≥${k} wins: <strong>${formatPercent(
          updatedResult.cumulative[k],
          precisionLocal
        )}</strong>`;
      }

      // Update summary line
      const summaryP = content.querySelector("#teamDetailSummary");
      if (summaryP) {
        summaryP.innerHTML = `Current wins: <strong>${
          updatedResult.currentWins
        }</strong> · Expected additional wins (Weeks 15–18): <strong>${formatNumber(
          updatedResult.expectedAdditionalWins,
          precisionLocal
        )}</strong> · Full-season projection: <strong>${formatNumber(
          updatedResult.projectedWins,
          precisionLocal
        )}</strong>`;
      }

      // Update narrative (new SoS + schedule luck text)
      const narrativeDiv = content.querySelector(".team-detail-narrative");
      if (narrativeDiv) {
        narrativeDiv.outerHTML = buildTeamNarrative(teamInfo, updatedResult);
      }

      // Update per-row P(win)
      const g = games.find((gg) => gg.id === gameId);
      if (!g) return;
      const spread =
        typeof state.spreads[String(gameId)] === "number"
          ? state.spreads[String(gameId)]
          : NEUTRAL_SPREAD;
      const homeProb = homeWinProbFromSpread(spread);
      const teamProb = g.home === teamId ? homeProb : 1 - homeProb;
      row.lastElementChild.textContent = formatPercent(
        teamProb,
        precisionLocal
      );

      // Re-render chart in current mode
      const activeBtn = content.querySelector(".chart-mode-btn.active");
      const currentMode =
        activeBtn && activeBtn.dataset.mode === "atLeast"
          ? "atLeast"
          : "exact";
      renderTeamChart(teamId, currentMode);

      state.lastFocusedGameId = gameId;
      saveStateToStorage();
    });
  });
}

// ---------------------------
// CSV export
// ---------------------------

function exportCsv() {
  const rows = [];

  const headerRow = TABLE_HEADERS.map((h) =>
    h.label.replace(/\s+/g, "")
  );
  rows.push(headerRow);

  for (const r of state.results) {
    if (!resultHasAnyPickedGame(r)) continue;

    const line = TABLE_HEADERS.map((h) => {
      switch (h.key) {
        case "team":
          return r.teamId;
        case "division":
          return r.division;
        case "current":
          return r.currentWins;
        case "expected":
          return r.expectedAdditionalWins != null
            ? r.expectedAdditionalWins.toFixed(4)
            : "";
        case "projected":
          return r.projectedWins != null ? r.projectedWins.toFixed(4) : "";
        case "sos":
          return r.sosOppWinsAvg != null ? r.sosOppWinsAvg.toFixed(4) : "";
        case "P0":
        case "P1":
        case "P2":
        case "P3":
        case "P4": {
          if (!r.exact) return "";
          const k = Number(h.key.slice(1));
          return typeof r.exact[k] === "number"
            ? r.exact[k].toFixed(6)
            : "";
        }
        case "PA1":
        case "PA2":
        case "PA3":
        case "PA4": {
          if (!r.cumulative) return "";
          const k = Number(h.key.slice(2));
          return typeof r.cumulative[k] === "number"
            ? r.cumulative[k].toFixed(6)
            : "";
        }
        default:
          return "";
      }
    });

    rows.push(line);
  }

  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          if (typeof cell === "number") {
            return cell.toString();
          }
          const s = String(cell);
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return '"' + s.replace(/"/g, '""') + '"';
          }
          return s;
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nfl_projections.csv";
  document.body.appendChild(a);

  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
