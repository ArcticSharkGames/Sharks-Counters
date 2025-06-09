import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { defaultBasicCounterConfigs, basicCounterConfigs, loadBasicCounterConfigs } from "./defaultCounters";
import { createScoreboardIfNotExists, getScoreSafe } from "./main";
import { loadAdminConfig } from "./adminSettings";


// Default configuration for the Player Menu
const defaultPlayerMenuConfigs = {
  playerMenuEnabled: true,
  personalStatsButton: true,
  globalStatsButton: true,
  personalStatsCurrency: true,
  personalStatsKills: true,
  peronalStatsDeaths: true,
  personalStatsKillCoins: true,
  personalStatsKDR: true,
  personalStatsMonsterKills: true,
  personalStatsMobKills: true,
  personalStatsBlocksBroken: true,
  personalStatsBlocksPlaced: true,
  personalStatsBPR: true,
  personalStatsTimePlayed: true,
  personalStatsDistanceTraveled: true,
  personalStatsChestsOpened: true,
  personalStatsTimesJoined: true,
  globalStatsKills: true,
  globalStatsDeaths: true,
  globalStatsKillCoins: true,
  globalStatsMonsterKills: true,
  globalStatsMobKills: true,  
  globalStatsBlocksBroken: true,
  globalStatsBlocksPlaced: true,
  globalStatsDistanceTraveled: true,
  globalStatsTimePlayed: true,
  globalStatsChestsOpened: true,
  globalStatsTimesJoined: true,
  globalStatsTotalPlayers: true,
  leaderBoardButton: true,
  leaderBoardlimit: 10,
  leaderBoardStatsKills: true,
  leaderBoardStatsDeaths: true,
  leaderBoardStatsKillCoins: true,
  leaderBoardStatsMonsterKills: true,
  leaderBoardStatsMobKills: true,
  leaderBoardStatsBlocksBroken: true,
  leaderBoardStatsBlocksPlaced: true,
  leaderBoardStatsDistanceTraveled: true,
  leaderBoardStatsTimePlayed: true,
  leaderBoardStatsChestsOpened: true,
  leaderBoardStatsTimesJoined: true,
  customLeaderBoardObjectives: [],
  customPersonalStatsObjectives: [],
};


let playerMenuConfigs = { ...defaultPlayerMenuConfigs };



export function savePlayerMenuConfigs() {
  try {
    const serialized = JSON.stringify(playerMenuConfigs);
    world.setDynamicProperty("playerMenuConfigs", serialized);
  } catch (e) {
    console.warn(`Failed to save playerMenuConfigs: ${e}`);
  }
}

// Load from World‐level dynamic property (merging with defaults)
export function loadPlayerMenuConfigs() {
  const raw = world.getDynamicProperty("playerMenuConfigs");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      // Merge parsed values on top of defaults
      playerMenuConfigs = { ...defaultPlayerMenuConfigs, ...parsed };
    } catch (e) {
      console.warn(`Corrupt playerMenuConfigs data; loading defaults. Error: ${e}`);
      playerMenuConfigs = { ...defaultPlayerMenuConfigs };
    }
  } else {
    // No saved data yet → use defaults
    playerMenuConfigs = { ...defaultPlayerMenuConfigs };
  }
}

function applyGlobalFormat(line) {
  const globalFmt = (basicCounterConfigs.globalActionBarFormat || "").trim();
  return globalFmt.length === 1 ? `§${globalFmt}${line}` : line;
}

//--------------------------------Player Main Menu-----------------------------------


export function playerMenu(player) {
  loadPlayerMenuConfigs();
  if (!playerMenuConfigs.playerMenuEnabled) return;

  const form = new ActionFormData()
    .title("Player Menu")
    .body("Select an option:");

  // Map each enabled feature to its button index
  const buttonIndices = {};
  let idx = 0;

  if (playerMenuConfigs.personalStatsButton) {
    form.button("Personal Stats");
    buttonIndices.personalStats = idx++;
  }
  if (playerMenuConfigs.globalStatsButton) {
    form.button("Global Stats");
    buttonIndices.globalStats = idx++;
  }
  if (playerMenuConfigs.leaderBoardButton) {
    form.button("Leaderboards");
    buttonIndices.leaderboard = idx++;
  }

  form.show(player).then(response => {
    if (response.canceled) return;

    const sel = response.selection;
    if (sel === buttonIndices.personalStats) {
      personalStatsMenu(player);
    } else if (sel === buttonIndices.globalStats) {
      showGlobalStatsMenu(player);
    } else if (sel === buttonIndices.leaderboard) {
      showLeaderboardMenu(player);
    }
  }).catch(() => {
    // ignore
  });
}


//---------------------Player Menu Setting Menu------------------
export function playerMenuManager(player) {
  loadPlayerMenuConfigs();

  const form = new ActionFormData()
    .title("Player Menu Manager")
    .body("Choose an admin configuration to edit:")
    .button("Edit Personal Stats")
    .button("Edit Global Stats")
    .button("Edit Leaderboards")
    .button("Close");

  form.show(player).then((response) => {
    if (response.canceled) return;

    switch (response.selection) {
      case 0:
        // Open the Personal Stats config menu
        adminPersonalStatsConfigMenu(player);
        break;
      case 1:
        adminGlobalStatsConfigMenu(player);
        break;
      case 2:
        adminLeaderboardConfigMenu(player)
        break;
      default:
        // Close or do nothing
        break;
    }
  });
}


//----------------------Personal Stats Menu----------------------


export function personalStatsMenu(player) {
  loadPlayerMenuConfigs();
  if (!playerMenuConfigs.personalStatsButton) return;

  const lines = [];
  const cfg = playerMenuConfigs;
  const globalFmt = (basicCounterConfigs.globalActionBarFormat ?? "").toString().trim();

  // ─── Currency (using basicCounterConfigs.currencyObjectiveName) ───
  if (cfg.personalStatsCurrency) {
    const curObjName = basicCounterConfigs.currencyObjectiveName;
    const curDisplayName = curObjName
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const curObj = createScoreboardIfNotExists(curObjName, curDisplayName);
    const curScore = getScoreSafe(player, curObj.id) || 0;
    const fmt = (basicCounterConfigs.currencyActionBarFormat ?? "").toString().trim();
    const prefix = fmt.length === 1 ? `§${fmt}` : "";
    let line = `${prefix}${curDisplayName}: ${curScore}`;
    if (globalFmt.length === 1) line = `§${globalFmt}${line}`;
    lines.push(line);
  }

  // ─── Kills ───────────────────────────────────────────────────────────
  if (cfg.personalStatsKills) {
    const killObj = createScoreboardIfNotExists("kills", "Kills");
    const killScore = getScoreSafe(player, killObj.id) || 0;
    const fmt = (basicCounterConfigs.pvpActionBarFormat ?? "").toString().trim();
    const prefix = fmt.length === 1 ? `§${fmt}` : "";
    let line = `${prefix}Kills: ${killScore}`;
    if (globalFmt.length === 1) line = `§${globalFmt}${line}`;
    lines.push(line);
  }

  // ─── Deaths ──────────────────────────────────────────────────────────
  if (cfg.personalStatsDeaths) {
    const deathObj = createScoreboardIfNotExists("deaths", "Deaths");
    const deathScore = getScoreSafe(player, deathObj.id) || 0;
    const fmt = (basicCounterConfigs.deathActionBarFormat ?? "").toString().trim();
    const prefix = fmt.length === 1 ? `§${fmt}` : "";
    let line = `${prefix}Deaths: ${deathScore}`;
    if (globalFmt.length === 1) line = `§${globalFmt}${line}`;
    lines.push(line);
  }

  // ─── Kill Coins ──────────────────────────────────────────────────────
  if (cfg.personalStatsKillCoins) {
    const kcObj = createScoreboardIfNotExists("kill_coins", "Kill Coins");
    const kcScore = getScoreSafe(player, kcObj.id) || 0;
    const fmt = (basicCounterConfigs.killCoinsActionBarFormat ?? "").toString().trim();
    const prefix = fmt.length === 1 ? `§${fmt}` : "";
    let line = `${prefix}Kill Coins: ${kcScore}`;
    if (globalFmt.length === 1) line = `§${globalFmt}${line}`;
    lines.push(line);
  }

  // ─── KDR ───────────────────────────────────────────────────────────────
  if (cfg.personalStatsKDR) {
    const killObj = createScoreboardIfNotExists("kills", "Kills");
    const deathObj = createScoreboardIfNotExists("deaths", "Deaths");
    const k = getScoreSafe(player, killObj.id) || 0;
    const d = getScoreSafe(player, deathObj.id) || 0;
    const ratio = d > 0 ? (k / d).toFixed(2) : k;
    const fmt = (basicCounterConfigs.defaultKDRatioFormat ?? "").toString().trim();
    const prefix = fmt.length === 1 ? `§${fmt}` : "";
    let line = `${prefix}Kill/Death Ratio: ${ratio}`;
    if (globalFmt.length === 1) line = `§${globalFmt}${line}`;
    lines.push(line);
  }

  // ─── Monster Kills ───────────────────────────────────────────────────
  if (cfg.personalStatsMonsterKills) {
    const monObj = createScoreboardIfNotExists("monster_kills", "Monster Kills");
    const monScore = getScoreSafe(player, monObj.id) || 0;
    const fmt = (basicCounterConfigs.monsterActionBarFormat ?? "").toString().trim();
    const prefix = fmt.length === 1 ? `§${fmt}` : "";
    let line = `${prefix}Monster Kills: ${monScore}`;
    if (globalFmt.length === 1) line = `§${globalFmt}${line}`;
    lines.push(line);
  }

  // ─── Mob Kills ───────────────────────────────────────────────────────
  if (cfg.personalStatsMobKills) {
    const mobObj = createScoreboardIfNotExists("mob_kills", "Mob Kills");
    const mobScore = getScoreSafe(player, mobObj.id) || 0;
    const fmt = (basicCounterConfigs.mobsActionBarFormat ?? "").toString().trim();
    const prefix = fmt.length === 1 ? `§${fmt}` : "";
    let line = `${prefix}Mob Kills: ${mobScore}`;
    if (globalFmt.length === 1) line = `§${globalFmt}${line}`;
    lines.push(line);
  }

  // ─── Blocks Broken ───────────────────────────────────────────────────
  if (cfg.personalStatsBlocksBroken) {
    const bbObj = createScoreboardIfNotExists("blocks_broken", "Blocks Broken");
    const bbScore = getScoreSafe(player, bbObj.id) || 0;
    const fmt = (basicCounterConfigs.blocksBrokenActionBarFormat ?? "").toString().trim();
    const prefix = fmt.length === 1 ? `§${fmt}` : "";
    let line = `${prefix}Blocks Broken: ${bbScore}`;
    if (globalFmt.length === 1) line = `§${globalFmt}${line}`;
    lines.push(line);
  }

  // ─── Blocks Placed ───────────────────────────────────────────────────
  if (cfg.personalStatsBlocksPlaced) {
    const bpObj = createScoreboardIfNotExists("blocks_placed", "Blocks Placed");
    const bpScore = getScoreSafe(player, bpObj.id) || 0;
    const fmt = (basicCounterConfigs.blocksPlacedActionBarFormat ?? "").toString().trim();
    const prefix = fmt.length === 1 ? `§${fmt}` : "";
    let line = `${prefix}Blocks Placed: ${bpScore}`;
    if (globalFmt.length === 1) line = `§${globalFmt}${line}`;
    lines.push(line);
  }

  // ─── BPR (Placed per Broken) ────────────────────────────────────────
  if (cfg.personalStatsBPR) {
    const bbObj = createScoreboardIfNotExists("blocks_broken", "Blocks Broken");
    const bpObj = createScoreboardIfNotExists("blocks_placed", "Blocks Placed");
    const bb = getScoreSafe(player, bbObj.id) || 0;
    const bp = getScoreSafe(player, bpObj.id) || 0;
    const bpr = bb > 0 ? (bp / bb).toFixed(2) : bp;
    const fmt = (basicCounterConfigs.defaultBPBRatioFormat ?? "").toString().trim();
    const prefix = fmt.length === 1 ? `§${fmt}` : "";
    let line = `${prefix}Blocks Placed/Broken Ratio: ${bpr}`;
    if (globalFmt.length === 1) line = `§${globalFmt}${line}`;
    lines.push(line);
  }

  // ─── Time Played ─────────────────────────────────────────────────────
  if (cfg.personalStatsTimePlayed) {
  // Ensure the single "playtime_minutes" objective exists
  const totalMinObj = createScoreboardIfNotExists("playtime_minutes", "Playtime Minutes");
  // Read total minutes from scoreboard under player name
  const totalMinutes = getScoreSafe(player.nameTag, totalMinObj.id) || 0;
  // Convert to days, hours, minutes
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const fmt = (basicCounterConfigs.playtimeActionBarFormat ?? "").toString().trim();
  const prefix = fmt.length === 1 ? `§${fmt}` : "";
  let line = `${prefix}Time Played: ${days}d ${hours}h ${minutes}m`;
  if (globalFmt.length === 1) line = `§${globalFmt}${line}`;
  lines.push(line);
}


  // ─── Distance Traveled ───────────────────────────────────────────────
  if (cfg.personalStatsDistanceTraveled) {
    const distObj = createScoreboardIfNotExists("distance_traveled", "Distance Traveled");
    const distScore = getScoreSafe(player.nameTag, distObj.id) || 0;
    const fmt = (basicCounterConfigs.distanceTraveledActionBarFormat ?? "").toString().trim();
    const prefix = fmt.length === 1 ? `§${fmt}` : "";
    let line = `${prefix}Distance: ${distScore}`;
    if (globalFmt.length === 1) line = `§${globalFmt}${line}`;
    lines.push(line);
  }

  // ─── Chests Opened ────────────────────────────────────────────────────
  if (cfg.personalStatsChestsOpened) {
    const chestObj = createScoreboardIfNotExists("containers_opened", "Chests Opened");
    const chestScore = getScoreSafe(player.nameTag, chestObj.id) || 0;
    const fmt = (basicCounterConfigs.containersOpenedActionBarFormat ?? "").toString().trim();
    const prefix = fmt.length === 1 ? `§${fmt}` : "";
    let line = `${prefix}Chests Opened: ${chestScore}`;
    if (globalFmt.length === 1) line = `§${globalFmt}${line}`;
    lines.push(line);
  }

  if (cfg.personalStatsTimesJoined) {
  // Ensure the “playerJoin” objective exists
  const joinObj = createScoreboardIfNotExists("playerJoin", "Times Joined");
  // Read the score under player.nameTag
  const joinScore = getScoreSafe(player.nameTag, joinObj.id) || 0;

  // Optional: allow a format code for Times Joined in basicCounterConfigs
  const fmt = (basicCounterConfigs.timesJoinedActionBarFormat ?? "").toString().trim();
  const prefix = fmt.length === 1 ? `§${fmt}` : "";

  let line = `${prefix}Times Joined: ${joinScore}`;
  if (globalFmt.length === 1) line = `§${globalFmt}${line}`;
  lines.push(line);
}
// // ─── Custom Personal Stats Objectives ─────────────────────────────────
 if (Array.isArray(cfg.customPersonalStatsObjectives)) {
    for (const objName of cfg.customPersonalStatsObjectives) {
      const pretty = objName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const obj = createScoreboardIfNotExists(objName, pretty);
      const score = getScoreSafe(player, obj.id) || 0;
      let line = `${pretty}: ${score}`;
      if (globalFmt.length === 1) line = `§${globalFmt}${line}`;
      lines.push(line);
    }
  }

  // Build and show ActionForm with all lines (single "Close" button)
  const form = new ActionFormData()
    .title("Personal Stats")
    .body(lines.join("\n") || "No stats available.")
    .button(applyGlobalFormat("Close"));

  form.show(player);
}


//----------------------Admin Personal Stats Menu----------------------

export function adminPersonalStatsConfigMenu(player) {
  loadPlayerMenuConfigs();

  const cfg = playerMenuConfigs;

  // Build a ModalForm with toggles for each personal‐stats flag and a text field at the bottom
  const form = new ModalFormData()
    .title("Admin: Personal Stats Settings")
    .toggle("Show Currency", cfg.personalStatsCurrency)
    .toggle("Show Kills", cfg.personalStatsKills)
    .toggle("Show Deaths", cfg.personalStatsDeaths)
    .toggle("Show Kill Coins", cfg.personalStatsKillCoins)
    .toggle("Show KDR", cfg.personalStatsKDR)
    .toggle("Show Monster Kills", cfg.personalStatsMonsterKills)
    .toggle("Show Mob Kills", cfg.personalStatsMobKills)
    .toggle("Show Blocks Broken", cfg.personalStatsBlocksBroken)
    .toggle("Show Blocks Placed", cfg.personalStatsBlocksPlaced)
    .toggle("Show BPR", cfg.personalStatsBPR)
    .toggle("Show Time Played", cfg.personalStatsTimePlayed)
    .toggle("Show Distance Traveled", cfg.personalStatsDistanceTraveled)
    .toggle("Show Chests Opened", cfg.personalStatsChestsOpened)
    .textField(
      "Custom Personal Stats Objectives (comma-separated)",
      (cfg.customPersonalStatsObjectives || []).join(",")
    );

  form.show(player).then(response => {
    if (response.canceled) return;

    const [
      toggleCurrency,
      toggleKills,
      toggleDeaths,
      toggleKillCoins,
      toggleKDR,
      toggleMonsterKills,
      toggleMobKills,
      toggleBlocksBroken,
      toggleBlocksPlaced,
      toggleBPR,
      toggleTimePlayed,
      toggleDistance,
      toggleChestsOpened,
      customField
    ] = response.formValues;

    // Update each flag only if it changed
    if (toggleCurrency !== cfg.personalStatsCurrency)       playerMenuConfigs.personalStatsCurrency       = toggleCurrency;
    if (toggleKills    !== cfg.personalStatsKills)          playerMenuConfigs.personalStatsKills          = toggleKills;
    if (toggleDeaths   !== cfg.personalStatsDeaths)         playerMenuConfigs.personalStatsDeaths         = toggleDeaths;
    if (toggleKillCoins!== cfg.personalStatsKillCoins)      playerMenuConfigs.personalStatsKillCoins      = toggleKillCoins;
    if (toggleKDR      !== cfg.personalStatsKDR)            playerMenuConfigs.personalStatsKDR            = toggleKDR;
    if (toggleMonsterKills !== cfg.personalStatsMonsterKills)playerMenuConfigs.personalStatsMonsterKills = toggleMonsterKills;
    if (toggleMobKills !== cfg.personalStatsMobKills)       playerMenuConfigs.personalStatsMobKills       = toggleMobKills;
    if (toggleBlocksBroken !== cfg.personalStatsBlocksBroken)playerMenuConfigs.personalStatsBlocksBroken = toggleBlocksBroken;
    if (toggleBlocksPlaced !== cfg.personalStatsBlocksPlaced)playerMenuConfigs.personalStatsBlocksPlaced = toggleBlocksPlaced;
    if (toggleBPR      !== cfg.personalStatsBPR)            playerMenuConfigs.personalStatsBPR            = toggleBPR;
    if (toggleTimePlayed !== cfg.personalStatsTimePlayed)   playerMenuConfigs.personalStatsTimePlayed     = toggleTimePlayed;
    if (toggleDistance !== cfg.personalStatsDistanceTraveled)playerMenuConfigs.personalStatsDistanceTraveled = toggleDistance;
    if (toggleChestsOpened !== cfg.personalStatsChestsOpened)playerMenuConfigs.personalStatsChestsOpened = toggleChestsOpened;

    // Parse and save custom objectives list
    playerMenuConfigs.customPersonalStatsObjectives = customField
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Persist and reload
    savePlayerMenuConfigs();
    loadPlayerMenuConfigs();
    player.sendMessage("§aPersonal‐Stats settings updated.");
  }).catch(() => {});
}


//-----------------------Global Stats Menu-----------------------

export function showGlobalStatsMenu(player) {
  const cfg = playerMenuConfigs;
  const bc  = basicCounterConfigs; // your defaultBasicCounterConfigs loaded in memory

  // Map each stat key → its §-format char from basicCounterConfigs
  const formatDefs = {
    globalStatsKills:           bc.pvpActionBarFormat,
    globalStatsDeaths:          bc.deathActionBarFormat,
    globalStatsKillCoins:       bc.killCoinsActionBarFormat,
    globalStatsMonsterKills:    bc.monsterActionBarFormat,
    globalStatsMobKills:        bc.mobsActionBarFormat,
    globalStatsBlocksPlaced:    bc.blocksPlacedActionBarFormat,
    globalStatsBlocksBroken:    bc.blocksBrokenActionBarFormat,
    globalStatsDistanceTraveled:bc.distanceTraveledActionBarFormat,
    globalStatsTimePlayed:      bc.playtimeActionBarFormat,
    globalStatsChestsOpened:    bc.containersOpenedActionBarFormat,
    // no specific “join” format defined → fall back to globalActionBarFormat
    globalStatsTimesJoined:     bc.globalActionBarFormat,
    globalStatsTotalPlayers:    bc.globalActionBarFormat,
  };

  // your stat definitions (dummy player, objective, label)
  const statDefs = {
    globalStatsKills:        { dummy: "total_kills",             objective: "total_kills",               label: "Global PvP Kills" },
    globalStatsDeaths:       { dummy: "total_deaths",            objective: "total_deaths",              label: "Global Deaths" },
    globalStatsKillCoins:    { dummy: "total_kill_coins",        objective: "total_kill_coins",          label: "Global kCoins" },
    globalStatsMonsterKills: { dummy: "total_monster_kills",     objective: "total_monster_kills",       label: "Global Monster Kills" },
    globalStatsMobKills:     { dummy: "total_mob_kills",         objective: "total_mob_kills",           label: "Global Mob Kills" },
    globalStatsBlocksPlaced: { dummy: "total_blocks_placed",     objective: "total_blocks_placed",       label: "Global Blocks Placed" },
    globalStatsBlocksBroken: { dummy: "total_blocks_broken",     objective: "total_blocks_broken",       label: "Global Blocks Broken" },
    globalStatsDistanceTraveled: {
                              dummy: "total_distance",          objective: "total_distance",   label: "Global Distance Traveled"
                            },
    globalStatsTimePlayed:   { dummy: "total_playtime",          objective: "total_playtime",    label: "Global Playtime" },
    globalStatsChestsOpened: { dummy: "total_containers_opened",  objective: "total_containers_opened",    label: "Global Chests Opened" },
    globalStatsTimesJoined:  { dummy: "total_players_joined",     objective: "total_players_joined",          label: "Global Times Joined" },
    globalStatsTotalPlayers: { dummy: "total_players",            objective: "totalPlayers",        label: "Total Players Joined" },
  };

  const order = [
    "globalStatsKills","globalStatsDeaths","globalStatsKillCoins",
    "globalStatsMonsterKills","globalStatsMobKills",
    "globalStatsBlocksPlaced","globalStatsBlocksBroken",
    "globalStatsDistanceTraveled","globalStatsTimePlayed",
    "globalStatsChestsOpened","globalStatsTimesJoined",
    "globalStatsTotalPlayers"
  ];

  const lines = [];

  for (const key of order) {
    if (!cfg[key]) continue;
    const { dummy, objective, label } = statDefs[key];
    createScoreboardIfNotExists(objective, label);

    const raw = getScoreSafe(dummy, objective) || 0;
    let display = raw;

    if (key === "globalStatsTimePlayed") {
      // convert seconds → Y M D H M
      let secs = raw;
      let mins = Math.floor(secs / 60); secs %= 60;
      let hrs  = Math.floor(mins / 60); mins %= 60;
      let days = Math.floor(hrs  / 24); hrs  %= 24;

      const parts = [];
      if (days > 365) {
        const y = Math.floor(days / 365);
        days %= 365;
        parts.push(`${y}y`);
      }
      if (parts.length || days > 31) {
        const mo = Math.floor(days / 31);
        days %= 31;
        parts.push(`${mo}mo`);
      }
      parts.push(`${days}d`, `${hrs}h`, `${mins}m`);
      display = parts.join(" ");
    }

    // build the §<code> prefix per-stat
    const fmtChar = (formatDefs[key] ?? "").toString().trim();
    const prefix  = fmtChar.length === 1 ? `§${fmtChar}` : "";

    lines.push(`${prefix}${label}: ${display}`);
  }

  new ActionFormData()
    .title("Global Statistics")
    .body(lines.join("\n"))
    .button("Back")
    .show(player)
    .catch(() => {});
}


//--------------------Admin Global Stats Config Menu--------------------

export function adminGlobalStatsConfigMenu(player) {
  loadPlayerMenuConfigs();

  const cfg = playerMenuConfigs;

  const form = new ModalFormData()
    .title("Admin: Global Stats Settings")
    .toggle("Show Global Stats Button",    cfg.globalStatsButton)
    .toggle("Show PvP Kills",              cfg.globalStatsKills)
    .toggle("Show Deaths",                 cfg.globalStatsDeaths)
    .toggle("Show Kill Coins",             cfg.globalStatsKillCoins)
    .toggle("Show Monster Kills",          cfg.globalStatsMonsterKills)
    .toggle("Show Mob Kills",              cfg.globalStatsMobKills)
    .toggle("Show Blocks Placed",          cfg.globalStatsBlocksPlaced)
    .toggle("Show Blocks Broken",          cfg.globalStatsBlocksBroken)
    .toggle("Show Distance Traveled",      cfg.globalStatsDistanceTraveled)
    .toggle("Show Playtime",               cfg.globalStatsTimePlayed)
    .toggle("Show Chests Opened",          cfg.globalStatsChestsOpened)
    .toggle("Show Times Joined",           cfg.globalStatsTimesJoined)
    .toggle("Show Total Players Joined",   cfg.globalStatsTotalPlayers);

  form.show(player).then(response => {
    if (response.canceled) return;

    const [
      toggleButton,
      toggleKills,
      toggleDeaths,
      toggleKillCoins,
      toggleMonsterKills,
      toggleMobKills,
      toggleBlocksPlaced,
      toggleBlocksBroken,
      toggleDistance,
      togglePlaytime,
      toggleChestsOpened,
      toggleTimesJoined,
      toggleTotalPlayers
    ] = response.formValues;

    if (toggleButton        !== cfg.globalStatsButton)      playerMenuConfigs.globalStatsButton      = toggleButton;
    if (toggleKills         !== cfg.globalStatsKills)       playerMenuConfigs.globalStatsKills       = toggleKills;
    if (toggleDeaths        !== cfg.globalStatsDeaths)      playerMenuConfigs.globalStatsDeaths      = toggleDeaths;
    if (toggleKillCoins     !== cfg.globalStatsKillCoins)   playerMenuConfigs.globalStatsKillCoins   = toggleKillCoins;
    if (toggleMonsterKills  !== cfg.globalStatsMonsterKills)playerMenuConfigs.globalStatsMonsterKills= toggleMonsterKills;
    if (toggleMobKills      !== cfg.globalStatsMobKills)    playerMenuConfigs.globalStatsMobKills    = toggleMobKills;
    if (toggleBlocksPlaced  !== cfg.globalStatsBlocksPlaced)playerMenuConfigs.globalStatsBlocksPlaced= toggleBlocksPlaced;
    if (toggleBlocksBroken  !== cfg.globalStatsBlocksBroken)playerMenuConfigs.globalStatsBlocksBroken= toggleBlocksBroken;
    if (toggleDistance      !== cfg.globalStatsDistanceTraveled) playerMenuConfigs.globalStatsDistanceTraveled = toggleDistance;
    if (togglePlaytime      !== cfg.globalStatsTimePlayed)  playerMenuConfigs.globalStatsTimePlayed  = togglePlaytime;
    if (toggleChestsOpened  !== cfg.globalStatsChestsOpened)playerMenuConfigs.globalStatsChestsOpened= toggleChestsOpened;
    if (toggleTimesJoined   !== cfg.globalStatsTimesJoined) playerMenuConfigs.globalStatsTimesJoined = toggleTimesJoined;
    if (toggleTotalPlayers  !== cfg.globalStatsTotalPlayers)playerMenuConfigs.globalStatsTotalPlayers= toggleTotalPlayers;

    savePlayerMenuConfigs();
    loadPlayerMenuConfigs();
    player.sendMessage("§aGlobal‐Stats settings updated.");
  }).catch(() => {});
}



//--------------------Leaderboard Menu--------------------

// ───── your new stats config ──────────────────────────────────────────────
const SNAPSHOT_STATS = [
  {
    configKey:       "currency",
    statKey:         basicCounterConfigs.currencyObjectiveName,
    liveObjective:   basicCounterConfigs.currencyObjectiveName,
    offlineObjective:`${basicCounterConfigs.currencyObjectiveName}_offline`,
    label:           "Currency"
  },
  {
    configKey:      "pvpKill",
    statKey:        "kills",              // for getScoreSafe
    liveObjective:  "kills",              // your live scoreboard ID
    offlineObjective:"kills_offline",     // where we snapshot on logout
    label:          "PvP Kills"
  },
  {
    configKey:      "death",
    statKey:        "deaths",
    liveObjective:  "deaths",
    offlineObjective:"deaths_offline",
    label:          "Deaths"
  },
  {
    configKey:      "killCoins",
    statKey:        "kill_coins",
    liveObjective:  "kill_coins",
    offlineObjective:"kill_coins_offline",
    label:          "Kill Coins"
  },
  {
    configKey:      "monster",
    statKey:        "monster_kills",
    liveObjective:  "monster_kills",
    offlineObjective:"monster_kills_offline",
    label:          "Monster Kills"
  },
  {
    configKey:      "mobs",
    statKey:        "mob_kills",
    liveObjective:  "mob_kills",
    offlineObjective:"mob_kills_offline",
    label:          "Mob Kills"
  },
  {
    configKey:      "blocksPlaced",
    statKey:        "blocks_placed",
    liveObjective:  "blocks_placed",
    offlineObjective:"blocks_placed_offline",
    label:          "Blocks Placed"
  },
  {
    configKey:      "blocksBroken",
    statKey:        "blocks_broken",
    liveObjective:  "blocks_broken",
    offlineObjective:"blocks_broken_offline",
    label:          "Blocks Broken"
  },
  {
    configKey:      "distanceTraveled",
    statKey:        "distance_traveled",
    liveObjective:  "distance_traveled",
    offlineObjective:"distance_traveled_offline",
    label:          "Distance Traveled"
  },
  {
    configKey:      "playtime",
    statKey:        "playtime_seconds",
    liveObjective:  "playtime_seconds",
    offlineObjective:"playtime_seconds_offline",
    label:          "Playtime"
  },
  {
    configKey:      "containersOpened",
    statKey:        "containers_opened",
    liveObjective:  "containers_opened",
    offlineObjective:"containers_opened_offline",
    label:          "Chests Opened"
  },
  {
    configKey:      "playerJoin",
    statKey:        "playerJoin",
    liveObjective:  "playerJoin",
    offlineObjective:"playerJoin_offline",
    label:          "Times Joined"
  }
];

// ───── snapshot scores ─────────────────────────────────────────────────
system.runInterval(() => {
  // reload configs to pick up any new custom objectives
  loadPlayerMenuConfigs();
  const cfg = playerMenuConfigs;

  // ── 1) snapshot built‐in stats ─────────────────────────────────────────
  for (const stat of SNAPSHOT_STATS) {
    // only snapshot enabled stats
    if (!basicCounterConfigs[stat.configKey]) continue;

    // determine live/offline objective names
    let liveName = stat.liveObjective;
    let offName  = stat.offlineObjective;
    if (stat.configKey === "currency") {
      liveName = basicCounterConfigs.currencyObjectiveName;
      offName  = `${basicCounterConfigs.currencyObjectiveName}_offline`;
    }

    // ensure objectives exist
    const liveSb = createScoreboardIfNotExists(liveName, stat.label);
    const offSb  = createScoreboardIfNotExists(offName,  `${stat.label} (Offline)`);

    // copy live → offline
    for (const id of liveSb.getParticipants()) {
      let score = 0;
      try {
        const s = liveSb.getScore(id);
        if (typeof s === "number") score = s;
      } catch {}
      offSb.setScore(id.displayName, score);
    }
  }

  // ── 2) snapshot custom objectives ───────────────────────────────────────
  for (const objName of cfg.customLeaderBoardObjectives || []) {
    // live objective = objName, offline = `${objName}_offline`
    const liveSb = createScoreboardIfNotExists(objName, objName);
    const offSb  = createScoreboardIfNotExists(`${objName}_offline`, `${objName} (Offline)`);

    for (const id of liveSb.getParticipants()) {
      let score = 0;
      try {
        const s = liveSb.getScore(id);
        if (typeof s === "number") score = s;
      } catch {}
      offSb.setScore(id.displayName, score);
    }
  }
}, 2400); // every 2 minutes (2400 ticks)

// ───── leaderboard menu ───────────────────────────────────────────────────
export function showLeaderboardMenu(player) {
  // 1) Ensure we have the latest saved toggles and custom list
  loadPlayerMenuConfigs();
  const cfg = playerMenuConfigs;

  // 2) Build the form
  const form    = new ActionFormData()
    .title("Leaderboards")
    .body("Select a stat:");
  const options = [];

  // 3) Only include built-in stats whose toggles are on
  for (const stat of SNAPSHOT_STATS) {
    let toggleKey;
    switch (stat.statKey) {
      case "kills":             toggleKey = "leaderBoardStatsKills"; break;
      case "deaths":            toggleKey = "leaderBoardStatsDeaths"; break;
      case "kill_coins":        toggleKey = "leaderBoardStatsKillCoins"; break;
      case "monster_kills":     toggleKey = "leaderBoardStatsMonsterKills"; break;
      case "mob_kills":         toggleKey = "leaderBoardStatsMobKills"; break;
      case "blocks_placed":     toggleKey = "leaderBoardStatsBlocksPlaced"; break;
      case "blocks_broken":     toggleKey = "leaderBoardStatsBlocksBroken"; break;
      case "distance_traveled": toggleKey = "leaderBoardStatsDistanceTraveled"; break;
      case "playtime_seconds":  toggleKey = "leaderBoardStatsTimePlayed"; break;
      case "containers_opened": toggleKey = "leaderBoardStatsChestsOpened"; break;
      case "playerJoin":        toggleKey = "leaderBoardStatsTimesJoined"; break;
      case "totalPlayers":      toggleKey = "leaderBoardStatsTotalPlayers"; break;
      default:                  toggleKey = null;
    }
    if (toggleKey && cfg[toggleKey]) {
      form.button(stat.label);
      options.push({ type: "builtin", stat });
    }
  }

  // 4) Then include any custom objectives
  for (const objName of cfg.customLeaderBoardObjectives || []) {
    form.button(objName);
    options.push({ type: "custom", objective: objName });
  }

  // 5) Back button
  form.button("Back");
  options.push(null);

  // 6) Show & handle selection
  form.show(player).then(res => {
    if (res.canceled) return;
    const choice = options[res.selection];
    if (!choice) return playerMenu(player);

    if (choice.type === "builtin") {
      showCombinedLeaderboard(player, choice.stat);
    } else {
      showCustomLeaderboard(player, choice.objective);
    }
  }).catch(() => {});
}

// ─── Show a custom‐objective leaderboard ─────────────────────────────────
function showCustomLeaderboard(player, objectiveName) {
  const sb = createScoreboardIfNotExists(objectiveName, objectiveName);
  const participants = sb
    .getParticipants()
    .filter(p => p.displayName !== "commands.scoreboard.players.offlinePlayerName");

  const entries = participants
    .map(id => {
      let score = 0;
      try {
        const s = sb.getScore(id);
        if (typeof s === "number") score = s;
      } catch {}
      return { name: id.displayName, score };
    })
    .sort((a, b) => b.score - a.score);

  const limit = Number(playerMenuConfigs.leaderBoardlimit) || 5;
  const top   = entries.slice(0, limit);

  const lines = top.length
    ? top.map((e, i) => `${i+1}. ${e.name}: ${e.score}`)
    : ["No data available."];

  new MessageFormData()
    .title(`${objectiveName} Leaderboard`)
    .body(lines.join("\n"))
    .button1("Back")
    .show(player)
    .then(() => showLeaderboardMenu(player));
}


//--------------------Admin Leaderboard Config Menu--------------------


export function adminLeaderboardConfigMenu(player) {
  loadPlayerMenuConfigs();
  const cfg = playerMenuConfigs;

  // 1) Build the form with toggles, limit field, and now a custom objectives text field
  const form = new ModalFormData()
    .title("Admin: Leaderboard Settings")
    .toggle("Enable Leaderboards Button",   cfg.leaderBoardButton)
    .textField("Leaderboard Limit (1–100)", cfg.leaderBoardlimit.toString())
    .toggle("Show PvP Kills",               cfg.leaderBoardStatsKills)
    .toggle("Show Deaths",                  cfg.leaderBoardStatsDeaths)
    .toggle("Show Kill Coins",              cfg.leaderBoardStatsKillCoins)
    .toggle("Show Monster Kills",           cfg.leaderBoardStatsMonsterKills)
    .toggle("Show Mob Kills",               cfg.leaderBoardStatsMobKills)
    .toggle("Show Blocks Broken",           cfg.leaderBoardStatsBlocksBroken)
    .toggle("Show Blocks Placed",           cfg.leaderBoardStatsBlocksPlaced)
    .toggle("Show Distance Traveled",       cfg.leaderBoardStatsDistanceTraveled)
    .toggle("Show Playtime",                cfg.leaderBoardStatsTimePlayed)
    .toggle("Show Chests Opened",           cfg.leaderBoardStatsChestsOpened)
    .toggle("Show Times Joined",            cfg.leaderBoardStatsTimesJoined)
    .textField(
      "Custom Leaderboard Objectives (comma-separated)",
      (cfg.customLeaderBoardObjectives || []).join(",")
    );

  // 2) Show and handle responses
  form.show(player).then(response => {
    if (response.canceled) return;

    const [
      toggleButton,
      textLimit,
      toggleKills,
      toggleDeaths,
      toggleKillCoins,
      toggleMonsterKills,
      toggleMobKills,
      toggleBlocksBroken,
      toggleBlocksPlaced,
      toggleDistance,
      togglePlaytime,
      toggleChestsOpened,
      toggleTimesJoined,
      customField
    ] = response.formValues;

    // 3) Parse & clamp the limit between 1 and 100
    let limit = parseInt(textLimit, 10);
    if (isNaN(limit) || limit < 1) limit = 1;
    if (limit > 100) limit = 100;

    // 4) Update only if changed
    if (toggleButton       !== cfg.leaderBoardButton)            playerMenuConfigs.leaderBoardButton            = toggleButton;
    if (limit              !== cfg.leaderBoardlimit)             playerMenuConfigs.leaderBoardlimit             = limit;
    if (toggleKills        !== cfg.leaderBoardStatsKills)        playerMenuConfigs.leaderBoardStatsKills        = toggleKills;
    if (toggleDeaths       !== cfg.leaderBoardStatsDeaths)       playerMenuConfigs.leaderBoardStatsDeaths       = toggleDeaths;
    if (toggleKillCoins    !== cfg.leaderBoardStatsKillCoins)    playerMenuConfigs.leaderBoardStatsKillCoins    = toggleKillCoins;
    if (toggleMonsterKills !== cfg.leaderBoardStatsMonsterKills) playerMenuConfigs.leaderBoardStatsMonsterKills = toggleMonsterKills;
    if (toggleMobKills     !== cfg.leaderBoardStatsMobKills)     playerMenuConfigs.leaderBoardStatsMobKills     = toggleMobKills;
    if (toggleBlocksBroken !== cfg.leaderBoardStatsBlocksBroken) playerMenuConfigs.leaderBoardStatsBlocksBroken = toggleBlocksBroken;
    if (toggleBlocksPlaced !== cfg.leaderBoardStatsBlocksPlaced) playerMenuConfigs.leaderBoardStatsBlocksPlaced = toggleBlocksPlaced;
    if (toggleDistance     !== cfg.leaderBoardStatsDistanceTraveled) playerMenuConfigs.leaderBoardStatsDistanceTraveled = toggleDistance;
    if (togglePlaytime     !== cfg.leaderBoardStatsTimePlayed)   playerMenuConfigs.leaderBoardStatsTimePlayed   = togglePlaytime;
    if (toggleChestsOpened !== cfg.leaderBoardStatsChestsOpened) playerMenuConfigs.leaderBoardStatsChestsOpened = toggleChestsOpened;
    if (toggleTimesJoined  !== cfg.leaderBoardStatsTimesJoined)  playerMenuConfigs.leaderBoardStatsTimesJoined  = toggleTimesJoined;

    // 5) Parse custom objectives list
    playerMenuConfigs.customLeaderBoardObjectives = customField
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // 6) Persist and reload
    savePlayerMenuConfigs();
    loadPlayerMenuConfigs();
    player.sendMessage("§aLeaderboard settings updated.");
  }).catch(() => {
    // ignore cancellation or errors
  });
}
