// betting.js – win totals betting table for NFL Win Projection Tool
// ------------------------------------------------------------

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
// Helpers (betting-specific)
// -----------------------

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
// Load sim state from localStorage
// -----------------------

function loadSimState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.results)) return null;
    return parsed; // full state: theme, mode, results, etc.
  } catch (e) {
    console.error("Failed to parse stored state", e);
    return null;
  }
}

// -----------------------
// Columns / global state
// -----------------------

const BET_COLUMNS = [
  { key: "team",        label: "Team" },
  { key: "division",    label: "Div" },
  { key: "currentWins", label: "Curr W" },

  { key: "edge_ge_1",   label: "User – NFL ≥1 W" },
  { key: "ev_ge_1",     label: "EV ≥1 W ($100)" },

  { key: "edge_ge_2",   label: "User – NFL ≥2 W" },
  { key: "ev_ge_2",     label: "EV ≥2 W ($100)" },

  { key: "edge_ge_3",   label: "User – NFL ≥3 W" },
  { key: "ev_ge_3",     label: "EV ≥3 W ($100)" },

  { key: "edge_ge_4",   label: "User – NFL ≥4 W" },
  { key: "ev_ge_4",     label: "EV ≥4 W ($100)" },

  { key: "edge_lt_1",   label: "User – NFL <1 W" },
  { key: "ev_lt_1",     label: "EV <1 W ($100)" },

  { key: "edge_lt_2",   label: "User – NFL <2 W" },
  { key: "ev_lt_2",     label: "EV <2 W ($100)" },

  { key: "edge_lt_3",   label: "User – NFL <3 W" },
  { key: "ev_lt_3",     label: "EV <3 W ($100)" },

  { key: "edge_lt_4",   label: "User – NFL <4 W" },
  { key: "ev_lt_4",     label: "EV <4 W ($100)" }
];

// default visibility (used as base, then adjusted per mode)
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
  positiveEVOnly: false,
  minEV: 0,        // minimum EV in dollars
  minEdgeAbs: 0    // minimum absolute edge (0–1) – user inputs %
};

// Fan/pro mode on betting tab (mirrors main app)
let betMode = "fan"; // "fan" or "pro"

// Bankroll + Kelly
const betSettings = {
  bankroll: 1000,
  kellyFraction: 0.25 // 0–1
};

// -----------------------
// Build betting rows
// -----------------------

function buildBettingRows(results) {
  const rows = [];

  for (const r of results) {
    // skip teams whose games haven't been picked at all
    if (!resultHasAnyPickedGame(r)) continue;

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

    // Build per-k edges / EVs
    for (let k = 1; k <= 4; k++) {
      const cur = row.currentWins;
      const line = cur + (k - 0.5); // Over(cur+0.5) == ≥1 more win, etc.
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

    // min EV filter (any side with EV >= threshold)
    if (betFilters.minEV > 0) {
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
      const hasEV = keys.some(
        (k) => row[k] != null && row[k] >= betFilters.minEV
      );
      if (!hasEV) return false;
    }

    // min absolute edge filter
    if (betFilters.minEdgeAbs > 0) {
      const keys = [
        "edge_ge_1",
        "edge_ge_2",
        "edge_ge_3",
        "edge_ge_4",
        "edge_lt_1",
        "edge_lt_2",
        "edge_lt_3",
        "edge_lt_4"
      ];
      const hasEdge = keys.some(
        (k) => row[k] != null && Math.abs(row[k]) >= betFilters.minEdgeAbs
      );
      if (!hasEdge) return false;
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
  if (!container) return;

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
            td.classList.add("numeric-cell", "percent-cell");
            const v = row[col.key];
            if (v == null) {
              td.textContent = "—";
            } else {
              const pct = formatPercent(v, 2);
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
  if (!picker) return;
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
  if (!container) return;
  container.innerHTML = "";

  const table = document.createElement("table");
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
// Kelly stake helper
// -----------------------

function kellyStake(odds, pModel, bankroll, kellyFraction) {
  if (odds == null || pModel == null) return 0;
  const p = pModel;
  const q = 1 - p;

  let b;
  if (odds > 0) {
    b = odds / 100;
  } else {
    b = 100 / Math.abs(odds);
  }

  const frac = (b * p - q) / b;
  if (frac <= 0) return 0;

  const baseKellyStake = frac * bankroll;
  return baseKellyStake * kellyFraction;
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

  html += `<p class="bet-detail-note">Probabilities and EVs assume a $100 stake. EV is net profit (stake not included).</p>`;
  html += `<p class="bet-detail-note">Bankroll: <strong>$${betSettings.bankroll.toFixed(
    0
  )}</strong>, Kelly fraction: <strong>${(
    betSettings.kellyFraction * 100
  ).toFixed(0)}%</strong>.</p>`;

  html +=
    '<table class="bet-detail-table"><thead><tr><th>Total</th><th>Side</th><th>Odds</th><th>Book prob</th><th>Your prob</th><th>Edge</th><th>EV ($100)</th><th>Kelly stake</th></tr></thead><tbody>';

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

      const kStakeOver =
        edgeOver != null
          ? kellyStake(
              m.over,
              pOver,
              betSettings.bankroll,
              betSettings.kellyFraction
            )
          : 0;
      const kStakeUnder =
        edgeUnder != null
          ? kellyStake(
              m.under,
              pUnder,
              betSettings.bankroll,
              betSettings.kellyFraction
            )
          : 0;

      html += `<tr>
        <td rowspan="2">${m.total.toFixed(1)}</td>
        <td>Over</td>
        <td>${formatAmerican(m.over)}</td>
        <td>${formatPercent(pBookOver, 2)}</td>
        <td>${formatPercent(pOver, 2)}</td>
        <td>${edgeOver == null ? "—" : formatPercent(edgeOver, 2)}</td>
        <td>${evOver == null ? "—" : "$" + formatNumber(evOver, 2)}</td>
        <td>${kStakeOver <= 0 ? "—" : "$" + formatNumber(kStakeOver, 2)}</td>
      </tr>`;

      html += `<tr>
        <td>Under</td>
        <td>${formatAmerican(m.under)}</td>
        <td>${formatPercent(pBookUnder, 2)}</td>
        <td>${formatPercent(pUnder, 2)}</td>
        <td>${edgeUnder == null ? "—" : formatPercent(edgeUnder, 2)}</td>
        <td>${evUnder == null ? "—" : "$" + formatNumber(evUnder, 2)}</td>
        <td>${kStakeUnder <= 0 ? "—" : "$" + formatNumber(kStakeUnder, 2)}</td>
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
// Mode handling (Fan / Pro)
// -----------------------

function applyBetMode() {
  const body = document.body;
  const btn = document.getElementById("betModeToggle");

  body.classList.toggle("mode-fan", betMode === "fan");
  body.classList.toggle("mode-pro", betMode === "pro");

  if (btn) {
    btn.textContent =
      betMode === "fan" ? "Switch to Pro Mode" : "Switch to Fan Mode";
  }

  if (betMode === "fan") {
    betVisibleColumns.team = true;
    betVisibleColumns.division = true;
    betVisibleColumns.currentWins = true;

    betVisibleColumns.edge_ge_1 = false;
    betVisibleColumns.ev_ge_1 = true;

    betVisibleColumns.edge_ge_2 = false;
    betVisibleColumns.ev_ge_2 = true;

    betVisibleColumns.edge_ge_3 = false;
    betVisibleColumns.ev_ge_3 = false;
    betVisibleColumns.edge_ge_4 = false;
    betVisibleColumns.ev_ge_4 = false;

    betVisibleColumns.edge_lt_1 = false;
    betVisibleColumns.ev_lt_1 = false;
    betVisibleColumns.edge_lt_2 = false;
    betVisibleColumns.ev_lt_2 = false;
    betVisibleColumns.edge_lt_3 = false;
    betVisibleColumns.ev_lt_3 = false;
    betVisibleColumns.edge_lt_4 = false;
    betVisibleColumns.ev_lt_4 = false;
  } else {
    // Pro mode: don't hide anything by default
    BET_COLUMNS.forEach((c) => {
      if (!(c.key in betVisibleColumns)) {
        betVisibleColumns[c.key] = true;
      }
    });
  }

  renderBetColumnPicker();
  renderBettingTable(currentBetRows);
}

// -----------------------
// Refresh helper (callable from main app)
// -----------------------

function refreshBettingFromStorage() {
  const status = document.getElementById("betStatusNote");
  const simState = loadSimState();
  const results = Array.isArray(simState?.results) ? simState.results : null;

  // Treat "no state" OR "empty results array" as "no sims yet"
  if (!results || results.length === 0) {
    if (status) {
      status.textContent =
        "No simulation results found yet. Set some spreads on the Games tab and run projections to unlock betting edges.";
    }
    currentBetRows = [];
    renderBetColumnPicker();
    renderBettingTable(currentBetRows);
    return;
  }

  if (status) {
    status.textContent =
      "Using your latest saved projections. EVs assume a $100 stake.";
  }

  currentBetRows = buildBettingRows(results);
  renderBetColumnPicker();
  renderBettingTable(currentBetRows);

  // Theme / mode from main app, if present
  const body = document.body;
  const initialTheme = simState?.theme === "light" ? "light" : "dark";
  body.classList.toggle("theme-dark", initialTheme === "dark");
  body.classList.toggle("theme-light", initialTheme === "light");

  if (simState?.mode === "pro" || simState?.mode === "fan") {
    betMode = simState.mode;
  }
  applyBetMode();
}

// expose so projections_view / ui_shell can call after running projections
window.refreshBettingFromStorage = refreshBettingFromStorage;

// -----------------------
// Init / wiring
// -----------------------

let bettingInitialized = false;

function initBettingPage() {
  if (bettingInitialized) return;
  bettingInitialized = true;

  // --- Display mode (desktop / mobile) ---

  if (typeof loadDisplayMode === "function") {
    loadDisplayMode();
  }

  if (!localStorage.getItem(DISPLAY_MODE_KEY)) {
    if (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) {
      // eslint-disable-next-line no-undef
      displayMode = "mobile";
    }
  }

  if (typeof applyDisplayMode === "function") {
    applyDisplayMode();
  }

  // Initial data load
  refreshBettingFromStorage();
  renderRawMarketsTable();

  const body = document.body;

  // THEME TOGGLE (legacy – optional, may not exist)
  const themeBtn = document.getElementById("betThemeToggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const isDark = body.classList.contains("theme-dark");
      body.classList.toggle("theme-dark", !isDark);
      body.classList.toggle("theme-light", isDark);
      themeBtn.textContent = isDark
        ? "Switch to Dark Theme"
        : "Switch to Light Theme";
    });
  }

  // DISPLAY MODE TOGGLE (Desktop / Mobile) – legacy
  const displayModeBtn = document.getElementById("betDisplayModeToggle");
  if (displayModeBtn) {
    displayModeBtn.addEventListener("click", () => {
      // eslint-disable-next-line no-undef
      displayMode = displayMode === "mobile" ? "desktop" : "mobile";
      if (typeof saveDisplayMode === "function") {
        saveDisplayMode();
      }
      if (typeof applyDisplayMode === "function") {
        applyDisplayMode();
      }
    });
  }

  // Back button (legacy one-page betting.html) – safe no-op on index.html
  const backBtn = document.getElementById("betBackBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      document.body.dataset.tab = "games";
    });
  }

  const reloadBtn = document.getElementById("betReloadBtn");
  if (reloadBtn) {
    reloadBtn.addEventListener("click", () => {
      refreshBettingFromStorage();
    });
  }

  const colBtn = document.getElementById("betToggleColumns");
  if (colBtn) {
    colBtn.addEventListener("click", () => {
      const picker = document.getElementById("betColumnPicker");
      if (!picker) return;
      picker.classList.toggle("hidden");
    });
  }

  const divFilter = document.getElementById("betDivisionFilter");
  if (divFilter) {
    divFilter.addEventListener("change", (e) => {
      betFilters.division = e.target.value;
      renderBettingTable(currentBetRows);
    });
  }

  const posFilter = document.getElementById("betPositiveEVOnly");
  if (posFilter) {
    posFilter.addEventListener("change", (e) => {
      betFilters.positiveEVOnly = e.target.checked;
      renderBettingTable(currentBetRows);
    });
  }

  const minEVInput = document.getElementById("betMinEV");
  if (minEVInput) {
    minEVInput.addEventListener("input", (e) => {
      const v = parseFloat(e.target.value);
      betFilters.minEV = Number.isFinite(v) && v > 0 ? v : 0;
      renderBettingTable(currentBetRows);
    });
  }

  const minEdgeInput = document.getElementById("betMinEdge");
  if (minEdgeInput) {
    minEdgeInput.addEventListener("input", (e) => {
      const v = parseFloat(e.target.value);
      betFilters.minEdgeAbs = Number.isFinite(v) && v > 0 ? v / 100 : 0;
      renderBettingTable(currentBetRows);
    });
  }

  const betModeBtn = document.getElementById("betModeToggle");
  if (betModeBtn) {
    betModeBtn.addEventListener("click", () => {
      betMode = betMode === "fan" ? "pro" : "fan";
      applyBetMode();
    });
  }

  const bankrollInput = document.getElementById("betBankroll");
  if (bankrollInput) {
    bankrollInput.value = betSettings.bankroll.toString();
    bankrollInput.addEventListener("input", (e) => {
      const v = parseFloat(e.target.value);
      if (Number.isFinite(v) && v > 0) {
        betSettings.bankroll = v;
      }
    });
  }

  const kellyInput = document.getElementById("betKellyFraction");
  if (kellyInput) {
    kellyInput.value = (betSettings.kellyFraction * 100).toString();
    kellyInput.addEventListener("input", (e) => {
      const v = parseFloat(e.target.value);
      if (Number.isFinite(v) && v >= 0 && v <= 100) {
        betSettings.kellyFraction = v / 100;
      }
    });
  }

  const exportBtn = document.getElementById("betExportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportBetCsv();
    });
  }

  const overlay = document.getElementById("betDetailOverlay");
  const closeBtn = document.getElementById("betDetailClose");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.add("hidden");
      }
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      const ol = document.getElementById("betDetailOverlay");
      if (ol) ol.classList.add("hidden");
    });
  }

  // ---- NEW: keep betting tab in sync with "Reset All Spreads" and tab switches ----

  // When user clicks Reset All Spreads in the More menu, the main app
  // clears state and saves to localStorage. We refresh *after* that happens.
  const globalResetBtn = document.getElementById("resetStateBtn");
  if (globalResetBtn) {
    globalResetBtn.addEventListener("click", () => {
      // Defer so ui_shell's click handler runs first and updates localStorage.
      setTimeout(() => {
        refreshBettingFromStorage();
      }, 0);
    });
  }

  // When user switches to the Betting tab, re-read latest sims from storage.
  const bettingTabBtn = document.querySelector(
    ".bottom-nav-item[data-tab='betting']"
  );
  if (bettingTabBtn) {
    bettingTabBtn.addEventListener("click", () => {
      refreshBettingFromStorage();
    });
  }
}

document.addEventListener("DOMContentLoaded", initBettingPage);
