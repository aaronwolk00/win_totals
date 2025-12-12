// ui_shell.js
// ------------------------------------------------------------
// App shell: theme, layout mode, tab navigation, "More" menu,
// high-level controls, and bootstrap.
// ------------------------------------------------------------
//
// Expects these globals from other scripts:
//   - state, teamIds
//   - loadStateFromStorage, saveStateToStorage
//   - applyMode, updateProgressUI
//   - renderSchedule, initScheduleFilters, updateGameCardDisplay
//   - computeAndRenderResults, renderTeamTable, renderDivisionSummary
//   - exportCsv
//   - fillNeutralSpreads
//   - loadDisplayMode, saveDisplayMode, applyDisplayMode
//   - games, NEUTRAL_SPREAD
//
// DOM assumptions (from index.html):
//   - #scheduleSection, #resultsSection, #bettingSection, #rawMarketsSection
//   - .bottom-nav with .bottom-nav-item[data-tab]
//   - #moreMenu containing buttons:
//       #themeToggle, #mainDisplayModeToggle, #modeToggleBtn,
//       #toggleOddsBtn, #fillEvenBtn, #resetStateBtn, #exportCSV
//   - #teamDetailOverlay, #teamDetailClose
//   - #columnPicker toggle button: #toggleColumnPicker
//   - betting header shortcut (optional): #bettingTableBtn

// Track which primary tab is active ("games" | "teams" | "betting")
let activeMainTab = "games";

// ---------------------------
// Theme handling
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

// ---------------------------
// Schedule vs Projections view
// ---------------------------

function applyViewMode() {
  const scheduleSection = document.getElementById("scheduleSection");
  const resultsSection = document.getElementById("resultsSection");

  if (!scheduleSection || !resultsSection) return;

  if (state.view === "schedule") {
    scheduleSection.classList.remove("hidden");
    resultsSection.classList.add("hidden");
  } else {
    scheduleSection.classList.add("hidden");
    resultsSection.classList.remove("hidden");
  }
}

// ---------------------------
// Tabs + "More" menu
// ---------------------------

function toggleMoreMenu() {
  const moreMenu = document.getElementById("moreMenu");
  if (!moreMenu) return;

  const isHidden = moreMenu.classList.contains("hidden");
  moreMenu.classList.toggle("hidden", !isHidden);
}

function closeMoreMenu() {
  const moreMenu = document.getElementById("moreMenu");
  if (moreMenu) moreMenu.classList.add("hidden");
}

function setActiveTab(tab) {
  const scheduleSection   = document.getElementById("scheduleSection");
  const resultsSection    = document.getElementById("resultsSection");
  const bettingSection    = document.getElementById("bettingSection");
  const rawMarketsSection = document.getElementById("rawMarketsSection");

  // "More" is not a real content tab – it just toggles the menu.
  if (tab === "more") {
    toggleMoreMenu();
    return;
  }

  activeMainTab = tab;

  // Hide the More menu whenever we switch main tabs
  closeMoreMenu();

  // Update active state on BOTH navs (top + bottom),
  // but never mark "more" as active.
  document
    .querySelectorAll(".bottom-nav-item, .top-nav-item")
    .forEach((btn) => {
      const btnTab = btn.dataset.tab;
      if (!btnTab || btnTab === "more") {
        btn.classList.toggle("is-active", false);
        return;
      }
      btn.classList.toggle("is-active", btnTab === tab);
    });

  // Hide all sections
  if (scheduleSection)   scheduleSection.classList.add("hidden");
  if (resultsSection)    resultsSection.classList.add("hidden");
  if (bettingSection)    bettingSection.classList.add("hidden");
  if (rawMarketsSection) rawMarketsSection.classList.add("hidden");

  // Show the right content and keep state.view in sync
  if (tab === "games") {
    state.view = "schedule";
    saveStateToStorage();
    applyViewMode(); // uses state.view to toggle schedule vs projections
  } else if (tab === "teams") {
    state.view = "projections";
    saveStateToStorage();
    applyViewMode();
  } else if (tab === "betting") {
    if (bettingSection)    bettingSection.classList.remove("hidden");
    if (rawMarketsSection) rawMarketsSection.classList.remove("hidden");
  }
}


// ---------------------------
// Odds toggle + full reset
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

  renderSchedule();
  renderTeamTable();
  renderDivisionSummary();
  updateProgressUI();
}

// ---------------------------
// Controls ↔ state sync
// ---------------------------

function updateControlsFromState() {
  // We’ve removed precision UI, but this stays defensive in case you add it back.
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

// ---------------------------
// Event wiring
// ---------------------------

// Wire up click handlers for any tab strip (top or bottom)
function wireNavContainer(containerSelector, itemSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  container.querySelectorAll(itemSelector).forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (!tab) return;
      setActiveTab(tab);
    });
  });
}


function attachShellEventListeners() {
  // "More" menu controls
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      saveStateToStorage();
      closeMoreMenu();
      applyTheme();
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
      closeMoreMenu();
      updateOddsToggleButton();
      for (const game of games) {
        updateGameCardDisplay(game.id);
      }
    });
  }

  // Optional shortcut to Betting tab (if present anywhere)
  const bettingBtn = document.getElementById("bettingTableBtn");
  if (bettingBtn) {
    bettingBtn.addEventListener("click", () => {
      setActiveTab("betting");
    });
  }

  // Precision (if ever re-added)
  const precisionSelect = document.getElementById("precisionSelect");
  if (precisionSelect) {
    precisionSelect.addEventListener("change", (e) => {
      handlePrecisionChange(e.target.value);
    });
  }

  // "Fill neutral" / reset / CSV – all in More menu now
  const fillEvenBtn = document.getElementById("fillEvenBtn");
  if (fillEvenBtn) {
    fillEvenBtn.addEventListener("click", () => {
      closeMoreMenu();
      fillNeutralSpreads();
    });
  }

  const resetBtn = document.getElementById("resetStateBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      closeMoreMenu();
      resetAllState();
    });
  }

  const exportBtn = document.getElementById("exportCSV");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      closeMoreMenu();
      exportCsv();
    });
  }

  // Team detail modal close
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

  // Mode toggle (Fan vs Pro)
  const modeToggle = document.getElementById("modeToggleBtn");
  if (modeToggle) {
    modeToggle.addEventListener("click", () => {
      state.mode = state.mode === "fan" ? "pro" : "fan";
      saveStateToStorage();
      closeMoreMenu();
      applyMode({ resetColumns: true });
    });
  }

  // Layout mode (desktop vs mobile)
  const displayModeBtn = document.getElementById("mainDisplayModeToggle");
  if (displayModeBtn) {
    displayModeBtn.addEventListener("click", () => {
      // displayMode is a shared global managed by shared.js
      // eslint-disable-next-line no-undef
      displayMode = displayMode === "mobile" ? "desktop" : "mobile";
      saveDisplayMode();
      closeMoreMenu();
      applyDisplayMode();
    });
  }

  // Tab bars (top on desktop, bottom on mobile)
  wireNavContainer(".bottom-nav", ".bottom-nav-item");
  wireNavContainer(".top-nav", ".top-nav-item");
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
  attachShellEventListeners();
});
