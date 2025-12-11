// shared.js – common globals for NFL Win Projection Tool
// ------------------------------------------------------

// Local storage keys
const STORAGE_KEY = "nflWinProjectionState";
const DISPLAY_MODE_KEY = "nflDisplayMode";

// Display mode (desktop / mobile)
let displayMode = "desktop";

const NEUTRAL_SPREAD = -0.5; // gives 0.5000 for home team
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

// -------- Shared helpers --------

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

function applyDisplayMode() {
    const body = document.body;
    body.classList.toggle("mode-mobile", displayMode === "mobile");
    body.classList.toggle("mode-desktop", displayMode !== "mobile");
  
    const btn =
      document.getElementById("mainDisplayModeToggle") ||
      document.getElementById("betDisplayModeToggle"); // fallback for old id
  
    if (btn) {
      btn.textContent =
        displayMode === "mobile"
          ? "Switch to Desktop View"
          : "Switch to Mobile View";
    }
  }
  

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

// Result-level helper: does this team have any non-coinflip games?
function resultHasAnyPickedGame(result) {
    if (!Array.isArray(result.probs) || !result.probs.length) return false;
    return result.probs.some((p) => Math.abs(p - 0.5) > 1e-6);
  }
  
