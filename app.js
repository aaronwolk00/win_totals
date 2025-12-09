// NFL Win Projection Tool
// ------------------------------------------------------------

const NEUTRAL_SPREAD = -0.5; // gives 0.5000 for home team
const LOCAL_STORAGE_KEY = "nflWinProjectionState";

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
    precision: 4,
    threshold: 10,
    spreads: {}, // gameId -> spread number
    results: [], // computed per-team
    currentSort: { key: "projected", direction: "desc" },
    view: "schedule", // "schedule" or "projections"
    showImpliedOdds: false // global toggle for showing American odds
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
      if (typeof parsed.threshold === "number") {
        state.threshold = parsed.threshold;
      }
      if (parsed.spreads && typeof parsed.spreads === "object") {
        state.spreads = parsed.spreads;
      }
      if (parsed.view === "schedule" || parsed.view === "projections") {
        state.view = parsed.view;
      }
      if (typeof parsed.showImpliedOdds === "boolean") {
        state.showImpliedOdds = parsed.showImpliedOdds;
      }
    } catch (err) {
      console.warn("Failed to load state:", err);
    }
}
  

function saveStateToStorage() {
    const toSave = {
        theme: state.theme,
        precision: state.precision,
        threshold: state.threshold,
        spreads: state.spreads,
        view: state.view,
        showImpliedOdds: state.showImpliedOdds
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

// Build schedule UI
function renderSchedule() {
    const container = document.getElementById("scheduleContainer");
    container.innerHTML = "";
  
    const byWeek = new Map();
    for (const game of games) {
      if (!byWeek.has(game.week)) byWeek.set(game.week, []);
      byWeek.get(game.week).push(game);
    }
  
    const sortedWeeks = Array.from(byWeek.keys()).sort((a, b) => a - b);
  
    for (const week of sortedWeeks) {
      const weekGames = byWeek.get(week);
      const weekBlock = document.createElement("div");
      weekBlock.className = "week-block";
  
      const header = document.createElement("div");
      header.className = "week-header";
      const h3 = document.createElement("h3");
      h3.textContent = `Week ${week}`;
      const span = document.createElement("span");
      span.textContent = `${weekGames.length} games`;
      header.appendChild(h3);
      header.appendChild(span);
      weekBlock.appendChild(header);
  
      const list = document.createElement("div");
      list.className = "games-list";
  
      for (const game of weekGames) {
        const card = document.createElement("div");
        card.className = "game-card";
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
  
        // --- Left side: info ---
        const info = document.createElement("div");
        const infoTop = document.createElement("div");
        infoTop.className = "game-info-top";
        infoTop.textContent = `Week ${game.week} · ${game.day}`;
        const infoMain = document.createElement("div");
        infoMain.className = "game-info-main";
        const awayTeam = teams[game.away];
        const homeTeam = teams[game.home];
        infoMain.innerHTML = `
          <span class="team away">${game.away} ${awayTeam.name}</span>
          <span class="at-separator">at</span>
          <span class="team home">${game.home} ${homeTeam.name}</span>
        `;
  
        const infoMeta = document.createElement("div");
        infoMeta.className = "game-info-meta";
  
        const selectedSpreadSpan = document.createElement("span");
        selectedSpreadSpan.className = "selected-spread";
  
        const selectedProbSpan = document.createElement("span");
        selectedProbSpan.className = "selected-prob";
  
        infoMeta.appendChild(selectedSpreadSpan);
        infoMeta.appendChild(selectedProbSpan);
  
        info.appendChild(infoTop);
        info.appendChild(infoMain);
        info.appendChild(infoMeta);
  
        // --- Right side: spread band + expand control ---
        const band = document.createElement("div");
        band.className = "spread-band";
  
        for (const value of spreadBandValues) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "spread-option";
          btn.dataset.value = String(value);
  
          const label =
            (value > 0 ? "+" : "") + value.toFixed(1).replace(/\.0$/, ".0");
          btn.textContent = label;
  
          // Style by sign
          if (Math.abs(value - NEUTRAL_SPREAD) < 1e-6) {
            btn.classList.add("neutral");
          } else if (value < 0) {
            btn.classList.add("favorite");
          } else {
            btn.classList.add("underdog");
          }
  
          // Hide by default outside ±10.5 – mark as extra
          if (Math.abs(value) > 10.5) {
            btn.classList.add("extra");
          }
  
          btn.addEventListener("click", () => {
            setSpreadForGame(game.id, value);
          });
  
          band.appendChild(btn);
        }
  
        card.appendChild(info);
        card.appendChild(band);
  
        // Expand / collapse spreads beyond ±10.5
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
  
        card.appendChild(expandBtn);
  
        list.appendChild(card);
  
        // Initialize display with stored spread, if any
        updateGameCardDisplay(game.id);
      }
  
      weekBlock.appendChild(list);
      container.appendChild(weekBlock);
    }
  }
  

// Set spread for a game and recompute
function setSpreadForGame(gameId, spreadValue) {
  state.spreads[String(gameId)] = spreadValue;
  updateGameCardDisplay(gameId);
  saveStateToStorage();
  computeAndRenderResults();
}

function updateOddsToggleButton() {
    const oddsBtn = document.getElementById("toggleOddsBtn");
    if (!oddsBtn) return;
    oddsBtn.textContent = state.showImpliedOdds
      ? "Hide Implied Odds"
      : "Show Implied Odds";
  }
  

// Update one game card (selected spread, prob)
function updateGameCardDisplay(gameId) {
    const card = document.querySelector(`.game-card[data-game-id="${gameId}"]`);
    if (!card) return;
  
    const spreadRaw = state.spreads[String(gameId)];
    let spread = typeof spreadRaw === "number" ? spreadRaw : null;
  
    let prob = 0.5;
    let spreadText = "Spread: — (treated as neutral for now)";
  
    const game = games.find((g) => g.id === Number(gameId));

    // Classes for favorite / underdog coloring
    let homeClass = "prob-box home";
    let awayClass = "prob-box away";

  
    if (spread !== null && game) {
      prob = homeWinProbFromSpread(spread);
        // home favorite (negative spread) vs home underdog (positive spread)
        if (spread < 0) {
            // home favorite, away underdog
            homeClass += " favorite";
            awayClass += " underdog";
            } else if (spread > 0) {
            // home underdog, away favorite
            homeClass += " underdog";
            awayClass += " favorite";
        }

      const label =
        (spread > 0 ? "+" : spread < 0 ? "" : "") +
        spread.toFixed(1).replace(/\.0$/, ".0");
      spreadText = `Spread (home perspective): ${label}`;
    }
  
    const selectedSpreadSpan = card.querySelector(".selected-spread");
    const selectedProbSpan = card.querySelector(".selected-prob");
  
    if (selectedSpreadSpan) {
      selectedSpreadSpan.textContent = spreadText;
    }
  
    if (selectedProbSpan) {
        const homeProb = prob;
        const awayProb = 1 - prob;
        const decimals = state.precision;
        const showOdds = state.showImpliedOdds;
  
        const homeOdds = probToAmerican(homeProb);
        const awayOdds = probToAmerican(awayProb);
  
        selectedProbSpan.innerHTML = `
          <div class="${awayClass}">
            <span class="prob-label">Away</span>
            <div class="prob-values">
              <strong>${formatPercent(awayProb, decimals)}</strong>
              ${
                showOdds
                  ? `<span class="prob-odds">${formatAmerican(awayOdds)}</span>`
                  : ""
              }
            </div>
          </div>
          <div class="${homeClass}">
            <span class="prob-label">Home</span>
            <div class="prob-values">
              <strong>${formatPercent(homeProb, decimals)}</strong>
              ${
                showOdds
                  ? `<span class="prob-odds">${formatAmerican(homeOdds)}</span>`
                  : ""
              }
            </div>
          </div>
        `;
      }
  
  
    // Update selection visuals
    const buttons = card.querySelectorAll(".spread-option");
    buttons.forEach((btn) => {
      btn.classList.remove("selected");
      if (spread !== null) {
        const val = parseFloat(btn.dataset.value);
        if (Math.abs(val - spread) < 1e-6) {
          btn.classList.add("selected");
        }
      }
    });
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
  const threshold = state.threshold;
  const precision = state.precision;

  // Map team -> list of game win probs (length 4)
  const teamGameProbs = {};
  for (const teamId of teamIds) {
    teamGameProbs[teamId] = [];
  }

  for (const game of games) {
    const key = String(game.id);
    let homeProb = 0.5;
    if (typeof state.spreads[key] === "number") {
      homeProb = homeWinProbFromSpread(state.spreads[key]);
    }

    const awayProb = 1 - homeProb;
    teamGameProbs[game.home].push(homeProb);
    teamGameProbs[game.away].push(awayProb);
  }

  // Ensure each team has 4 games (pad with 0.5 if needed)
  for (const teamId of teamIds) {
    const arr = teamGameProbs[teamId];
    while (arr.length < 4) {
      arr.push(0.5);
    }
  }

  const results = [];

  for (const teamId of teamIds) {
    const info = teams[teamId];
    const probs = teamGameProbs[teamId];

    const expectedAdditionalWins = probs.reduce((sum, p) => sum + p, 0);
    const projectedWins = info.currentWins + expectedAdditionalWins;

    const exact = computeExactDistribution(probs); // length 5
    const cumulative = computeCumulative(exact);
    const pTotalAtLeastX = computeTotalAtLeastX(
      info.currentWins,
      exact,
      threshold
    );

    results.push({
      teamId,
      division: info.division,
      currentWins: info.currentWins,
      expectedAdditionalWins,
      projectedWins,
      exact,
      cumulative,
      pTotalAtLeastX,
      probs
    });
  }

  state.results = results;
  renderTeamTable();
  renderDivisionSummary();
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

function computeTotalAtLeastX(currentWins, exact, threshold) {
  let sum = 0;
  for (let k = 0; k <= 4; k++) {
    const total = currentWins + k;
    if (total >= threshold) {
      sum += exact[k];
    }
  }
  return sum;
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
      case "threshold":
        return r.pTotalAtLeastX;
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

  const headers = [
    { key: "team", label: "Team" },
    { key: "division", label: "Div" },
    { key: "current", label: "Curr W" },
    { key: "expected", label: "Exp add W" },
    { key: "projected", label: "Proj W" },
    { key: "P0", label: "P(0)" },
    { key: "P1", label: "P(1)" },
    { key: "P2", label: "P(2)" },
    { key: "P3", label: "P(3)" },
    { key: "P4", label: "P(4)" },
    { key: "PA1", label: "P(≥1)" },
    { key: "PA2", label: "P(≥2)" },
    { key: "PA3", label: "P(≥3)" },
    { key: "PA4", label: "P(≥4)" },
    { key: "threshold", label: `P(total ≥ X)` }
  ];

  for (const h of headers) {
    const th = document.createElement("th");
    th.textContent = h.label;
    if (
      ["team", "division", "projected", "current", "threshold"].includes(h.key)
    ) {
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
    const tr = document.createElement("tr");
    tr.dataset.teamId = r.teamId;

    tr.addEventListener("click", () => {
      showTeamDetail(r.teamId);
    });

    const tdTeam = document.createElement("td");
    tdTeam.textContent = r.teamId;
    tr.appendChild(tdTeam);

    const tdDiv = document.createElement("td");
    tdDiv.innerHTML = `<span class="badge-division">${r.division}</span>`;
    tr.appendChild(tdDiv);

    const tdCurr = document.createElement("td");
    tdCurr.textContent = r.currentWins.toString();
    tr.appendChild(tdCurr);

    const tdExp = document.createElement("td");
    tdExp.textContent = formatNumber(r.expectedAdditionalWins, precision);
    tr.appendChild(tdExp);

    const tdProj = document.createElement("td");
    tdProj.textContent = formatNumber(r.projectedWins, precision);
    tr.appendChild(tdProj);

    // P(0..4)
    for (let k = 0; k <= 4; k++) {
      const td = document.createElement("td");
      td.textContent = formatPercent(r.exact[k], precision);
      tr.appendChild(td);
    }

    // P(>=1..>=4)
    for (let k = 1; k <= 4; k++) {
      const td = document.createElement("td");
      td.textContent = formatPercent(r.cumulative[k], precision);
      tr.appendChild(td);
    }

    const tdThreshold = document.createElement("td");
    tdThreshold.textContent = formatPercent(r.pTotalAtLeastX, precision);
    if (r.pTotalAtLeastX >= 0.5) {
      tdThreshold.classList.add("highlight-threshold");
    }
    tr.appendChild(tdThreshold);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  container.appendChild(table);
}

// Division summaries + tie note
function renderDivisionSummary() {
  const container = document.getElementById("divisionSummaryContainer");
  container.innerHTML = "";

  const resultsByDiv = {};
  for (const r of state.results) {
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
      row.className = "division-team-row";
      const left = document.createElement("div");
      left.innerHTML = `<strong>${idx + 1}. ${r.teamId}</strong>`;
      const right = document.createElement("div");
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
  if (!teamInfo || !result) return;

  // Collect their 4 games
  const teamGames = [];
  for (const game of games) {
    if (game.home === teamId || game.away === teamId) {
      const key = String(game.id);
      const spread =
        typeof state.spreads[key] === "number"
          ? state.spreads[key]
          : NEUTRAL_SPREAD;
      const homeProb = homeWinProbFromSpread(spread);
      const prob = game.home === teamId ? homeProb : 1 - homeProb;

      teamGames.push({
        game,
        spread,
        prob,
        homeTeamId: game.home,
        awayTeamId: game.away
      });
    }
  }

  const precision = state.precision;

  let html = "";
  html += `<h3>${teamId} · ${teamInfo.name}</h3>`;
  html += `<p>Current wins: <strong>${teamInfo.currentWins}</strong>, expected additional wins: <strong>${formatNumber(
    result.expectedAdditionalWins,
    precision
  )}</strong>, projected wins: <strong>${formatNumber(
    result.projectedWins,
    precision
  )}</strong></p>`;

  html += "<h4>Remaining games</h4>";
  html += '<table><thead><tr>';
  html +=
    "<th>Week</th><th>Matchup</th><th>Home spread</th><th>Team win prob</th>";
  html += "</tr></thead><tbody>";

  teamGames.sort((a, b) => a.game.week - b.game.week);

  for (const tg of teamGames) {
    const g = tg.game;
    const spreadLabel =
      (tg.spread > 0 ? "+" : tg.spread < 0 ? "" : "") +
      tg.spread.toFixed(1).replace(/\.0$/, ".0");
    const matchup = `${tg.homeTeamId} ${teams[tg.homeTeamId].name} vs ${tg.awayTeamId} ${teams[tg.awayTeamId].name}`;
    html += "<tr>";
    html += `<td>${g.week}</td>`;
    html += `<td>${matchup}</td>`;
    html += `<td>${spreadLabel}</td>`;
    html += `<td>${formatPercent(tg.prob, precision)}</td>`;
    html += "</tr>";
  }

  html += "</tbody></table>";

  html += "<h4>Win distribution (remaining 4 games)</h4>";
  html += "<ul>";
  for (let k = 0; k <= 4; k++) {
    html += `<li>P(exactly ${k} wins) = <strong>${formatPercent(
      result.exact[k],
      precision
    )}</strong></li>`;
  }
  html += "</ul>";

  content.innerHTML = html;
  overlay.classList.remove("hidden");
}

// Export CSV
function exportCsv() {
  const rows = [];
  const header = [
    "Team",
    "Division",
    "CurrentWins",
    "ExpectedAdditionalWins",
    "ProjectedWins",
    "P0",
    "P1",
    "P2",
    "P3",
    "P4",
    "P_atLeast1",
    "P_atLeast2",
    "P_atLeast3",
    "P_atLeast4",
    `P_totalAtLeast_${state.threshold}`
  ];
  rows.push(header);

  for (const r of state.results) {
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
      r.pTotalAtLeastX
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
    const thresholdInput = document.getElementById("thresholdInput");
  
    if (precisionSelect) {
      precisionSelect.value = String(state.precision);
    }
    if (thresholdInput) {
      thresholdInput.value = String(state.threshold);
    }
  
    updateOddsToggleButton();
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

function handleThresholdChange(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return;
  state.threshold = num;
  saveStateToStorage();
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
  
    const precisionSelect = document.getElementById("precisionSelect");
    if (precisionSelect) {
      precisionSelect.addEventListener("change", (e) => {
        handlePrecisionChange(e.target.value);
      });
    }
  
    const thresholdInput = document.getElementById("thresholdInput");
    if (thresholdInput) {
      thresholdInput.addEventListener("change", (e) => {
        handleThresholdChange(e.target.value);
      });
    }
  
    const fillEvenBtn = document.getElementById("fillEvenBtn");
    if (fillEvenBtn) {
      fillEvenBtn.addEventListener("click", () => {
        fillNeutralSpreads();
      });
    }
  
    const exportBtn = document.getElementById("exportCSV");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        exportCsv();
      });
    }

    const oddsBtn = document.getElementById("toggleOddsBtn");
    if (oddsBtn) {
      oddsBtn.addEventListener("click", () => {
        state.showImpliedOdds = !state.showImpliedOdds;
        saveStateToStorage();
        updateOddsToggleButton();
        // Re-render all game cards so odds appear/disappear
        for (const game of games) {
          updateGameCardDisplay(game.id);
        }
      });
    }  
  
    const overlay = document.getElementById("teamDetailOverlay");
    const closeBtn = document.getElementById("teamDetailClose");
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        // click outside content closes overlay
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
  }
  

// ---------------------------
// Bootstrapping
// ---------------------------

document.addEventListener("DOMContentLoaded", () => {
    // Load any saved state
    loadStateFromStorage();
  
    // Apply theme & sync controls
    applyTheme();
    updateControlsFromState();
  
    // Render main UI
    renderSchedule();
    computeAndRenderResults();
  
    // Set initial view (schedule full-page or projections)
    applyViewMode();
  
    // Wire up events
    attachEventListeners();
});
  

