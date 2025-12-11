// schedule_view.js
// ------------------------------------------------------------
// Games tab: filters, schedule rendering, spread editing,
// and per-game probability display.
// ------------------------------------------------------------
//
// Depends on globals defined elsewhere:
//   - teams, games, teamPalettes, NEUTRAL_SPREAD
//   - state, teamIds, spreadBandValues
//   - STORAGE_KEY, TABLE_HEADERS
//   - favoriteProbFromAbsSpread, homeWinProbFromSpread
//   - formatPercent, formatAmerican, probToAmerican
//   - saveStateToStorage, updateProgressUI
//   - computeAndRenderResults (from projections_view.js)

// ---------------------------
// Filtering
// ---------------------------

function gameMatchesFilters(game) {
    const { filterWeek, filterTeam, filterDivision, filterPickStatus } = state;
  
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
  
    // Pick-status filter (based on whether a spread is set)
    const hasSpread = typeof state.spreads[String(game.id)] === "number";
  
    if (filterPickStatus === "PICKED" && !hasSpread) return false;
    if (filterPickStatus === "UNPICKED" && hasSpread) return false;
  
    return true;
  }
  
  // Populate filters and wire them to state
  function initScheduleFilters() {
    const weekSelect = document.getElementById("filterWeek");
    const teamSelect = document.getElementById("filterTeam");
    const divisionSelect = document.getElementById("filterDivision");
    const pickSelect = document.getElementById("filterPickStatus");
    if (!weekSelect || !teamSelect || !divisionSelect || !pickSelect) return;
  
    // Weeks
    const weeks = [...new Set(games.map((g) => g.week))].sort((a, b) => a - b);
    weekSelect.innerHTML = "";
    let opt = document.createElement("option");
    opt.value = "ALL";
    opt.textContent = "All weeks";
    weekSelect.appendChild(opt);
    weeks.forEach((w) => {
      const o = document.createElement("option");
      o.value = String(w);
      o.textContent = `Week ${w}`;
      weekSelect.appendChild(o);
    });
    weekSelect.value = state.filterWeek === "ALL" ? "ALL" : String(state.filterWeek);
  
    // Teams
    teamSelect.innerHTML = "";
    opt = document.createElement("option");
    opt.value = "ALL";
    opt.textContent = "All teams";
    teamSelect.appendChild(opt);
    teamIds.forEach((id) => {
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
    const divisions = [...new Set(Object.values(teams).map((t) => t.division))].sort();
    divisions.forEach((d) => {
      const o = document.createElement("option");
      o.value = d;
      o.textContent = d;
      divisionSelect.appendChild(o);
    });
    divisionSelect.value = state.filterDivision || "ALL";
  
    // Pick status
    pickSelect.innerHTML = "";
    [
      { value: "ALL", label: "All games" },
      { value: "UNPICKED", label: "Only unpicked" },
      { value: "PICKED", label: "Only picked" },
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
      state.filterTeam = e.target.value;
      saveStateToStorage();
      renderSchedule();
    });
  
    divisionSelect.addEventListener("change", (e) => {
      state.filterDivision = e.target.value;
      saveStateToStorage();
      renderSchedule();
    });
  
    pickSelect.addEventListener("change", (e) => {
      state.filterPickStatus = e.target.value;
      saveStateToStorage();
      renderSchedule();
    });
  }
  
  // ---------------------------
  // Scroll + rehydration helpers
  // ---------------------------
  
  // Scroll back to last interacted game (or first with a spread)
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
  
    const card = document.querySelector(`.game-card[data-game-id="${targetId}"]`);
    if (!card) return;
  
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  
  // After the schedule is (re)rendered, re-apply all saved lines
  function rehydratePickedLinesIntoCards() {
    if (!state.spreads) return;
  
    for (const [gameId, spread] of Object.entries(state.spreads)) {
      if (typeof spread === "number" && Number.isFinite(spread)) {
        // No-op if that card isn't currently in the DOM
        updateGameCardDisplay(gameId);
      }
    }
  }
  
  // ---------------------------
  // Schedule rendering
  // ---------------------------
  
  function renderSchedule() {
    const container = document.getElementById("scheduleContainer");
    if (!container) return;
  
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
  
        // Optional: hover-expanded class for CSS transitions
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
  
        // Build spread buttons (reversed so big negatives are near home side)
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
  
        // Ensure the newly rendered card matches stored state
        updateGameCardDisplay(game.id);
      }
  
      weekBlock.appendChild(list);
      container.appendChild(weekBlock);
    }
  
    // Rehydrate any previously picked lines into the freshly rendered cards
    rehydratePickedLinesIntoCards();
  
    // After all weeks are rendered, jump back to the last game you touched
    scrollToLastFocusedGame();
  }
  
  // ---------------------------
  // Spread updates
  // ---------------------------
  
  function setSpreadForGame(gameId, spreadValue) {
    state.spreads[String(gameId)] = spreadValue;
    state.lastFocusedGameId = gameId;
  
    updateGameCardDisplay(gameId);
    saveStateToStorage();
    computeAndRenderResults();
    updateProgressUI();
  }
  
  // Update one game card (selected spread text + probabilities)
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
  
    if (!game) {
      selectedProbSpan.textContent = "—";
      return;
    }
  
    const precision = state.precision;
    const effectiveSpread =
      spread === null ? NEUTRAL_SPREAD : spread; // neutral if none picked
  
    const effectiveHomeProb = homeWinProbFromSpread(effectiveSpread);
    const effectiveAwayProb = 1 - effectiveHomeProb;
  
    const homeLabel = `${game.home} ${formatPercent(
      effectiveHomeProb,
      precision
    )}`;
    const awayLabel = `${game.away} ${formatPercent(
      effectiveAwayProb,
      precision
    )}`;
  
    let text = `${homeLabel} · ${awayLabel}`;
  
    if (state.showImpliedOdds) {
      const homeOdds = formatAmerican(probToAmerican(effectiveHomeProb));
      const awayOdds = formatAmerican(probToAmerican(effectiveAwayProb));
      text += `  |  ${homeOdds} / ${awayOdds}`;
    }
  
    selectedProbSpan.textContent = text;
  }
  
  // Fill neutral spread for all games that don't have one
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
  