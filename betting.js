// betting.js – win totals betting table for NFL Win Projection Tool
// ------------------------------------------------------------

const STORAGE_KEY = "nflWinProjectionState";

// -----------------------
// Team color palettes (same as app.js)
// -----------------------
const teamPalettes = {
  BUF: { primary: "#00338D", secondary: "#C60C30" },
  MIA: { primary: "#008E97", secondary: "#FC4C02" },
  NE:  { primary: "#002244", secondary: "#C60C30" },
  NYJ: { primary: "#125740", secondary: "#000000" },

  BAL: { primary: "#241773", secondary: "#9E7C0C" },
  CIN: { primary: "#FB4F14", secondary: "#000000" },
  CLE: { primary: "#311D00", secondary: "#FF3C00" },
  PIT: { primary: "#101820", secondary: "#FFB612" },

  HOU: { primary: "#03202F", secondary: "#A71930" },
  IND: { primary: "#002C5F", secondary: "#A2AAAD" },
  JAX: { primary: "#006778", secondary: "#9F792C" },
  TEN: { primary: "#0C2340", secondary: "#4B92DB" },

  DEN: { primary: "#FB4F14", secondary: "#0C2340" },
  KC:  { primary: "#E31837", secondary: "#FFB81C" },
  LV:  { primary: "#000000", secondary: "#A5ACAF" },
  LAC: { primary: "#0080C6", secondary: "#FFC20E" },

  DAL: { primary: "#003594", secondary: "#869397" },
  NYG: { primary: "#0B2265", secondary: "#A71930" },
  PHI: { primary: "#004C54", secondary: "#A5ACAF" },
  WAS: { primary: "#5A1414", secondary: "#FFB612" },

  CHI: { primary: "#0B162A", secondary: "#C83803" },
  DET: { primary: "#0076B6", secondary: "#B0B7BC" },
  GB:  { primary: "#203731", secondary: "#FFB612" },
  MIN: { primary: "#4F2683", secondary: "#FFC62F" },

  ATL: { primary: "#000000", secondary: "#A71930" },
  CAR: { primary: "#0085CA", secondary: "#101820" },
  NO:  { primary: "#D3BC8D", secondary: "#101820" },
  TB:  { primary: "#D50A0A", secondary: "#34302B" },

  ARI: { primary: "#97233F", secondary: "#000000" },
  LAR: { primary: "#003594", secondary: "#FFA300" },
  SF:  { primary: "#AA0000", secondary: "#B3995D" },
  SEA: { primary: "#002244", secondary: "#69BE28" }
};

// -----------------------
// Market board (as provided)
// -----------------------
const BET_WIN_TOTALS = [
  {
    teamId: "ARI",
    teamName: "Arizona Cardinals",
    markets: [
      { total: 3.5, over: -330, under: 270 },
      { total: 4.5, over: 175, under: -210 },
      { total: 5.5, over: 800, under: -1300 }
    ]
  },
  {
    teamId: "ATL",
    teamName: "Atlanta Falcons",
    markets: [
      { total: 5.5, over: -130, under: 110 },
      { total: 6.5, over: 380, under: -490 }
    ]
  },
  {
    teamId: "BAL",
    teamName: "Baltimore Ravens",
    markets: [
      { total: 7.5, over: -270, under: 220 },
      { total: 8.5, over: 155, under: -180 }
    ]
  },
  {
    teamId: "BUF",
    teamName: "Buffalo Bills",
    markets: [
      { total: 11.5, over: -180, under: 155 },
      { total: 12.5, over: 320, under: -400 }
    ]
  },
  {
    teamId: "CAR",
    teamName: "Carolina Panthers",
    markets: [
      { total: 7.5, over: -550, under: 420 },
      { total: 8.5, over: 100, under: -120 },
      { total: 9.5, over: 410, under: -550 }
    ]
  },
  {
    teamId: "CHI",
    teamName: "Chicago Bears",
    markets: [
      { total: 9.5, over: -1900, under: 950 },
      { total: 10.5, over: -240, under: 200 },
      { total: 11.5, over: 190, under: -230 }
    ]
  },
  {
    teamId: "CIN",
    teamName: "Cincinnati Bengals",
    markets: [
      { total: 5.5, over: -550, under: 420 },
      { total: 6.5, over: -120, under: 100 },
      { total: 7.5, over: 450, under: -600 }
    ]
  },
  {
    teamId: "CLE",
    teamName: "Cleveland Browns",
    markets: [
      { total: 3.5, over: -230, under: 190 },
      { total: 4.5, over: 240, under: -290 },
      { total: 5.5, over: 850, under: -1600 }
    ]
  },
  {
    teamId: "DAL",
    teamName: "Dallas Cowboys",
    markets: [
      { total: 7.5, over: -550, under: 420 },
      { total: 8.5, over: -120, under: 100 },
      { total: 9.5, over: 410, under: -550 }
    ]
  },
  {
    teamId: "DEN",
    teamName: "Denver Broncos",
    markets: [
      { total: 12.5, over: -210, under: 175 },
      { total: 13.5, over: 175, under: -220 }
    ]
  },
  {
    teamId: "DET",
    teamName: "Detroit Lions",
    markets: [
      { total: 9.5, over: -430, under: 340 },
      { total: 10.5, over: 115, under: -135 },
      { total: 11.5, over: 650, under: -950 }
    ]
  },
  {
    teamId: "GB",
    teamName: "Green Bay Packers",
    markets: [
      { total: 10.5, over: -550, under: 420 },
      { total: 11.5, over: -125, under: 105 },
      { total: 12.5, over: 400, under: -550 }
    ]
  },
  {
    teamId: "HOU",
    teamName: "Houston Texans",
    markets: [
      { total: 10.5, over: -250, under: 210 },
      { total: 11.5, over: 240, under: -290 }
    ]
  },
  {
    teamId: "IND",
    teamName: "Indianapolis Colts",
    markets: [
      { total: 8.5, over: -230, under: 190 },
      { total: 9.5, over: 230, under: -280 }
    ]
  },
  {
    teamId: "JAX",
    teamName: "Jacksonville Jaguars",
    markets: [
      { total: 10.5, over: -1250, under: 750 },
      { total: 11.5, over: -190, under: 160 },
      { total: 12.5, over: 330, under: -410 }
    ]
  },
  {
    teamId: "KC",
    teamName: "Kansas City Chiefs",
    markets: [
      { total: 8.5, over: -250, under: 210 },
      { total: 9.5, over: 220, under: -270 }
    ]
  },
  {
    teamId: "LV",
    teamName: "Las Vegas Raiders",
    markets: [
      { total: 2.5, over: -210, under: 175 },
      { total: 3.5, over: 280, under: -340 }
    ]
  },
  {
    teamId: "LAC",
    teamName: "Los Angeles Chargers",
    markets: [
      { total: 9.5, over: -750, under: 550 },
      { total: 10.5, over: -135, under: 115 },
      { total: 11.5, over: 320, under: -400 }
    ]
  },
  {
    teamId: "LAR",
    teamName: "Los Angeles Rams",
    markets: [
      { total: 12.5, over: -240, under: 200 },
      { total: 13.5, over: 260, under: -320 }
    ]
  },
  {
    teamId: "MIA",
    teamName: "Miami Dolphins",
    markets: [
      { total: 6.5, over: -600, under: 460 },
      { total: 7.5, over: -110, under: -110 },
      { total: 8.5, over: 380, under: -490 }
    ]
  },
  {
    teamId: "MIN",
    teamName: "Minnesota Vikings",
    markets: [
      { total: 5.5, over: -400, under: 310 },
      { total: 6.5, over: 140, under: -165 },
      { total: 7.5, over: 550, under: -800 }
    ]
  },
  {
    teamId: "NE",
    teamName: "New England Patriots",
    markets: [
      { total: 12.5, over: -450, under: 360 },
      { total: 13.5, over: 110, under: -130 },
      { total: 14.5, over: 550, under: -750 }
    ]
  },
  {
    teamId: "NO",
    teamName: "New Orleans Saints",
    markets: [
      { total: 4.5, over: -165, under: 140 },
      { total: 5.5, over: 250, under: -300 }
    ]
  },
  {
    teamId: "NYG",
    teamName: "New York Giants",
    markets: [
      { total: 3.5, over: -230, under: 190 },
      { total: 4.5, over: 175, under: -210 }
    ]
  },
  {
    teamId: "NYJ",
    teamName: "New York Jets",
    markets: [
      { total: 3.5, over: -210, under: 175 },
      { total: 4.5, over: 300, under: -390 }
    ]
  },
  {
    teamId: "PHI",
    teamName: "Philadelphia Eagles",
    markets: [
      { total: 9.5, over: -1150, under: 650 },
      { total: 10.5, over: -200, under: 170 },
      { total: 11.5, over: 300, under: -370 }
    ]
  },
  {
    teamId: "PIT",
    teamName: "Pittsburgh Steelers",
    markets: [
      { total: 8.5, over: -190, under: 160 },
      { total: 9.5, over: 250, under: -300 }
    ]
  },
  {
    teamId: "SF",
    teamName: "San Francisco 49ers",
    markets: [
      { total: 10.5, over: -700, under: 500 },
      { total: 11.5, over: -130, under: 110 },
      { total: 12.5, over: 440, under: -600 }
    ]
  },
  {
    teamId: "SEA",
    teamName: "Seattle Seahawks",
    markets: [
      { total: 11.5, over: -1050, under: 650 },
      { total: 12.5, over: -165, under: 140 },
      { total: 13.5, over: 350, under: -450 }
    ]
  },
  {
    teamId: "TB",
    teamName: "Tampa Bay Buccaneers",
    markets: [
      { total: 8.5, over: -550, under: 400 },
      { total: 9.5, over: -120, under: 100 },
      { total: 10.5, over: 410, under: -550 }
    ]
  },
  {
    teamId: "TEN",
    teamName: "Tennessee Titans",
    markets: [
      { total: 2.5, over: -200, under: 170 },
      { total: 3.5, over: 350, under: -450 }
    ]
  },
  {
    teamId: "WAS",
    teamName: "Washington Commanders",
    markets: [
      { total: 3.5, over: -400, under: 320 },
      { total: 4.5, over: 135, under: -160 },
      { total: 5.5, over: 550, under: -750 }
    ]
  }
];

// lookups
const MARKET_LOOKUP = {};
const TEAM_NAME_LOOKUP = {};
for (const entry of BET_WIN_TOTALS) {
  const m = {};
  for (const line of entry.markets) {
    m[line.total] = { over: line.over, under: line.under };
  }
  MARKET_LOOKUP[entry.teamId] = m;
  TEAM_NAME_LOOKUP[entry.teamId] = entry.teamName;
}

// -----------------------
// Helpers
// -----------------------

function americanToProb(odds) {
  if (odds == null) return null;
  if (odds > 0) return 100 / (odds + 100);
  return -odds / (-odds + 100);
}

function probToAmerican(probRaw) {
  const p = Math.min(0.9999, Math.max(0.0001, probRaw));
  if (p >= 0.5) {
    return -Math.round((p / (1 - p)) * 100);
  }
  return Math.round(((1 - p) / p) * 100);
}

function formatAmerican(odds) {
  if (!Number.isFinite(odds)) return "";
  return odds > 0 ? `+${odds}` : String(odds);
}

function formatPercent(p, decimals = 2) {
  if (p == null) return "—";
  return (p * 100).toFixed(decimals) + "%";
}

function formatNumber(x, decimals = 2) {
  if (x == null) return "—";
  return x.toFixed(decimals);
}

function evOnStake(odds, p, stake = 100) {
  if (odds == null || p == null) return null;
  let winMult;
  if (odds > 0) {
    winMult = odds / 100;
  } else {
    winMult = 100 / Math.abs(odds);
  }
  const expectedWin = p * winMult * stake;
  const expectedLoss = (1 - p) * stake;
  return expectedWin - expectedLoss;
}

// P(additional wins >= k) from exact[0..4]
function probAdditionalAtLeast(result, k) {
  if (!Array.isArray(result.exact)) return null;
  let sum = 0;
  for (let i = k; i < result.exact.length; i++) sum += result.exact[i];
  return sum;
}

// P(total wins >= line+0.5) == Over(line+0.5)
function probOverLine(result, line) {
  const cur = result.currentWins;
  const exact = result.exact;
  const requiredWins = Math.floor(line) + 1; // Over 9.5 -> >=10
  const minAdditional = requiredWins - cur;
  if (minAdditional <= 0) return 1;
  if (minAdditional > 4) return 0;
  let sum = 0;
  for (let k = minAdditional; k <= 4; k++) sum += exact[k];
  return sum;
}

function probUnderLine(result, line) {
  const cur = result.currentWins;
  const exact = result.exact;
  const maxWins = Math.floor(line); // Under 9.5 -> <=9
  const maxAdditional = maxWins - cur;
  if (maxAdditional < 0) return 0;
  if (maxAdditional >= 4) return 1;
  let sum = 0;
  for (let k = 0; k <= maxAdditional; k++) sum += exact[k];
  return sum;
}

// -----------------------
// Load sim results from localStorage
// -----------------------

function loadSimResults() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.results)) return parsed.results;
    return null;
  } catch (e) {
    console.error("Failed to parse stored state", e);
    return null;
  }
}

// -----------------------
// Build betting rows
// -----------------------

const BET_COLUMNS = [
  { key: "team", label: "Team" },
  { key: "division", label: "Div" },
  { key: "currentWins", label: "Curr W" },

  { key: "edge_ge_1", label: "User – NFL ≥1 W" },
  { key: "ev_ge_1", label: "EV ≥1 W ($100)" },

  { key: "edge_ge_2", label: "User – NFL ≥2 W" },
  { key: "ev_ge_2", label: "EV ≥2 W ($100)" },

  { key: "edge_ge_3", label: "User – NFL ≥3 W" },
  { key: "ev_ge_3", label: "EV ≥3 W ($100)" },

  { key: "edge_ge_4", label: "User – NFL ≥4 W" },
  { key: "ev_ge_4", label: "EV ≥4 W ($100)" },

  { key: "edge_lt_1", label: "User – NFL <1 W" },
  { key: "ev_lt_1", label: "EV <1 W ($100)" },

  { key: "edge_lt_2", label: "User – NFL <2 W" },
  { key: "ev_lt_2", label: "EV <2 W ($100)" },

  { key: "edge_lt_3", label: "User – NFL <3 W" },
  { key: "ev_lt_3", label: "EV <3 W ($100)" },

  { key: "edge_lt_4", label: "User – NFL <4 W" },
  { key: "ev_lt_4", label: "EV <4 W ($100)" }
];

// default visibility
const betVisibleColumns = {
  team: true,
  division: true,
  currentWins: true,
  edge_ge_1: true,
  ev_ge_1: true,
  edge_ge_2: true,
  ev_ge_2: true,
  edge_ge_3: false,
  ev_ge_3: false,
  edge_ge_4: false,
  ev_ge_4: false,
  edge_lt_1: false,
  ev_lt_1: false,
  edge_lt_2: false,
  ev_lt_2: false,
  edge_lt_3: false,
  ev_lt_3: false,
  edge_lt_4: false,
  ev_lt_4: false
};

let currentBetRows = [];
let currentBetViewRows = [];

const betSortState = {
  key: "ev_ge_1",
  direction: "desc"
};

const betFilters = {
  division: "ALL",
  positiveEVOnly: false
};

function buildBettingRows(results) {
  const rows = [];

  for (const r of results) {
    const marketMap = MARKET_LOOKUP[r.teamId];
    if (!marketMap) continue;

    const row = {
      teamId: r.teamId,
      teamName: TEAM_NAME_LOOKUP[r.teamId] || r.teamId,
      division: r.division || "",
      currentWins: r.currentWins ?? 0,
      sim: r // keep full result for detail view
    };

    const ge = {};
    const lt = {};
    for (let k = 1; k <= 4; k++) {
      const pGe = probAdditionalAtLeast(r, k);
      if (pGe != null) {
        ge[k] = pGe;
        lt[k] = 1 - pGe;
      }
    }

    for (let k = 1; k <= 4; k++) {
      const cur = row.currentWins;
      const line = cur + (k - 0.5); // Over(cur + 0.5) == ≥1 more win, etc.
      const market = marketMap[line];
      if (!market) {
        row[`edge_ge_${k}`] = null;
        row[`ev_ge_${k}`] = null;
        row[`edge_lt_${k}`] = null;
        row[`ev_lt_${k}`] = null;
        continue;
      }

      const pModelGe = ge[k];
      const pModelLt = lt[k];

      const pBookGe = americanToProb(market.over);
      const pBookLt = americanToProb(market.under);

      row[`edge_ge_${k}`] =
        pModelGe != null && pBookGe != null ? pModelGe - pBookGe : null;
      row[`ev_ge_${k}`] =
        pModelGe != null && pBookGe != null
          ? evOnStake(market.over, pModelGe, 100)
          : null;

      row[`edge_lt_${k}`] =
        pModelLt != null && pBookLt != null ? pModelLt - pBookLt : null;
      row[`ev_lt_${k}`] =
        pModelLt != null && pBookLt != null
          ? evOnStake(market.under, pModelLt, 100)
          : null;
    }

    rows.push(row);
  }

  return rows;
}

// -----------------------
// Sorting / filtering
// -----------------------

function rowHasPositiveEV(row) {
  const keys = [
    "ev_ge_1",
    "ev_ge_2",
    "ev_ge_3",
    "ev_ge_4",
    "ev_lt_1",
    "ev_lt_2",
    "ev_lt_3",
    "ev_lt_4"
  ];
  return keys.some((k) => row[k] != null && row[k] > 0);
}

function sortValue(row, key) {
  switch (key) {
    case "team":
      return row.teamId;
    case "division":
      return row.division;
    case "currentWins":
      return row.currentWins;
    default:
      return row[key] ?? null;
  }
}

function applyBetFilterAndSort(rows) {
  let res = rows.slice();

  res = res.filter((row) => {
    if (betFilters.division !== "ALL" && row.division !== betFilters.division) {
      return false;
    }
    if (betFilters.positiveEVOnly && !rowHasPositiveEV(row)) {
      return false;
    }
    return true;
  });

  const { key, direction } = betSortState;
  const dir = direction === "asc" ? 1 : -1;

  res.sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);

    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;

    if (typeof va === "string" || typeof vb === "string") {
      return dir * va.localeCompare(vb);
    }
    return dir * (va - vb);
  });

  return res;
}

// -----------------------
// Rendering – betting table + column picker
// -----------------------

function renderBettingTable(rows) {
    const container = document.getElementById("betTableContainer");
    container.innerHTML = "";
  
    if (!rows || !rows.length) {
      const p = document.createElement("p");
      p.className = "section-note";
      p.textContent = "No betting rows available.";
      container.appendChild(p);
      currentBetViewRows = [];
      return;
    }
  
    const viewRows = applyBetFilterAndSort(rows);
    currentBetViewRows = viewRows;
  
    // Find top absolute positive & negative EV across visible rows/columns
    let maxPosEV = null;
    let maxNegEV = null;
  
    for (const row of viewRows) {
      for (const col of BET_COLUMNS) {
        if (!betVisibleColumns[col.key]) continue;
        if (!col.key.startsWith("ev_")) continue;
        const v = row[col.key];
        if (v == null) continue;
  
        if (v > 0 && (!maxPosEV || v > maxPosEV.value)) {
          maxPosEV = { teamId: row.teamId, key: col.key, value: v };
        }
        if (v < 0 && (!maxNegEV || v < maxNegEV.value)) {
          maxNegEV = { teamId: row.teamId, key: col.key, value: v };
        }
      }
    }
  
    const table = document.createElement("table");
    table.className = "table betting-table";
  
    // ----- Header -----
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
  
    for (const col of BET_COLUMNS) {
      if (!betVisibleColumns[col.key]) continue;
  
      const th = document.createElement("th");
      th.classList.add("sortable");
  
      const labelSpan = document.createElement("span");
      labelSpan.textContent = col.label;
  
      const indicator = document.createElement("span");
      indicator.className = "sort-indicator";
      if (betSortState.key === col.key) {
        indicator.textContent = betSortState.direction === "asc" ? "▲" : "▼";
      } else {
        indicator.textContent = "◆";
      }
  
      th.appendChild(labelSpan);
      th.appendChild(indicator);
  
      th.addEventListener("click", () => {
        if (betSortState.key === col.key) {
          betSortState.direction =
            betSortState.direction === "asc" ? "desc" : "asc";
        } else {
          betSortState.key = col.key;
          // strings default asc, numeric data default desc
          betSortState.direction =
            col.key === "team" || col.key === "division" ? "asc" : "desc";
        }
        renderBettingTable(currentBetRows);
      });
  
      headerRow.appendChild(th);
    }
  
    thead.appendChild(headerRow);
    table.appendChild(thead);
  
    // ----- Body -----
    const tbody = document.createElement("tbody");
    let previousDivision = null;
  
    for (const row of viewRows) {
      const tr = document.createElement("tr");
      tr.dataset.teamId = row.teamId;
  
      const palette = teamPalettes[row.teamId] || {};
      tr.style.setProperty("--team-color-main", palette.primary || "#334155");
      tr.style.setProperty("--team-color-alt", palette.secondary || "#64748b");
  
      // Division grouping divider
      if (previousDivision !== null && row.division !== previousDivision) {
        tr.classList.add("division-break");
      }
      previousDivision = row.division;
  
      tr.addEventListener("click", () => {
        showBetDetail(row);
      });
  
      for (const col of BET_COLUMNS) {
        if (!betVisibleColumns[col.key]) continue;
        const td = document.createElement("td");
  
        switch (col.key) {
          case "team": {
            td.className = "team-cell-with-bar";
            td.title = row.teamName || row.teamId;
  
            const bar = document.createElement("span");
            bar.className = "team-color-bar";
  
            const code = document.createElement("span");
            code.className = "team-code";
            code.textContent = row.teamId;
  
            td.appendChild(bar);
            td.appendChild(code);
            break;
          }
  
          case "division": {
            td.innerHTML = `<span class="badge-division">${row.division}</span>`;
            break;
          }
  
          case "currentWins": {
            td.classList.add("numeric-cell");
            td.textContent = row.currentWins.toString();
            break;
          }
  
          default: {
            if (col.key.startsWith("edge_")) {
              // Probability edge: show as muted percentage in parentheses
              td.classList.add("numeric-cell", "percent-cell");
              const v = row[col.key];
              if (v == null) {
                td.textContent = "—";
              } else {
                const pct = formatPercent(v, 2); // can be negative/positive
                td.textContent = `(${pct})`;
              }
            } else if (col.key.startsWith("ev_")) {
              td.classList.add("numeric-cell", "ev-cell");
              const v = row[col.key];
  
              if (v == null) {
                td.textContent = "—";
              } else {
                td.textContent = "$" + formatNumber(v, 2);
  
                if (v > 0) {
                  td.classList.add("ev-positive");
                } else if (v < 0) {
                  td.classList.add("ev-negative");
                }
  
                // Extreme EV highlighting (global max abs pos/neg)
                if (
                  maxPosEV &&
                  maxPosEV.teamId === row.teamId &&
                  maxPosEV.key === col.key
                ) {
                  td.classList.add("ev-extreme-positive");
                }
                if (
                  maxNegEV &&
                  maxNegEV.teamId === row.teamId &&
                  maxNegEV.key === col.key
                ) {
                  td.classList.add("ev-extreme-negative");
                }
              }
            }
            break;
          }
        }
  
        tr.appendChild(td);
      }
  
      tbody.appendChild(tr);
    }
  
    table.appendChild(tbody);
    container.appendChild(table);
  }
  

function renderBetColumnPicker() {
  const picker = document.getElementById("betColumnPicker");
  picker.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "column-picker-grid";

  BET_COLUMNS.forEach((col) => {
    const wrap = document.createElement("label");
    wrap.className = "column-toggle";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!betVisibleColumns[col.key];

    input.addEventListener("change", () => {
      betVisibleColumns[col.key] = input.checked;
      renderBettingTable(currentBetRows);
    });

    const span = document.createElement("span");
    span.textContent = col.label;

    wrap.appendChild(input);
    wrap.appendChild(span);
    grid.appendChild(wrap);
  });

  picker.appendChild(grid);
}

// -----------------------
// Raw markets table
// -----------------------

function renderRawMarketsTable() {
    const container = document.getElementById("rawMarketsContainer");
    container.innerHTML = "";
  
    const table = document.createElement("table");
    // key difference: give this its own class so we can style it like the old design
    table.className = "table raw-markets-table";
  
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["Team", "Total", "Over", "Under"].forEach((h) => {
      const th = document.createElement("th");
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
  
    const tbody = document.createElement("tbody");
  
    for (const entry of BET_WIN_TOTALS) {
      const palette = teamPalettes[entry.teamId] || {};
      for (const m of entry.markets) {
        const tr = document.createElement("tr");
  
        // these CSS vars power the row gradient, just like the old design
        tr.style.setProperty(
          "--team-color-main",
          palette.primary || "#334155"
        );
        tr.style.setProperty(
          "--team-color-alt",
          palette.secondary || "#64748b"
        );
  
        const tdTeam = document.createElement("td");
        tdTeam.className = "team-cell-heat";
        tdTeam.textContent = `${entry.teamId} ${entry.teamName}`;
  
        const tdTotal = document.createElement("td");
        tdTotal.textContent = m.total.toFixed(1);
  
        const tdOver = document.createElement("td");
        tdOver.textContent = (m.over > 0 ? "+" : "") + m.over;
  
        const tdUnder = document.createElement("td");
        tdUnder.textContent = (m.under > 0 ? "+" : "") + m.under;
  
        tr.appendChild(tdTeam);
        tr.appendChild(tdTotal);
        tr.appendChild(tdOver);
        tr.appendChild(tdUnder);
        tbody.appendChild(tr);
      }
    }
  
    table.appendChild(tbody);
    container.appendChild(table);
  }
  
  

// -----------------------
// Detail drawer per team
// -----------------------

function showBetDetail(row) {
  const overlay = document.getElementById("betDetailOverlay");
  const content = document.getElementById("betDetailContent");
  const result = row.sim;
  if (!overlay || !content || !result) return;

  const entry = BET_WIN_TOTALS.find((e) => e.teamId === row.teamId);
  const prettyName = entry ? entry.teamName : row.teamName;

  let html = "";
  html += `<h3>${row.teamId} · ${prettyName}</h3>`;
  html += `<p>Current wins: <strong>${row.currentWins}</strong>, projected wins: <strong>${formatNumber(
    result.projectedWins,
    2
  )}</strong></p>`;

  html += "<h4>Market lines vs your model</h4>";
  html +=
    "<p>Probabilities and EVs assume a $100 stake. EV is net profit (stake not included).</p>";

  html +=
    '<table><thead><tr><th>Total</th><th>Side</th><th>Odds</th><th>Book prob</th><th>Your prob</th><th>Edge</th><th>EV ($100)</th></tr></thead><tbody>';

  if (entry) {
    for (const m of entry.markets) {
      const pOver = probOverLine(result, m.total);
      const pUnder = probUnderLine(result, m.total);

      const pBookOver = americanToProb(m.over);
      const pBookUnder = americanToProb(m.under);

      const edgeOver =
        pOver != null && pBookOver != null ? pOver - pBookOver : null;
      const edgeUnder =
        pUnder != null && pBookUnder != null ? pUnder - pBookUnder : null;

      const evOver = evOnStake(m.over, pOver, 100);
      const evUnder = evOnStake(m.under, pUnder, 100);

      html += `<tr>
        <td rowspan="2">${m.total.toFixed(1)}</td>
        <td>Over</td>
        <td>${formatAmerican(m.over)}</td>
        <td>${formatPercent(pBookOver, 2)}</td>
        <td>${formatPercent(pOver, 2)}</td>
        <td>${edgeOver == null ? "—" : formatPercent(edgeOver, 2)}</td>
        <td>${evOver == null ? "—" : "$" + formatNumber(evOver, 2)}</td>
      </tr>`;

      html += `<tr>
        <td>Under</td>
        <td>${formatAmerican(m.under)}</td>
        <td>${formatPercent(pBookUnder, 2)}</td>
        <td>${formatPercent(pUnder, 2)}</td>
        <td>${edgeUnder == null ? "—" : formatPercent(edgeUnder, 2)}</td>
        <td>${evUnder == null ? "—" : "$" + formatNumber(evUnder, 2)}</td>
      </tr>`;
    }
  }

  html += "</tbody></table>";

  content.innerHTML = html;
  overlay.classList.remove("hidden");
}

// -----------------------
// Export betting table CSV
// -----------------------

function exportBetCsv() {
  if (!currentBetViewRows.length) return;

  const cols = BET_COLUMNS.filter((c) => betVisibleColumns[c.key]);
  const header = cols.map((c) => c.label);

  const rows = [header];

  for (const row of currentBetViewRows) {
    const line = cols.map((c) => {
      const key = c.key;
      if (key === "team") return row.teamId;
      if (key === "division") return row.division || "";
      if (key === "currentWins") return row.currentWins?.toString() ?? "";
      if (key.startsWith("edge_") || key.startsWith("ev_")) {
        const v = row[key];
        return v == null ? "" : v.toFixed(4);
      }
      return "";
    });
    rows.push(line);
  }

  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
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
  a.download = "nfl_betting_edges.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -----------------------
// Init / wiring
// -----------------------

function initBettingPage() {
  const status = document.getElementById("betStatusNote");

  const results = loadSimResults();
  if (!results) {
    status.textContent =
      "No simulation results found in local storage. " +
      "Open index.html, set spreads, then come back here.";
  } else {
    status.textContent =
      "Using saved simulation results from index.html. EVs assume a $100 stake.";
    currentBetRows = buildBettingRows(results);
    renderBetColumnPicker();
    renderBettingTable(currentBetRows);
  }

  renderRawMarketsTable();

  const themeBtn = document.getElementById("betThemeToggle");
  themeBtn.addEventListener("click", () => {
    const body = document.body;
    const isDark = body.classList.contains("theme-dark");
    body.classList.toggle("theme-dark", !isDark);
    body.classList.toggle("theme-light", isDark);
    themeBtn.textContent = isDark
      ? "Switch to Dark Theme"
      : "Switch to Light Theme";
  });

  const backBtn = document.getElementById("betBackBtn");
  backBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  const reloadBtn = document.getElementById("betReloadBtn");
  reloadBtn.addEventListener("click", () => {
    const res = loadSimResults();
    if (!res) {
      status.textContent =
        "Still no simulation results in storage. Re-run index.html.";
      return;
    }
    status.textContent = "Simulation results reloaded.";
    currentBetRows = buildBettingRows(res);
    renderBettingTable(currentBetRows);
  });

  const colBtn = document.getElementById("betToggleColumnPicker");
  colBtn.addEventListener("click", () => {
    const picker = document.getElementById("betColumnPicker");
    picker.classList.toggle("hidden");
  });

  const divFilter = document.getElementById("betDivisionFilter");
  divFilter.addEventListener("change", (e) => {
    betFilters.division = e.target.value;
    renderBettingTable(currentBetRows);
  });

  const posFilter = document.getElementById("betPositiveEVOnly");
  posFilter.addEventListener("change", (e) => {
    betFilters.positiveEVOnly = e.target.checked;
    renderBettingTable(currentBetRows);
  });

  const exportBtn = document.getElementById("betExportBtn");
  exportBtn.addEventListener("click", () => {
    exportBetCsv();
  });

  const overlay = document.getElementById("betDetailOverlay");
  const closeBtn = document.getElementById("betDetailClose");
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.add("hidden");
    }
  });
  closeBtn.addEventListener("click", () => {
    overlay.classList.add("hidden");
  });
}

document.addEventListener("DOMContentLoaded", initBettingPage);
