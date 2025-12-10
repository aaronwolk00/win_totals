// NFL Win Projection Tool
// ------------------------------------------------------------

const NEUTRAL_SPREAD = -0.5; // gives 0.5000 for home team
const LOCAL_STORAGE_KEY = "nflWinProjectionState";
// Column definitions for main projections table
const TABLE_HEADERS = [
    { key: "team",      label: "Team" },
    { key: "division",  label: "Div" },
    { key: "current",   label: "Current W" },
    { key: "expected",  label: "Exp. addl W" },
    { key: "projected", label: "Proj. W" },
    { key: "P0",        label: "P(0 W)" },
    { key: "P1",        label: "P(1 W)" },
    { key: "P2",        label: "P(2 W)" },
    { key: "P3",        label: "P(3 W)" },
    { key: "P4",        label: "P(4 W)" },
    { key: "PA1",       label: "P(≥1 W)" },
    { key: "PA2",       label: "P(≥2 W)" },
    { key: "PA3",       label: "P(≥3 W)" },
    { key: "PA4",       label: "P(≥4 W)" },
  ];
  
const QUICK_SPREAD_PRESETS = [-10.5, -7.5, -3.5, -0.5, +0.5, +3.5, +7.5, +10.5];

// -----------------------
// Global display mode (Desktop / Mobile) – shared with betting page
// -----------------------
const DISPLAY_MODE_KEY = "nflDisplayMode"; // shared storage key
let displayMode = "desktop";

function loadDisplayMode() {
  try {
    const raw = localStorage.getItem(DISPLAY_MODE_KEY);
    if (!raw) return;
    if (raw === "mobile" || raw === "desktop") {
      displayMode = raw;
    }
  } catch (e) {
    console.warn("Failed to load display mode", e);
  }
}

function saveDisplayMode() {
  try {
    localStorage.setItem(DISPLAY_MODE_KEY, displayMode);
  } catch (e) {
    console.warn("Failed to save display mode", e);
  }
}

function applyDisplayModeMainPage() {
    const body = document.body;
    body.classList.toggle("mode-mobile", displayMode === "mobile");
    body.classList.toggle("mode-desktop", displayMode !== "mobile");
  
    const btn = document.getElementById("mainDisplayModeToggle");
    if (btn) {
      btn.textContent =
        displayMode === "mobile"
          ? "Switch to Desktop View"
          : "Switch to Mobile View";
    }
  
    // NEW: sync header controls toggle text
    const headerToggle = document.getElementById("headerControlsToggle");
    const headerControls = document.querySelector(".header-controls");
    if (headerToggle && headerControls) {
      if (displayMode === "mobile") {
        const open = headerControls.classList.contains("is-open");
        headerToggle.textContent = open
          ? "Hide Header Controls"
          : "Show Header Controls";
      } else {
        // On desktop, always show controls (CSS handles layout)
        headerControls.classList.remove("is-open");
      }
    }
  }
  


// Teams, divisions, current wins
const teams = {
  NE: { name: "New England Patriots", division: "AE", currentWins: 11 },
  BUF: { name: "Buffalo Bills", division: "AE", currentWins: 9 },
  MIA: { name: "Miami Dolphins", division: "AE", currentWins: 6 },
  NYJ: { name: "New York Jets", division: "AE", currentWins: 3 },

  DEN: { name: "Denver Broncos", division: "AW", currentWins: 11 },
  LAC: { name: "Los Angeles Chargers", division: "AW", currentWins: 9 },
  KC: { name: "Kansas City Chiefs", division: "AW", currentWins: 6 },
  LV: { name: "Las Vegas Raiders", division: "AW", currentWins: 2 },

  PIT: { name: "Pittsburgh Steelers", division: "AN", currentWins: 7 },
  BAL: { name: "Baltimore Ravens", division: "AN", currentWins: 6 },
  CIN: { name: "Cincinnati Bengals", division: "AN", currentWins: 4 },
  CLE: { name: "Cleveland Browns", division: "AN", currentWins: 3 },

  JAX: { name: "Jacksonville Jaguars", division: "AS", currentWins: 9 },
  HOU: { name: "Houston Texans", division: "AS", currentWins: 8 },
  IND: { name: "Indianapolis Colts", division: "AS", currentWins: 8 },
  TEN: { name: "Tennessee Titans", division: "AS", currentWins: 2 },

  PHI: { name: "Philadelphia Eagles", division: "NE", currentWins: 8 },
  DAL: { name: "Dallas Cowboys", division: "NE", currentWins: 6 },
  WAS: { name: "Washington Commanders", division: "NE", currentWins: 3 },
  NYG: { name: "New York Giants", division: "NE", currentWins: 2 },

  LAR: { name: "Los Angeles Rams", division: "NW", currentWins: 10 },
  SEA: { name: "Seattle Seahawks", division: "NW", currentWins: 10 },
  SF: { name: "San Francisco 49ers", division: "NW", currentWins: 9 },
  ARI: { name: "Arizona Cardinals", division: "NW", currentWins: 3 },

  GB: { name: "Green Bay Packers", division: "NN", currentWins: 9 },
  CHI: { name: "Chicago Bears", division: "NN", currentWins: 9 },
  DET: { name: "Detroit Lions", division: "NN", currentWins: 8 },
  MIN: { name: "Minnesota Vikings", division: "NN", currentWins: 5 },

  TB: { name: "Tampa Bay Buccaneers", division: "NS", currentWins: 7 },
  CAR: { name: "Carolina Panthers", division: "NS", currentWins: 7 },
  ATL: { name: "Atlanta Falcons", division: "NS", currentWins: 4 },
  NO: { name: "New Orleans Saints", division: "NS", currentWins: 3 }
};

// Team color palettes (primary + secondary) – 2025
const teamPalettes = {
    // AFC EAST
    BUF: { primary: "#00338D", secondary: "#C60C30" }, // Royal Blue / Red
    MIA: { primary: "#008E97", secondary: "#FC4C02" }, // Aqua / Orange
    NE:  { primary: "#002244", secondary: "#C60C30" }, // Navy / Red
    NYJ: { primary: "#125740", secondary: "#000000" }, // Legacy Green / Black
  
    // AFC NORTH
    BAL: { primary: "#241773", secondary: "#9E7C0C" }, // Purple / Gold
    CIN: { primary: "#FB4F14", secondary: "#000000" }, // Orange / Black
    CLE: { primary: "#311D00", secondary: "#FF3C00" }, // Brown / Orange
    PIT: { primary: "#101820", secondary: "#FFB612" }, // Black / Gold
  
    // AFC SOUTH
    HOU: { primary: "#03202F", secondary: "#A71930" }, // Deep Steel / Battle Red
    IND: { primary: "#002C5F", secondary: "#A2AAAD" }, // Speed Blue / Gray
    JAX: { primary: "#006778", secondary: "#9F792C" }, // Teal / Gold
    TEN: { primary: "#0C2340", secondary: "#4B92DB" }, // Navy / Titans Blue
  
    // AFC WEST
    DEN: { primary: "#FB4F14", secondary: "#0C2340" }, // Sunset Orange / Navy
    KC:  { primary: "#E31837", secondary: "#FFB81C" }, // Red / Gold
    LV:  { primary: "#000000", secondary: "#A5ACAF" }, // Black / Silver
    LAC: { primary: "#0080C6", secondary: "#FFC20E" }, // Powder Blue / Sunshine Gold
  
    // NFC EAST
    DAL: { primary: "#003594", secondary: "#869397" }, // Navy / Silver
    NYG: { primary: "#0B2265", secondary: "#A71930" }, // Blue / Red
    PHI: { primary: "#004C54", secondary: "#A5ACAF" }, // Midnight Green / Silver
    WAS: { primary: "#5A1414", secondary: "#FFB612" }, // Burgundy / Gold
  
    // NFC NORTH
    CHI: { primary: "#0B162A", secondary: "#C83803" }, // Dark Navy / Orange
    DET: { primary: "#0076B6", secondary: "#B0B7BC" }, // Honolulu Blue / Silver
    GB:  { primary: "#203731", secondary: "#FFB612" }, // Green / Gold
    MIN: { primary: "#4F2683", secondary: "#FFC62F" }, // Purple / Gold
  
    // NFC SOUTH
    ATL: { primary: "#000000", secondary: "#A71930" }, // Black / Red
    CAR: { primary: "#0085CA", secondary: "#101820" }, // Process Blue / Black
    NO:  { primary: "#D3BC8D", secondary: "#101820" }, // Old Gold / Black
    TB:  { primary: "#D50A0A", secondary: "#34302B" }, // Red / Pewter
  
    // NFC WEST
    ARI: { primary: "#97233F", secondary: "#000000" }, // Cardinal / Black
    LAR: { primary: "#003594", secondary: "#FFA300" }, // Rams Blue / Sol
    SF:  { primary: "#AA0000", secondary: "#B3995D" }, // Red / Gold
    SEA: { primary: "#002244", secondary: "#69BE28" }  // Navy / Action Green
  };
  

const teamIds = Object.keys(teams);

// Schedule (64 games) – away/home abbreviations
const games = [
  // WEEK 15
  {
    id: 1,
    week: 15,
    day: "Thu",
    away: "ATL",
    home: "TB",
    description: "Atlanta Falcons at Tampa Bay Buccaneers"
  },
  {
    id: 2,
    week: 15,
    day: "Sun",
    away: "CLE",
    home: "CHI",
    description: "Cleveland Browns at Chicago Bears"
  },
  {
    id: 3,
    week: 15,
    day: "Sun",
    away: "BAL",
    home: "CIN",
    description: "Baltimore Ravens at Cincinnati Bengals"
  },
  {
    id: 4,
    week: 15,
    day: "Sun",
    away: "ARI",
    home: "HOU",
    description: "Arizona Cardinals at Houston Texans"
  },
  {
    id: 5,
    week: 15,
    day: "Sun",
    away: "NYJ",
    home: "JAX",
    description: "New York Jets at Jacksonville Jaguars"
  },
  {
    id: 6,
    week: 15,
    day: "Sun",
    away: "LAC",
    home: "KC",
    description: "Los Angeles Chargers at Kansas City Chiefs"
  },
  {
    id: 7,
    week: 15,
    day: "Sun",
    away: "BUF",
    home: "NE",
    description: "Buffalo Bills at New England Patriots"
  },
  {
    id: 8,
    week: 15,
    day: "Sun",
    away: "WAS",
    home: "NYG",
    description: "Washington Commanders at New York Giants"
  },
  {
    id: 9,
    week: 15,
    day: "Sun",
    away: "LV",
    home: "PHI",
    description: "Las Vegas Raiders at Philadelphia Eagles"
  },
  {
    id: 10,
    week: 15,
    day: "Sun",
    away: "GB",
    home: "DEN",
    description: "Green Bay Packers at Denver Broncos"
  },
  {
    id: 11,
    week: 15,
    day: "Sun",
    away: "DET",
    home: "LAR",
    description: "Detroit Lions at Los Angeles Rams"
  },
  {
    id: 12,
    week: 15,
    day: "Sun",
    away: "CAR",
    home: "NO",
    description: "Carolina Panthers at New Orleans Saints"
  },
  {
    id: 13,
    week: 15,
    day: "Sun",
    away: "IND",
    home: "SEA",
    description: "Indianapolis Colts at Seattle Seahawks"
  },
  {
    id: 14,
    week: 15,
    day: "Sun",
    away: "TEN",
    home: "SF",
    description: "Tennessee Titans at San Francisco 49ers"
  },
  {
    id: 15,
    week: 15,
    day: "Sun",
    away: "MIN",
    home: "DAL",
    description: "Minnesota Vikings at Dallas Cowboys"
  },
  {
    id: 16,
    week: 15,
    day: "Mon",
    away: "MIA",
    home: "PIT",
    description: "Miami Dolphins at Pittsburgh Steelers"
  },

  // WEEK 16
  {
    id: 17,
    week: 16,
    day: "Thu",
    away: "LAR",
    home: "SEA",
    description: "Los Angeles Rams at Seattle Seahawks"
  },
  {
    id: 18,
    week: 16,
    day: "Sat",
    away: "GB",
    home: "CHI",
    description: "Green Bay Packers at Chicago Bears"
  },
  {
    id: 19,
    week: 16,
    day: "Sat",
    away: "PHI",
    home: "WAS",
    description: "Philadelphia Eagles at Washington Commanders"
  },
  {
    id: 20,
    week: 16,
    day: "Sun",
    away: "NE",
    home: "BAL",
    description: "New England Patriots at Baltimore Ravens"
  },
  {
    id: 21,
    week: 16,
    day: "Sun",
    away: "TB",
    home: "CAR",
    description: "Tampa Bay Buccaneers at Carolina Panthers"
  },
  {
    id: 22,
    week: 16,
    day: "Sun",
    away: "BUF",
    home: "CLE",
    description: "Buffalo Bills at Cleveland Browns"
  },
  {
    id: 23,
    week: 16,
    day: "Sun",
    away: "LAC",
    home: "DAL",
    description: "Los Angeles Chargers at Dallas Cowboys"
  },
  {
    id: 24,
    week: 16,
    day: "Sun",
    away: "NYJ",
    home: "NO",
    description: "New York Jets at New Orleans Saints"
  },
  {
    id: 25,
    week: 16,
    day: "Sun",
    away: "MIN",
    home: "NYG",
    description: "Minnesota Vikings at New York Giants"
  },
  {
    id: 26,
    week: 16,
    day: "Sun",
    away: "KC",
    home: "TEN",
    description: "Kansas City Chiefs at Tennessee Titans"
  },
  {
    id: 27,
    week: 16,
    day: "Sun",
    away: "ATL",
    home: "ARI",
    description: "Atlanta Falcons at Arizona Cardinals"
  },
  {
    id: 28,
    week: 16,
    day: "Sun",
    away: "JAX",
    home: "DEN",
    description: "Jacksonville Jaguars at Denver Broncos"
  },
  {
    id: 29,
    week: 16,
    day: "Sun",
    away: "PIT",
    home: "DET",
    description: "Pittsburgh Steelers at Detroit Lions"
  },
  {
    id: 30,
    week: 16,
    day: "Sun",
    away: "LV",
    home: "HOU",
    description: "Las Vegas Raiders at Houston Texans"
  },
  {
    id: 31,
    week: 16,
    day: "Sun",
    away: "CIN",
    home: "MIA",
    description: "Cincinnati Bengals at Miami Dolphins"
  },
  {
    id: 32,
    week: 16,
    day: "Mon",
    away: "SF",
    home: "IND",
    description: "San Francisco 49ers at Indianapolis Colts"
  },

  // WEEK 17
  {
    id: 33,
    week: 17,
    day: "Thu",
    away: "DAL",
    home: "WAS",
    description: "Dallas Cowboys at Washington Commanders"
  },
  {
    id: 34,
    week: 17,
    day: "Thu",
    away: "DET",
    home: "MIN",
    description: "Detroit Lions at Minnesota Vikings"
  },
  {
    id: 35,
    week: 17,
    day: "Thu",
    away: "DEN",
    home: "KC",
    description: "Denver Broncos at Kansas City Chiefs"
  },
  {
    id: 36,
    week: 17,
    day: "Sat",
    away: "SEA",
    home: "CAR",
    description: "Seattle Seahawks at Carolina Panthers"
  },
  {
    id: 37,
    week: 17,
    day: "Sat",
    away: "ARI",
    home: "CIN",
    description: "Arizona Cardinals at Cincinnati Bengals"
  },
  {
    id: 38,
    week: 17,
    day: "Sat",
    away: "BAL",
    home: "GB",
    description: "Baltimore Ravens at Green Bay Packers"
  },
  {
    id: 39,
    week: 17,
    day: "Sat",
    away: "HOU",
    home: "LAC",
    description: "Houston Texans at Los Angeles Chargers"
  },
  {
    id: 40,
    week: 17,
    day: "Sat",
    away: "NYG",
    home: "LV",
    description: "New York Giants at Las Vegas Raiders"
  },
  {
    id: 41,
    week: 17,
    day: "Sun",
    away: "PIT",
    home: "CLE",
    description: "Pittsburgh Steelers at Cleveland Browns"
  },
  {
    id: 42,
    week: 17,
    day: "Sun",
    away: "JAX",
    home: "IND",
    description: "Jacksonville Jaguars at Indianapolis Colts"
  },
  {
    id: 43,
    week: 17,
    day: "Sun",
    away: "TB",
    home: "MIA",
    description: "Tampa Bay Buccaneers at Miami Dolphins"
  },
  {
    id: 44,
    week: 17,
    day: "Sun",
    away: "NE",
    home: "NYJ",
    description: "New England Patriots at New York Jets"
  },
  {
    id: 45,
    week: 17,
    day: "Sun",
    away: "NO",
    home: "TEN",
    description: "New Orleans Saints at Tennessee Titans"
  },
  {
    id: 46,
    week: 17,
    day: "Sun",
    away: "PHI",
    home: "BUF",
    description: "Philadelphia Eagles at Buffalo Bills"
  },
  {
    id: 47,
    week: 17,
    day: "Sun",
    away: "CHI",
    home: "SF",
    description: "Chicago Bears at San Francisco 49ers"
  },
  {
    id: 48,
    week: 17,
    day: "Mon",
    away: "LAR",
    home: "ATL",
    description: "Los Angeles Rams at Atlanta Falcons"
  },

  // WEEK 18
  {
    id: 49,
    week: 18,
    day: "TBD",
    away: "NO",
    home: "ATL",
    description: "New Orleans Saints at Atlanta Falcons"
  },
  {
    id: 50,
    week: 18,
    day: "TBD",
    away: "NYJ",
    home: "BUF",
    description: "New York Jets at Buffalo Bills"
  },
  {
    id: 51,
    week: 18,
    day: "TBD",
    away: "DET",
    home: "CHI",
    description: "Detroit Lions at Chicago Bears"
  },
  {
    id: 52,
    week: 18,
    day: "TBD",
    away: "CLE",
    home: "CIN",
    description: "Cleveland Browns at Cincinnati Bengals"
  },
  {
    id: 53,
    week: 18,
    day: "TBD",
    away: "LAC",
    home: "DEN",
    description: "Los Angeles Chargers at Denver Broncos"
  },
  {
    id: 54,
    week: 18,
    day: "TBD",
    away: "IND",
    home: "HOU",
    description: "Indianapolis Colts at Houston Texans"
  },
  {
    id: 55,
    week: 18,
    day: "TBD",
    away: "TEN",
    home: "JAX",
    description: "Tennessee Titans at Jacksonville Jaguars"
  },
  {
    id: 56,
    week: 18,
    day: "TBD",
    away: "ARI",
    home: "LAR",
    description: "Arizona Cardinals at Los Angeles Rams"
  },
  {
    id: 57,
    week: 18,
    day: "TBD",
    away: "KC",
    home: "LV",
    description: "Kansas City Chiefs at Las Vegas Raiders"
  },
  {
    id: 58,
    week: 18,
    day: "TBD",
    away: "GB",
    home: "MIN",
    description: "Green Bay Packers at Minnesota Vikings"
  },
  {
    id: 59,
    week: 18,
    day: "TBD",
    away: "MIA",
    home: "NE",
    description: "Miami Dolphins at New England Patriots"
  },
  {
    id: 60,
    week: 18,
    day: "TBD",
    away: "DAL",
    home: "NYG",
    description: "Dallas Cowboys at New York Giants"
  },
  {
    id: 61,
    week: 18,
    day: "TBD",
    away: "WAS",
    home: "PHI",
    description: "Washington Commanders at Philadelphia Eagles"
  },
  {
    id: 62,
    week: 18,
    day: "TBD",
    away: "BAL",
    home: "PIT",
    description: "Baltimore Ravens at Pittsburgh Steelers"
  },
  {
    id: 63,
    week: 18,
    day: "TBD",
    away: "SEA",
    home: "SF",
    description: "Seattle Seahawks at San Francisco 49ers"
  },
  {
    id: 64,
    week: 18,
    day: "TBD",
    away: "CAR",
    home: "TB",
    description: "Carolina Panthers at Tampa Bay Buccaneers"
  }
];

// Spread → favorite probability mapping (absolute spread)
const spreadProbTable = {
  0.5: 0.5,
  1.5: 0.509,
  2.5: 0.5544,
  3.5: 0.6368,
  4.5: 0.6514,
  5.5: 0.6522,
  6.5: 0.6796,
  7.5: 0.7377,
  8.5: 0.7477,
  9.5: 0.7667,
  10.5: 0.8042,
  11.5: 0.8097,
  12.5: 0.8117,
  13.5: 0.825,
  14.5: 0.8541
};


// ---------------------------
// Mode handling (Fan / Pro)
// ---------------------------
function applyMode() {
    const body = document.body;
    const btn = document.getElementById("modeToggleBtn");
  
    body.classList.toggle("mode-fan", state.mode === "fan");
    body.classList.toggle("mode-pro", state.mode === "pro");
  
    if (btn) {
      btn.textContent =
        state.mode === "fan" ? "Switch to Pro Mode" : "Switch to Fan Mode";
    }
  
    // Column presets per mode (can still be overridden via column picker)
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
        PA4: false
      };
    } else {
      // Pro mode: show everything by default
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
        PA4: true
      };
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
  

// Has the user picked at least one spread for this team's games?
function teamHasAnyPickedGame(teamId) {
    for (const game of games) {
      if (game.home === teamId || game.away === teamId) {
        if (typeof state.spreads[String(game.id)] === "number") {
          return true;
        }
      }
    }
    return false;
  }
  

// Convert win probability -> American odds
function probToAmerican(probRaw) {
    // clamp to avoid infinite odds
    const p = Math.min(0.9999, Math.max(0.0001, probRaw));
    let odds;
    if (p >= 0.5) {
      odds = -Math.round((p / (1 - p)) * 100);
    } else {
      odds = Math.round(((1 - p) / p) * 100);
    }
    return odds;
  }
  
  function formatAmerican(odds) {
    if (!Number.isFinite(odds)) return "";
    if (odds > 0) return `+${odds}`;
    return String(odds);
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
  
  
  
  

// Utility: load/save state to localStorage
function loadStateFromStorage() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
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
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(toSave));
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

// Formatting helpers
function formatNumber(value, decimals) {
  return value.toFixed(decimals);
}

function formatPercent(prob, decimals) {
  return (prob * 100).toFixed(decimals) + "%";
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

      if (!teamHasAnyPickedGame(r.teamId)) {
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
      if (!teamHasAnyPickedGame(r.teamId)) continue;
    
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
          isHome: game.home === teamId
        });
      }
    }
  
    teamGames.sort((a, b) => a.game.week - b.game.week);
    const precision = state.precision;
  
    // Basic header
    let html = "";
    html += `<h3>${teamId} · ${teamInfo.name}</h3>`;
    html += `<p>Current wins: <strong>${teamInfo.currentWins}</strong> · Expected additional wins: <strong>${formatNumber(
      result.expectedAdditionalWins,
      precision
    )}</strong> · Projected wins: <strong>${formatNumber(
      result.projectedWins,
      precision
    )}</strong></p>`;
  
    // NEW: short narrative summary (fan-friendly)
    html += buildTeamNarrative(teamInfo, result);
  
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
  
    html += `<h4>Win distribution (remaining 4 games)</h4>`;
    html += `<ul class="team-detail-dist">`;
    for (let k = 0; k <= 4; k++) {
      html += `<li>${k} wins: <strong>${formatPercent(
        result.exact[k],
        precision
      )}</strong></li>`;
    }
    html += `</ul>`;
  
    content.innerHTML = html;
    overlay.classList.remove("hidden");
  
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
  
        // Update distribution list
        const distLis = content.querySelectorAll(".team-detail-dist li");
        for (let k = 0; k <= 4; k++) {
          const li = distLis[k];
          if (!li) continue;
          li.innerHTML = `${k} wins: <strong>${formatPercent(
            updatedResult.exact[k],
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
    if (!teamHasAnyPickedGame(r.teamId)) continue;
  
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
    applyMode(); 
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
        state.view = state.view === "schedule" ? "projections" : "schedule";
        saveStateToStorage();
        applyViewMode();
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
  
    const bettingBtn = document.getElementById("bettingTableBtn");
    if (bettingBtn) {
      bettingBtn.addEventListener("click", () => {
        window.location.href = "betting.html";
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
        applyMode();
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
      });
    }

    const displayModeBtn = document.getElementById("mainDisplayModeToggle");
    if (displayModeBtn) {
      displayModeBtn.addEventListener("click", () => {
        displayMode = displayMode === "mobile" ? "desktop" : "mobile";
        saveDisplayMode();
        applyDisplayModeMainPage();
      });
    }
  
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
    // 1) Load state + display mode
    loadStateFromStorage();
    loadDisplayMode();
  
    // 2) Apply theme + display mode before rendering UI
    applyTheme();
    applyDisplayModeMainPage();
  
    // 3) Controls / filters
    updateControlsFromState();
    initScheduleFilters();
  
    // 4) Render main UI
    renderSchedule();
    computeAndRenderResults();
  
    // 5) View (schedule vs projections) + wiring
    applyViewMode();
    attachEventListeners();
  });
  
  
  

