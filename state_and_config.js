// state_and_config.js
// ------------------------------------------------------------
// Global state, persistence, theme/mode/view handling, and
// shared probability helpers used across views.
// ------------------------------------------------------------

// Depends on: teams, games, TABLE_HEADERS, STORAGE_KEY, and
// formatting helpers from shared.js.

// -----------------------
// Global constants & state
// -----------------------

const teamIds = Object.keys(teams);

// Spread band values: from -20.5 to +20.5 in 1-point increments
// Used by the schedule view when rendering spread buttons.
const spreadBandValues = (() => {
  const arr = [];
  for (let s = -20.5; s <= 20.5; s += 1) {
    arr.push(Number(s.toFixed(1)));
  }
  return arr;
})();

// Core app state (shared by schedule, projections, and betting)
const state = {
  theme: "dark",
  precision: 2,
  spreads: {}, // gameId -> spread number
  results: [], // per-team results from computeAndRenderResults
  currentSort: { key: "projected", direction: "desc" },

  // "schedule" (Games) or "projections" (Teams)
  view: "schedule",

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
    PA4: true,
  },

  // Schedule filters + scroll memory
  filterWeek: "ALL",
  filterTeam: "ALL",
  filterDivision: "ALL",
  filterPickStatus: "ALL",
  lastFocusedGameId: null,

  // Fan vs Pro mode
  mode: "fan", // "fan" or "pro"

  // Saved scenarios – name -> snapshot
  // { [name]: { spreads, precision, showImpliedOdds } }
  scenarios: {},
  activeScenario: null,
};

// ---------------------------
// Persistence (localStorage)
// ---------------------------

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
    if (
      parsed.filterPickStatus &&
      (parsed.filterPickStatus === "ALL" ||
        parsed.filterPickStatus === "PICKED" ||
        parsed.filterPickStatus === "UNPICKED")
    ) {
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
    activeScenario: state.activeScenario,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.warn("Failed to save state:", err);
  }
}

// ---------------------------
// Theme & mode & view handling
// ---------------------------

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
  // These are defined in projections_view.js:
  renderTeamTable();
  renderColumnPicker();
}

// Show/hide schedule vs projections sections.
// The actual tab switching (Games/Teams/Betting/More) happens in nav_and_bootstrap.js.
function applyViewMode() {
  const scheduleSection = document.getElementById("scheduleSection");
  const resultsSection = document.getElementById("resultsSection");
  const viewToggleBtn = document.getElementById("viewToggleBtn"); // may be null now

  if (!scheduleSection || !resultsSection) return;

  if (state.view === "schedule") {
    scheduleSection.classList.remove("hidden");
    resultsSection.classList.add("hidden");
    if (viewToggleBtn) {
      viewToggleBtn.textContent = "Show Team Projections";
    }
  } else {
    scheduleSection.classList.add("hidden");
    resultsSection.classList.remove("hidden");
    if (viewToggleBtn) {
      viewToggleBtn.textContent = "Show Games & Spreads";
    }
  }
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

// ---------------------------
// Probability helpers
// ---------------------------

// Spread → favorite win probability based on absolute spread
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

// ---------------------------
// Odds toggle, reset, controls
// ---------------------------

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

  // These are defined in schedule_view.js and projections_view.js:
  renderSchedule();
  renderTeamTable();
  renderDivisionSummary();
  updateProgressUI();
}

function updateControlsFromState() {
  const precisionSelect = document.getElementById("precisionSelect");
  if (precisionSelect) {
    precisionSelect.value = String(state.precision);
  }

  updateOddsToggleButton();
  applyMode({ resetColumns: false });
  updateProgressUI();
}

// Precision changes affect both schedule and projections text formatting
function handlePrecisionChange(value) {
  const parsed = parseInt(value, 10);
  if (![2, 3, 4].includes(parsed)) return;
  state.precision = parsed;
  saveStateToStorage();

  // Re-render schedule probabilities (game cards) and projections
  for (const game of games) {
    // updateGameCardDisplay is defined in schedule_view.js
    updateGameCardDisplay(game.id);
  }
  // computeAndRenderResults is defined in projections_view.js
  computeAndRenderResults();
}
