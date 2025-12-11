// NFL Win Projection Tool
// ------------------------------------------------------------

// -----------------------
// Global display mode (Desktop / Mobile) – shared with betting page
// -----------------------

const teamIds = Object.keys(teams);

// ---------------------------
// Mode handling (Fan / Pro)
// ---------------------------
function applyMode({ resetColumns = false } = {}) {
    const body = document.body;
    const btn = document.getElementById("modeToggleBtn");
  
    body.classList.toggle("mode-fan", state.mode === "fan");
    body.classList.toggle("mode-pro", state.mode === "pro");
  
    if (btn) {
      btn.textContent =
        state.mode === "fan" ? "Switch to Pro Mode" : "Switch to Fan Mode";
    }
  
    if (resetColumns) {
      if (state.mode === "fan") {
        state.visibleColumns = {
          team: true,
          division: true,
          current: true,
          expected: true,
          projected: true,
          P0: false,
          P1: false,
          P2: false,
          P3: false,
          P4: false,
          PA1: false,
          PA2: false,
          PA3: false,
          PA4: false,
        };
      } else {
        state.visibleColumns = {
          team: true,
          division: true,
          current: true,
          expected: true,
          projected: true,
          P0: true,
          P1: true,
          P2: true,
          P3: true,
          P4: true,
          PA1: true,
          PA2: true,
          PA3: true,
          PA4: true,
        };
      }
    }
  
    saveStateToStorage();
    renderTeamTable();
    renderColumnPicker();
  }
  
  
  // ---------------------------
  // Progress indicators
  // ---------------------------
  function updateProgressUI() {
    const step1El = document.getElementById("step1ProgressText");
    const step2El = document.getElementById("step2ProgressText");
    const step3El = document.getElementById("step3ProgressText");
    const barEl = document.getElementById("globalProgressBar");
    const barLabelEl = document.getElementById("globalProgressLabel");
  
    const totalGames = games.length;
    const pickedGameIds = Object.keys(state.spreads);
  
    const pickedGamesCount = pickedGameIds.length;
  
    const touchedTeams = new Set();
    for (const idStr of pickedGameIds) {
      const g = games.find((gg) => gg.id === Number(idStr));
      if (!g) continue;
      touchedTeams.add(g.home);
      touchedTeams.add(g.away);
    }
    const teamsTouchedCount = touchedTeams.size;
  
    const pctGames = totalGames
      ? Math.round((pickedGamesCount / totalGames) * 100)
      : 0;
    const pctTeams = teamIds.length
      ? Math.round((teamsTouchedCount / teamIds.length) * 100)
      : 0;
  
    const hasProjections = state.results.length > 0;
    const pctBettingReady = hasProjections ? 100 : 0;
  
    const overall = Math.round((pctGames + pctTeams + pctBettingReady) / 3);
  
    if (step1El) {
      step1El.textContent = `Games with your line: ${pickedGamesCount}/${totalGames} (${pctGames}%)`;
    }
    if (step2El) {
      step2El.textContent = `Teams touched: ${teamsTouchedCount}/${teamIds.length} (${pctTeams}%)`;
    }
    if (step3El) {
      step3El.textContent = hasProjections
        ? "Betting edges ready"
        : "Set some spreads to unlock betting edges";
    }
    if (barEl) {
      barEl.style.width = overall + "%";
    }
    if (barLabelEl) {
      barLabelEl.textContent = `${overall}% complete`;
    }
  }

// Spread band values: from -20.5 to +20.5 in 1-point increments
const spreadBandValues = (() => {
  const arr = [];
  for (let s = -20.5; s <= 20.5; s += 1) {
    arr.push(Number(s.toFixed(1)));
  }
  return arr;
})();

// App state
const state = {
    theme: "dark",
    precision: 2,
    spreads: {},           // gameId -> spread number
    results: [],           // computed per-team
    currentSort: { key: "projected", direction: "desc" },
    view: "schedule",      // "schedule" or "projections"
    showImpliedOdds: false,
    visibleColumns: {
      team: true,
      division: true,
      current: true,
      expected: true,
      projected: true,
      P0: true,
      P1: true,
      P2: true,
      P3: true,
      P4: true,
      PA1: true,
      PA2: true,
      PA3: true,
      PA4: true
    },
  
    // Schedule filters + scroll memory
    filterWeek: "ALL",
    filterTeam: "ALL",
    filterDivision: "ALL",
    filterPickStatus: "ALL",
    lastFocusedGameId: null,
  
    // NEW: fan vs pro mode
    mode: "fan",          // "fan" or "pro"
  
    // NEW: scenarios – name -> snapshot
    scenarios: {},        // { [name]: { spreads, precision, showImpliedOdds } }
    activeScenario: null
  };
  
// Render bar chart for a team's win distribution inside the detail modal.
// mode: "exact" (P(exactly k wins)) or "atLeast" (P(≥k wins)).
function renderTeamChart(teamId, mode) {
    const barsContainer = document.getElementById("teamChartBars");
    if (!barsContainer) return;
  
    const result = state.results.find((r) => r.teamId === teamId);
    if (!result) return;
  
    const palette = teamPalettes[teamId] || {};
    const barColor = palette.primary || "#22c55e";
    const barColorAlt = palette.secondary || "#16a34a";
  
    const exact = result.exact;           // [P(0), P(1), P(2), P(3), P(4)]
    const cumulative = result.cumulative; // [P(≥0), P(≥1), P(≥2), P(≥3), P(≥4)]
  
    let values;
    if (mode === "atLeast") {
      // Show P(≥k wins) for k = 0..4
      values = [0, 1, 2, 3, 4].map((k) => cumulative[k]);
    } else {
      // Default "exact" mode
      values = exact.slice();
    }
  
    const maxVal = Math.max(...values, 0.0001); // avoid divide-by-zero
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
  
  
  
  

// Utility: load/save state to localStorage
function loadStateFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
  
      if (parsed.theme === "light" || parsed.theme === "dark") {
        state.theme = parsed.theme;
      }
      if (typeof parsed.precision === "number") {
        state.precision = parsed.precision;
      }
  
      // spreads – normalize and coerce to numbers
      if (parsed.spreads && typeof parsed.spreads === "object") {
        state.spreads = {};
        for (const [key, val] of Object.entries(parsed.spreads)) {
          let n = typeof val === "number" ? val : parseFloat(val);
          if (Number.isFinite(n)) {
            state.spreads[String(key)] = n;
          }
        }
      }
  
      if (parsed.view === "schedule" || parsed.view === "projections") {
        state.view = parsed.view;
      }
      if (typeof parsed.showImpliedOdds === "boolean") {
        state.showImpliedOdds = parsed.showImpliedOdds;
      }
      if (Array.isArray(parsed.results)) {
        state.results = parsed.results;
      }
  
      // filters + last focused game
      if (parsed.filterWeek !== undefined) {
        state.filterWeek = parsed.filterWeek;
      }
      if (parsed.filterTeam !== undefined) {
        state.filterTeam = parsed.filterTeam;
      }
      if (parsed.filterDivision !== undefined) {
        state.filterDivision = parsed.filterDivision;
      }
      if (parsed.filterPickStatus &&
          (parsed.filterPickStatus === "ALL" ||
           parsed.filterPickStatus === "PICKED" ||
           parsed.filterPickStatus === "UNPICKED")) {
        state.filterPickStatus = parsed.filterPickStatus;
      }
    
      if (parsed.lastFocusedGameId !== undefined) {
        state.lastFocusedGameId = parsed.lastFocusedGameId;
      }

      // mode + scenarios
      if (parsed.mode === "fan" || parsed.mode === "pro") {
        state.mode = parsed.mode;
        }

        if (parsed.scenarios && typeof parsed.scenarios === "object") {
        state.scenarios = parsed.scenarios;
        }

        if (typeof parsed.activeScenario === "string") {
        state.activeScenario = parsed.activeScenario;
        }

    } catch (err) {
      console.warn("Failed to load state:", err);
    }
  }
  
  
  function saveStateToStorage() {
    const toSave = {
      theme: state.theme,
      precision: state.precision,
      spreads: state.spreads,
      view: state.view,
      showImpliedOdds: state.showImpliedOdds,
      results: state.results,
  
      // filters + scroll memory
      filterWeek: state.filterWeek,
      filterTeam: state.filterTeam,
      filterDivision: state.filterDivision,
      filterPickStatus: state.filterPickStatus,
      lastFocusedGameId: state.lastFocusedGameId,
  
      // meta
      mode: state.mode,
      scenarios: state.scenarios,
      activeScenario: state.activeScenario
    };
  
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (err) {
      console.warn("Failed to save state:", err);
    }
  }
  

  

// Theme handling
function applyTheme() {
  const body = document.body;
  const btn = document.getElementById("themeToggle");
  if (state.theme === "dark") {
    body.classList.add("theme-dark");
    body.classList.remove("theme-light");
    if (btn) btn.textContent = "Switch to Light Theme";
  } else {
    body.classList.add("theme-light");
    body.classList.remove("theme-dark");
    if (btn) btn.textContent = "Switch to Dark Theme";
  }
}

// Show/hide schedule vs projections
function applyViewMode() {
    const scheduleSection = document.getElementById("scheduleSection");
    const resultsSection = document.getElementById("resultsSection");
    const viewToggleBtn = document.getElementById("viewToggleBtn");
  
    if (!scheduleSection || !resultsSection || !viewToggleBtn) return;
  
    if (state.view === "schedule") {
      scheduleSection.classList.remove("hidden");
      resultsSection.classList.add("hidden");
      viewToggleBtn.textContent = "Show Team Projections";
    } else {
      scheduleSection.classList.add("hidden");
      resultsSection.classList.remove("hidden");
      viewToggleBtn.textContent = "Show Schedule & Spreads";
    }
  }
  
  
  function setActiveTab(tab) {
    const scheduleSection   = document.getElementById("scheduleSection");
    const resultsSection    = document.getElementById("resultsSection");
    const bettingSection    = document.getElementById("bettingSection");
    const rawMarketsSection = document.getElementById("rawMarketsSection");
  
    // Highlight correct bottom-nav button
    document
      .querySelectorAll(".bottom-nav-item")
      .forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.tab === tab);
      });
  
    // Hide everything by default; we'll re-show what we want
    if (scheduleSection)   scheduleSection.classList.add("hidden");
    if (resultsSection)    resultsSection.classList.add("hidden");
    if (bettingSection)    bettingSection.classList.add("hidden");
    if (rawMarketsSection) rawMarketsSection.classList.add("hidden");
  
    if (tab === "games") {
      // Games = schedule view
      state.view = "schedule";
      saveStateToStorage();
      applyViewMode(); // shows scheduleSection
  
    } else if (tab === "teams") {
      // Teams = projections view
      state.view = "projections";
      saveStateToStorage();
      applyViewMode(); // shows resultsSection
  
    } else if (tab === "betting") {
      // Betting tab: show both betting sections
      if (bettingSection)    bettingSection.classList.remove("hidden");
      if (rawMarketsSection) rawMarketsSection.classList.remove("hidden");
      // betting.js will have already drawn the tables on DOMContentLoaded
    } else if (tab === "more") {
      // For now, "More" can just leave things as-is or later show a dedicated section.
      // Easiest behaviour: default back to schedule if nothing else.
      if (scheduleSection) scheduleSection.classList.remove("hidden");
      state.view = "schedule";
      saveStateToStorage();
    }
  }
  
  
  
  

// Spread → home win probability
function favoriteProbFromAbsSpread(absSpreadRaw) {
  const absSpread = Math.max(0.5, Math.abs(absSpreadRaw));
  const rounded = Number(absSpread.toFixed(1));

  if (spreadProbTable[rounded]) {
    return spreadProbTable[rounded];
  }

  if (rounded > 14.5) {
    const base = spreadProbTable[14.5];
    const stepsBeyond = Math.round((rounded - 14.5) / 1); // 1-point steps
    let prob = base + stepsBeyond * 0.009;
    if (prob > 0.9999) prob = 0.9999;
    return prob;
  }

  // For any weird value below 0.5, fall back to 0.5 mapping
  return spreadProbTable[0.5];
}

function homeWinProbFromSpread(spread) {
  if (spread === 0) {
    return favoriteProbFromAbsSpread(0.5);
  }
  if (spread < 0) {
    // home favorite
    return favoriteProbFromAbsSpread(Math.abs(spread));
  }
  if (spread > 0) {
    // home underdog
    const favProb = favoriteProbFromAbsSpread(Math.abs(spread));
    return 1 - favProb;
  }
  return 0.5;
}


function gameMatchesFilters(game) {
    const {
      filterWeek,
      filterTeam,
      filterDivision,
      filterPickStatus
    } = state;
  
    // Week filter
    if (filterWeek !== "ALL" && game.week !== filterWeek) return false;
  
    // Team filter (either side)
    if (
      filterTeam !== "ALL" &&
      game.home !== filterTeam &&
      game.away !== filterTeam
    ) {
      return false;
    }
  
    // Division filter (either side belongs to that division)
    if (filterDivision !== "ALL") {
      const homeDiv = teams[game.home].division;
      const awayDiv = teams[game.away].division;
      if (homeDiv !== filterDivision && awayDiv !== filterDivision) {
        return false;
      }
    }
  
    // NEW: pick-status filter
    const hasSpread = typeof state.spreads[String(game.id)] === "number";
  
    if (filterPickStatus === "PICKED" && !hasSpread) return false;
    if (filterPickStatus === "UNPICKED" && hasSpread) return false;
  
    return true;
  }
  
  
  // Populate the three selects and wire them to state
  function initScheduleFilters() {
    const weekSelect = document.getElementById("filterWeek");
    const teamSelect = document.getElementById("filterTeam");
    const divisionSelect = document.getElementById("filterDivision");
    const pickSelect = document.getElementById("filterPickStatus");
    if (!weekSelect || !teamSelect || !divisionSelect || !pickSelect) return;
  
    // Weeks
    const weeks = [...new Set(games.map(g => g.week))].sort((a, b) => a - b);
    weekSelect.innerHTML = "";
    let opt = document.createElement("option");
    opt.value = "ALL";
    opt.textContent = "All weeks";
    weekSelect.appendChild(opt);
    weeks.forEach(w => {
      const o = document.createElement("option");
      o.value = String(w);
      o.textContent = `Week ${w}`;
      weekSelect.appendChild(o);
    });
    weekSelect.value =
      state.filterWeek === "ALL" ? "ALL" : String(state.filterWeek);
  
    // Teams
    teamSelect.innerHTML = "";
    opt = document.createElement("option");
    opt.value = "ALL";
    opt.textContent = "All teams";
    teamSelect.appendChild(opt);
    teamIds.forEach(id => {
      const t = teams[id];
      const o = document.createElement("option");
      o.value = id;
      o.textContent = `${id} – ${t.name}`;
      teamSelect.appendChild(o);
    });
    teamSelect.value = state.filterTeam || "ALL";
  
    // Divisions
    divisionSelect.innerHTML = "";
    opt = document.createElement("option");
    opt.value = "ALL";
    opt.textContent = "All divisions";
    divisionSelect.appendChild(opt);
    const divisions = [...new Set(Object.values(teams).map(t => t.division))].sort();
    divisions.forEach(d => {
      const o = document.createElement("option");
      o.value = d;
      o.textContent = d;
      divisionSelect.appendChild(o);
    });
    divisionSelect.value = state.filterDivision || "ALL";

    // Pick status
    pickSelect.innerHTML = "";
    [
        { value: "ALL",      label: "All games" },
        { value: "UNPICKED", label: "Only unpicked" },
        { value: "PICKED",   label: "Only picked" }
    ].forEach((optDef) => {
        const o = document.createElement("option");
        o.value = optDef.value;
        o.textContent = optDef.label;
        pickSelect.appendChild(o);
    });

    pickSelect.value = state.filterPickStatus || "ALL";

  
    // Change handlers
    weekSelect.addEventListener("change", (e) => {
      const v = e.target.value;
      state.filterWeek = v === "ALL" ? "ALL" : Number(v);
      saveStateToStorage();
      renderSchedule();
    });
  
    teamSelect.addEventListener("change", (e) => {
      const v = e.target.value;
      state.filterTeam = v;
      saveStateToStorage();
      renderSchedule();
    });
  
    divisionSelect.addEventListener("change", (e) => {
      const v = e.target.value;
      state.filterDivision = v;
      saveStateToStorage();
      renderSchedule();
    });

    pickSelect.addEventListener("change", (e) => {
        const v = e.target.value;
        state.filterPickStatus = v;
        saveStateToStorage();
        renderSchedule();
      });
    
  }
  
  // After rendering, jump back to last interacted game (or first with a spread)
  function scrollToLastFocusedGame() {
    let targetId = state.lastFocusedGameId;
  
    if (targetId == null) {
      // fallback: first game with a custom spread
      const spreadKeys = Object.keys(state.spreads);
      if (spreadKeys.length) {
        targetId = spreadKeys[0];
      }
    }
  
    if (!targetId) return;
  
    const card = document.querySelector(
      `.game-card[data-game-id="${targetId}"]`
    );
    if (!card) return;
  
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }

// After the schedule is (re)rendered, re-apply all saved lines
function rehydratePickedLinesIntoCards() {
    if (!state.spreads) return;
  
    for (const [gameId, spread] of Object.entries(state.spreads)) {
      if (typeof spread === "number" && Number.isFinite(spread)) {
        // This no-ops if the card for that game isn't currently in the DOM
        updateGameCardDisplay(gameId);
      }
    }
  }
  


// Build schedule UI
function renderSchedule() {
    const container = document.getElementById("scheduleContainer");
    container.innerHTML = "";
  
    let filteredGames = games.filter(gameMatchesFilters);

    if (!filteredGames.length) {
      const noCustomFilters =
        state.filterWeek === "ALL" &&
        state.filterTeam === "ALL" &&
        state.filterDivision === "ALL" &&
        state.filterPickStatus === "ALL";
    
      // Only fall back when literally everything is at default
      if (noCustomFilters) {
        filteredGames = games;
      } else {
        // otherwise it's fine to show an empty list
      }
    }    
  
    // Group by week
    const byWeek = new Map();
    for (const game of filteredGames) {
      if (!byWeek.has(game.week)) byWeek.set(game.week, []);
      byWeek.get(game.week).push(game);
    }
  
    const sortedWeeks = Array.from(byWeek.keys()).sort((a, b) => a - b);
  
    for (const week of sortedWeeks) {
      const weekGames = byWeek.get(week);
      const weekBlock = document.createElement("div");
      weekBlock.className = "week-block";
  
      // Week header
      const header = document.createElement("div");
      header.className = "week-header";
      const h3 = document.createElement("h3");
      h3.textContent = `Week ${week}`;
      const span = document.createElement("span");
      span.textContent = `${weekGames.length} games`;
      header.appendChild(h3);
      header.appendChild(span);
      weekBlock.appendChild(header);
  
      // Games list
      const list = document.createElement("div");
      list.className = "games-list";
  
      for (const game of weekGames) {
        const card = document.createElement("div");
        card.className = "game-card game-card-compact";
        card.dataset.gameId = String(game.id);
  
        // Attach team colors as CSS custom properties for this card
        const homePalette = teamPalettes[game.home] || {};
        const awayPalette = teamPalettes[game.away] || {};
  
        card.style.setProperty(
          "--home-color-main",
          homePalette.primary || "#22c55e"
        );
        card.style.setProperty(
          "--home-color-alt",
          homePalette.secondary || "#16a34a"
        );
        card.style.setProperty(
          "--away-color-main",
          awayPalette.primary || "#f97316"
        );
        card.style.setProperty(
          "--away-color-alt",
          awayPalette.secondary || "#ea580c"
        );
  
        // Optional: hover-expanded class for your CSS to use
        card.addEventListener("mouseenter", () => {
          card.classList.add("hover-expanded");
        });
        card.addEventListener("mouseleave", () => {
          card.classList.remove("hover-expanded");
        });
  
        const info = document.createElement("div");
        info.className = "game-info";
  
        // Top row: week / day
        const infoTop = document.createElement("div");
        infoTop.className = "game-info-top";
        infoTop.textContent = `Week ${game.week} · ${game.day}`;
  
        // Matchup row – away left, home right
        const infoMain = document.createElement("div");
        infoMain.className = "game-info-main";
        const awayTeam = teams[game.away];
        const homeTeam = teams[game.home];
  
        infoMain.innerHTML = `
          <div class="team-slot team-away">
            <span class="team-code">${game.away}</span>
            <span class="team-name">${awayTeam.name}</span>
          </div>
          <div class="game-center">
            <span class="game-center-label">AT</span>
            <span class="game-center-spread" data-game-id="${game.id}">—</span>
          </div>
          <div class="team-slot team-home">
            <span class="team-code">${game.home}</span>
            <span class="team-name">${homeTeam.name}</span>
          </div>
        `;
  
        // Meta row: spread band + probabilities + expand button
        const infoMeta = document.createElement("div");
        infoMeta.className = "game-info-meta";
  
        const lineRow = document.createElement("div");
        lineRow.className = "line-row";
  
        const bandWrapper = document.createElement("div");
        bandWrapper.className = "spread-band-wrapper";
  
        const band = document.createElement("div");
        band.className = "spread-band";
  
        // Build spread buttons (reversed so big negatives are near the home side)
        for (const value of [...spreadBandValues].reverse()) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "spread-option";
          btn.dataset.value = String(value);
  
          const label =
            (value > 0 ? "+" : "") + value.toFixed(1).replace(/\.0$/, ".0");
          btn.textContent = label;
  
          if (Math.abs(value - NEUTRAL_SPREAD) < 1e-6) {
            btn.classList.add("neutral");
          } else if (value < 0) {
            btn.classList.add("favorite");
          } else {
            btn.classList.add("underdog");
          }
  
          if (Math.abs(value) > 10.5) {
            btn.classList.add("extra");
          }
  
          btn.addEventListener("click", () => {
            setSpreadForGame(game.id, value);
          });
  
          band.appendChild(btn);
        }
  
        bandWrapper.appendChild(band);
        lineRow.appendChild(bandWrapper);
  
        // Probabilities box (filled in by updateGameCardDisplay)
        const selectedProbSpan = document.createElement("div");
        selectedProbSpan.className = "selected-prob";
  
        infoMeta.appendChild(lineRow);
        infoMeta.appendChild(selectedProbSpan);
  
        // Expand/collapse for extra spreads
        const expandBtn = document.createElement("button");
        expandBtn.type = "button";
        expandBtn.className = "btn spread-expand-btn";
        expandBtn.textContent = "Expand spreads";
  
        expandBtn.addEventListener("click", () => {
          card.classList.toggle("expanded");
          expandBtn.textContent = card.classList.contains("expanded")
            ? "Collapse spreads"
            : "Expand spreads";
        });
  
        infoMeta.appendChild(expandBtn);
  
        // Assemble card
        info.appendChild(infoTop);
        info.appendChild(infoMain);
        info.appendChild(infoMeta);
  
        card.appendChild(info);
        list.appendChild(card);
  
        // This keeps a brand-new schedule consistent if state.spreads was empty
        updateGameCardDisplay(game.id);
      }
  
      weekBlock.appendChild(list);
      container.appendChild(weekBlock);
    }
  
    // >>> NEW: rehydrate any previously picked lines into the freshly rendered cards
    rehydratePickedLinesIntoCards();
  
    // After all weeks are rendered, jump back to the last game you touched
    scrollToLastFocusedGame();
  }
  
  
  
  

// Set spread for a game and recompute
function setSpreadForGame(gameId, spreadValue) {
    state.spreads[String(gameId)] = spreadValue;
    state.lastFocusedGameId = gameId;
  
    updateGameCardDisplay(gameId);
    saveStateToStorage();
    computeAndRenderResults();
    updateProgressUI();
  }
  

function updateOddsToggleButton() {
    const oddsBtn = document.getElementById("toggleOddsBtn");
    if (!oddsBtn) return;
    oddsBtn.textContent = state.showImpliedOdds
      ? "Hide Implied Odds"
      : "Show Implied Odds";
  }

  function resetAllState() {
    const confirmed = window.confirm(
      "Are you sure you want to reset all spreads and projections?\n\nThis will clear all custom spreads, filters, and scenarios."
    );
    if (!confirmed) return;
  
    state.spreads = {};
    state.precision = 2;
    state.showImpliedOdds = false;
    state.filterWeek = "ALL";
    state.filterTeam = "ALL";
    state.filterDivision = "ALL";
    state.filterPickStatus = "ALL";
    state.lastFocusedGameId = null;
    state.results = [];
  
    // keep mode + scenarios – those are "meta"
    saveStateToStorage();
    updateControlsFromState();
  
    renderSchedule();
    renderTeamTable();
    renderDivisionSummary();
    updateProgressUI();
  }
  

  

// Update one game card (selected spread, prob)
function updateGameCardDisplay(gameId) {
    const card = document.querySelector(`.game-card[data-game-id="${gameId}"]`);
    if (!card) return;
  
    const key = String(gameId);
    const rawSpread = state.spreads[key];
  
    let spread = null;
    if (typeof rawSpread === "number") {
      spread = rawSpread;
    } else if (typeof rawSpread === "string") {
      const parsed = parseFloat(rawSpread);
      if (Number.isFinite(parsed)) spread = parsed;
    }
  
    const game = games.find((g) => g.id === Number(gameId));
  
    let homeProb = 0.5;
    if (spread !== null && game) {
      homeProb = homeWinProbFromSpread(spread);
    }
    const awayProb = 1 - homeProb;
  
    const centerSpreadEl = card.querySelector(".game-center-spread");
    const selectedProbSpan = card.querySelector(".selected-prob");
  
    // 1) Center line text
    if (centerSpreadEl) {
      if (spread === null) {
        centerSpreadEl.textContent = "—";
        centerSpreadEl.classList.add("is-empty");
      } else {
        const label =
          (spread > 0 ? "+" : spread < 0 ? "" : "") +
          spread.toFixed(1).replace(/\.0$/, ".0");
        centerSpreadEl.textContent = label;
        centerSpreadEl.classList.remove("is-empty");
      }
    }
  
    // 2) Highlight band button that matches the saved spread
    const buttons = card.querySelectorAll(".spread-option");
    buttons.forEach((btn) => {
      const val = parseFloat(btn.dataset.value);
      const isSelected =
        spread !== null && Number.isFinite(val) && Math.abs(val - spread) < 1e-6;
  
      if (isSelected) {
        btn.classList.add("selected");
        btn.setAttribute("aria-pressed", "true");
      } else {
        btn.classList.remove("selected");
        btn.setAttribute("aria-pressed", "false");
      }
    });
  
    // 3) Probability + optional implied odds display
    if (!selectedProbSpan) return;

    // If we somehow have no game, bail out
    if (!game) {
    selectedProbSpan.textContent = "—";
    return;
    }

    // Compute probabilities using either the picked spread or neutral
    const precision = state.precision;
    const effectiveSpread =
    spread === null ? NEUTRAL_SPREAD : spread; // neutral if none picked

    const effectiveHomeProb = homeWinProbFromSpread(effectiveSpread);
    const effectiveAwayProb = 1 - effectiveHomeProb;

    const homeLabel = `${game.home} ${formatPercent(effectiveHomeProb, precision)}`;
    const awayLabel = `${game.away} ${formatPercent(effectiveAwayProb, precision)}`;

    let text = `${homeLabel} · ${awayLabel}`;

    // Optional implied odds
    if (state.showImpliedOdds) {
    const homeOdds = formatAmerican(probToAmerican(effectiveHomeProb));
    const awayOdds = formatAmerican(probToAmerican(effectiveAwayProb));
    text += `  |  ${homeOdds} / ${awayOdds}`;
    }

    selectedProbSpan.textContent = text;

  }
  
  
  
  
  
  

// Fill neutral for all games without spread
function fillNeutralSpreads() {
  for (const game of games) {
    const key = String(game.id);
    if (typeof state.spreads[key] !== "number") {
      state.spreads[key] = NEUTRAL_SPREAD;
      updateGameCardDisplay(game.id);
    }
  }
  saveStateToStorage();
  computeAndRenderResults();
}

// Compute per-team probabilities and projections
function computeAndRenderResults() {
    const precision = state.precision;
  
    const teamGameProbs = {};
    for (const teamId of teamIds) {
      teamGameProbs[teamId] = [];
    }
  
    const touchedTeams = new Set();
  
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
      teamGameProbs[game.home].push(homeProb);
      teamGameProbs[game.away].push(awayProb);
    }
  
    // pad to 4 games (safety)
    for (const teamId of teamIds) {
      const arr = teamGameProbs[teamId];
      while (arr.length < 4) {
        arr.push(0.5);
      }
    }
  
    const results = [];
  
    for (const teamId of teamIds) {
      if (!touchedTeams.has(teamId)) {
        // user has not picked any games for this team yet
        continue;
      }
  
      const info = teams[teamId];
      const probs = teamGameProbs[teamId];
  
      const expectedAdditionalWins = probs.reduce((sum, p) => sum + p, 0);
      const projectedWins = info.currentWins + expectedAdditionalWins;
  
      const exact = computeExactDistribution(probs);   // length 5: P(0..4)
      const cumulative = computeCumulative(exact);     // length 5: P(≥0..≥4)
  
      results.push({
        teamId,
        division: info.division,
        currentWins: info.currentWins,
        expectedAdditionalWins,
        projectedWins,
        exact,
        cumulative,
        probs
      });
    }
  
    state.results = results;
    renderTeamTable();
    renderDivisionSummary();
    saveStateToStorage();
    updateProgressUI();
    if (window.refreshBettingFromStorage) {
        window.refreshBettingFromStorage();
    }
  }
  
  

// Compute distribution P(exactly k wins), k=0..4, via 2^4 combinations
function computeExactDistribution(probs) {
  const result = [0, 0, 0, 0, 0]; // k=0..4
  const n = 4;

  for (let mask = 0; mask < 1 << n; mask++) {
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

function computeCumulative(exact) {
  // exact[0..4]
  const cumulative = [1, 0, 0, 0, 0]; // atLeast0,1,2,3,4
  cumulative[4] = exact[4];
  cumulative[3] = exact[3] + cumulative[4];
  cumulative[2] = exact[2] + cumulative[3];
  cumulative[1] = exact[1] + cumulative[2];
  return cumulative;
}


// Render main team projections table
function renderTeamTable() {
    const container = document.getElementById("teamTableContainer");
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
  
      if (["team", "division", "projected", "current"].includes(h.key)) {
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

      if (!resultHasAnyPickedGame(r)) {
          continue;
        }
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
            break;
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
  
  
  function renderColumnPicker() {
    const picker = document.getElementById("columnPicker");
    if (!picker) return;
  
    picker.innerHTML = "";
  
    const grid = document.createElement("div");
    grid.className = "column-picker-grid";
  
    TABLE_HEADERS.forEach((h) => {
      // If you want 'team' & 'division' always on, skip them here:
      // if (h.key === "team" || h.key === "division") return;
  
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
  



// Division summaries + tie note
function renderDivisionSummary() {
    const container = document.getElementById("divisionSummaryContainer");
    container.innerHTML = "";
  
    const resultsByDiv = {};
    for (const r of state.results) {
      if (!resultHasAnyPickedGame(r)) continue;
    
      if (!resultsByDiv[r.division]) resultsByDiv[r.division] = [];
      resultsByDiv[r.division].push(r);
    }
    
  
    const divisionNote = document.getElementById("divisionNote");
    divisionNote.textContent = "";
  
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
  
      if (hasTie) {
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
      subt.textContent = hasTie ? "tie detected" : "ordering by projected wins";
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
        right.textContent = formatNumber(r.projectedWins, state.precision);
        row.appendChild(left);
        row.appendChild(right);
        card.appendChild(row);
      });
  
      container.appendChild(card);
    }
  }
  
// Team detail overlay
function showTeamDetail(teamId) {
    const overlay = document.getElementById("teamDetailOverlay");
    const content = document.getElementById("teamDetailContent");
    const teamInfo = teams[teamId];
    const result = state.results.find((r) => r.teamId === teamId);
    if (!teamInfo || !result || !overlay || !content) return;
  
    // Collect this team's games
    const teamGames = [];
    for (const game of games) {
      if (game.home === teamId || game.away === teamId) {
        const key = String(game.id);
        const spread =
          typeof state.spreads[key] === "number"
            ? state.spreads[key]
            : NEUTRAL_SPREAD; // default if not set
  
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
    html += `<p>Current wins: <strong>${teamInfo.currentWins}</strong> · Expected additional wins: <strong>${formatNumber(
      result.expectedAdditionalWins,
      precision
    )}</strong> · Projected wins: <strong>${formatNumber(
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
    html += `<p class="team-detail-note">Click a preset to set the spread for this game. Changes immediately update projections and the betting view.</p>`;
  
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
  
        const spreadCell = row.querySelector(".team-detail-spread");
        if (spreadCell) {
          const lbl =
            (value > 0 ? "+" : value < 0 ? "" : "") +
            value.toFixed(1).replace(/\.0$/, ".0");
          spreadCell.textContent = lbl;
        }
  
        const updatedResult = state.results.find((r) => r.teamId === teamId);
        if (!updatedResult) return;
  
        // Update numeric distribution list
        const distLis = content.querySelectorAll(".team-detail-dist li");
        for (let k = 0; k <= 4; k++) {
          const li = distLis[k];
          if (!li) continue;
          li.innerHTML = `${k} wins: <strong>${formatPercent(
            updatedResult.exact[k],
            precision
          )}</strong> &nbsp;|&nbsp; ≥${k} wins: <strong>${formatPercent(
            updatedResult.cumulative[k],
            precision
          )}</strong>`;
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
        row.lastElementChild.textContent = formatPercent(teamProb, precision);
  
        // Re-render chart in whatever mode is currently active
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
  
  
  
  function buildTeamNarrative(teamInfo, result) {
    const current = teamInfo.currentWins;
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
    html += `<li>Your model’s average projection: <strong>${formatNumber(
      projected,
      2
    )}</strong> total wins.</li>`;
  
    html += `</ul></div>`;
    return html;
  }
  

// Export CSV
function exportCsv() {
  const rows = [];
  const headerRow = TABLE_HEADERS.map(h => {
    return h.label.replace(/\s+/g, "");
  });
  rows.push(headerRow);

  for (const r of state.results) {
    if (!resultHasAnyPickedGame(r)) continue;
  
    rows.push([
      r.teamId,
      r.division,
      r.currentWins,
      r.expectedAdditionalWins,
      r.projectedWins,
      r.exact[0],
      r.exact[1],
      r.exact[2],
      r.exact[3],
      r.exact[4],
      r.cumulative[1],
      r.cumulative[2],
      r.cumulative[3],
      r.cumulative[4],
    ]);
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

// ---------------------------
// UI Wiring & Initialization
// ---------------------------

function updateControlsFromState() {
    const precisionSelect = document.getElementById("precisionSelect");
    if (precisionSelect) {
      precisionSelect.value = String(state.precision);
    }
  
    updateOddsToggleButton();
    applyMode({ resetColumns: false });
    updateProgressUI();
  }
  
  
  

function handlePrecisionChange(value) {
  const parsed = parseInt(value, 10);
  if (![2, 3, 4].includes(parsed)) return;
  state.precision = parsed;
  saveStateToStorage();

  // Re-render schedule text (probabilities) and results with new formatting
  for (const game of games) {
    updateGameCardDisplay(game.id);
  }
  computeAndRenderResults();
}

function attachEventListeners() {
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        state.theme = state.theme === "dark" ? "light" : "dark";
        saveStateToStorage();
        applyTheme();
      });
    }
  
    const viewToggleBtn = document.getElementById("viewToggleBtn");
    if (viewToggleBtn) {
      viewToggleBtn.addEventListener("click", () => {
        // Flip between Games (schedule) and Teams (projections) via tabs
        const nextTab = state.view === "schedule" ? "teams" : "games";
        setActiveTab(nextTab);
      });
    }
  
    const colBtn = document.getElementById("toggleColumnPicker");
    if (colBtn) {
      colBtn.addEventListener("click", () => {
        const picker = document.getElementById("columnPicker");
        if (!picker) return;
        picker.classList.toggle("hidden");
      });
    }
  
    const oddsBtn = document.getElementById("toggleOddsBtn");
    if (oddsBtn) {
      oddsBtn.addEventListener("click", () => {
        state.showImpliedOdds = !state.showImpliedOdds;
        saveStateToStorage();
        updateOddsToggleButton();
        for (const game of games) {
          updateGameCardDisplay(game.id);
        }
      });
    }
  
    // HEADER "Betting Table" → go to Betting tab (no navigation)
    const bettingBtn = document.getElementById("bettingTableBtn");
    if (bettingBtn) {
      bettingBtn.addEventListener("click", () => {
        setActiveTab("betting");
      });
    }
  
    const precisionSelect = document.getElementById("precisionSelect");
    if (precisionSelect) {
      precisionSelect.addEventListener("change", (e) => {
        handlePrecisionChange(e.target.value);
      });
    }
  
    const fillEvenBtn = document.getElementById("fillEvenBtn");
    if (fillEvenBtn) {
      fillEvenBtn.addEventListener("click", () => {
        fillNeutralSpreads();
      });
    }
  
    const resetBtn = document.getElementById("resetStateBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        resetAllState();
      });
    }
  
    const exportBtn = document.getElementById("exportCSV");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        exportCsv();
      });
    }
  
    const overlay = document.getElementById("teamDetailOverlay");
    const closeBtn = document.getElementById("teamDetailClose");
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          overlay.classList.add("hidden");
        }
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        if (overlay) overlay.classList.add("hidden");
      });
    }
  
    const modeToggle = document.getElementById("modeToggleBtn");
    if (modeToggle) {
      modeToggle.addEventListener("click", () => {
        state.mode = state.mode === "fan" ? "pro" : "fan";
        saveStateToStorage();
        applyMode({ resetColumns: true });
      });
    }
  
    const headerToggle = document.getElementById("headerControlsToggle");
    const headerControls = document.querySelector(".header-controls");
    if (headerToggle && headerControls) {
      headerToggle.addEventListener("click", () => {
        const nowOpen = headerControls.classList.toggle("is-open");
        headerToggle.textContent = nowOpen
          ? "Hide Header Controls"
          : "Show Header Controls";
        headerToggle.setAttribute("aria-expanded", nowOpen ? "true" : "false");
      });
    }
  
    const displayModeBtn = document.getElementById("mainDisplayModeToggle");
    if (displayModeBtn) {
      displayModeBtn.addEventListener("click", () => {
        displayMode = displayMode === "mobile" ? "desktop" : "mobile";
        saveDisplayMode();
        applyDisplayMode();
      });
    }
  
    // Bottom tab bar wiring (Games / Teams / Betting / More)
    const bottomNav = document.querySelector(".bottom-nav");
    if (bottomNav) {
      bottomNav.querySelectorAll(".bottom-nav-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          const tab = btn.dataset.tab;
          if (!tab) return;
          setActiveTab(tab);
        });
      });
    }
  
    // Scenario controls (unchanged)
    initScenarioControls();
  }
  
  
  
  function initScenarioControls() {
    const select = document.getElementById("scenarioSelect");
    const nameInput = document.getElementById("scenarioNameInput");
    const saveBtn = document.getElementById("scenarioSaveBtn");
    const deleteBtn = document.getElementById("scenarioDeleteBtn");
  
    if (!select || !nameInput || !saveBtn || !deleteBtn) return;
  
    function refreshScenarioSelect() {
      select.innerHTML = "";
      const optNone = document.createElement("option");
      optNone.value = "";
      optNone.textContent = "No scenario";
      select.appendChild(optNone);
  
      const names = Object.keys(state.scenarios).sort();
      for (const name of names) {
        const o = document.createElement("option");
        o.value = name;
        o.textContent = name;
        if (state.activeScenario === name) {
          o.selected = true;
        }
        select.appendChild(o);
      }
    }
  
    refreshScenarioSelect();
  
    saveBtn.addEventListener("click", () => {
      const rawName = nameInput.value.trim();
      if (!rawName) {
        alert("Enter a scenario name first.");
        return;
      }
      state.scenarios[rawName] = {
        spreads: { ...state.spreads },
        precision: state.precision,
        showImpliedOdds: state.showImpliedOdds
      };
      state.activeScenario = rawName;
      saveStateToStorage();
      refreshScenarioSelect();
    });
  
    deleteBtn.addEventListener("click", () => {
      const sel = select.value;
      if (!sel) return;
      if (!window.confirm(`Delete scenario "${sel}"?`)) return;
      delete state.scenarios[sel];
      if (state.activeScenario === sel) {
        state.activeScenario = null;
      }
      saveStateToStorage();
      refreshScenarioSelect();
    });
  
    select.addEventListener("change", () => {
      const name = select.value;
      if (!name || !state.scenarios[name]) {
        state.activeScenario = null;
        saveStateToStorage();
        return;
      }
      const snap = state.scenarios[name];
      state.spreads = { ...(snap.spreads || {}) };
      if (typeof snap.precision === "number") {
        state.precision = snap.precision;
      }
      if (typeof snap.showImpliedOdds === "boolean") {
        state.showImpliedOdds = snap.showImpliedOdds;
      }
      state.activeScenario = name;
      saveStateToStorage();
  
      updateControlsFromState();
      renderSchedule();
      computeAndRenderResults();
    });
  }
  
  

// ---------------------------
// Bootstrapping
// ---------------------------

document.addEventListener("DOMContentLoaded", () => {
    // 1) Load state + shared display mode
    loadStateFromStorage();
    loadDisplayMode();
  
    // 2) Apply theme + layout mode before rendering
    applyTheme();
    applyDisplayMode();
  
    // 3) Controls / filters
    updateControlsFromState();
    initScheduleFilters();
  
    // 4) Render main UI
    renderSchedule();
    computeAndRenderResults();
  
    // 5) Decide which tab to show first (Games or Teams) from state.view
    const initialTab = state.view === "projections" ? "teams" : "games";
    setActiveTab(initialTab);
  
    // 6) Wire up all UI events
    attachEventListeners();
  });
  
  
  
  
  
  

