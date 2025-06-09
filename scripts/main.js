////READ ME FILE FOR MORE INFO

// Shark's Counters - Main
// Welcome to Shark's Counters!
// This has been a long journey, we started with command blocks and now we have a full add on! 


//i hope you find some of the many features helpful. 

//please subscribe to ArcticSharkGames on Youtube
//https://www.youtube.com/@ArcticSharkGames

 //and join the Shark Commanders Discord

//https://discord.com/invite/x4kKDnsqxB

///feel free to use and edit this as you feel but please leave credit to ArcticSharkGames inside the files. 

//Happy Commanding, Happy Scripting and Happy counting!

//- ArcticSharkGames June 6th 2025

//READ ME FILE FOR MORE INFO



//------------------------------Imports--------------------------------------------------

import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { showLogMenu, addLog, loadLogConfigs  } from "./logManager";
import { loadPlayerMenuConfigs, playerMenu, playerMenuManager } from "./playerMenu";
import { loadBasicCounterConfigs, manageDefaultCountersMenu, defaultCountersMenu, defaultBasicCounterConfigs } from "./defaultCounters";
import { 
  loadAdminConfig,
  saveAdminConfig,
  defaultAdminConfig,
  adminConfig,
  showEditItemSettingsForm,
  showAdminSettings,
  showScoreDisplaySettingsMenu
} from "./adminSettings";
import {
  pvpKillCounters,
  loadPvPKillCounters,
  showConfigurePvPKillCounterForm,
  deletePvPKillCounter,
  savePvPKillCounter } from "./pvpKillsCounter";
import {
    killCounters,
    loadKillCounters,
    showConfigureKillCounterForm,
    deleteKillCounter,
    saveKillCounter} from "./killsCounter";
import {
    deathCounters,
    loadDeathCounters,
    showConfigureDeathCounterForm,
    deleteDeathCounter,
    showConfigureDeathCauseFilterForm,
    saveDeathCounter,
    defaultDeathCounterConfig } from "./deathsCounter";
  import {
    blockCounters,
    loadBlockCounters,
    showConfigureBrokenBlockCounterForm,
    showConfigurePlacedBlockCounterForm,
    deleteBlockCounter,
    saveBlockCounter } from "./blockCounter";
  import {
    showConfigureChestInteractionCounterForm,
    showConfigureBlockTypesForm,
    loadChestInteractionCounters,
    saveChestInteractionCounter,
    defaultChestInteractionConfig,
    chestInteractionCounters,
    deleteChestInteractionCounter
  } from "./chestInteractionCounter.js"
  import { 
    playtimeCounters,
    defaultPlaytimeConfig,
    savePlaytimeCounter,
    loadPlaytimeCounters,
    deletePlaytimeCounter,
    showConfigurePlaytimeCounterForm,   
  } from "./playtimeCounter.js";
  import {
   showConfigureDistanceCounterForm,
   saveDistanceCounter,
   loadDistanceCounters,
   deleteDistanceCounter,
   defaultDistanceConfig,
   distanceCounters
  } from "./distanceCounter.js"
import { showAfkSettingsMenu, showManageBansMenu, loadAfkSettings, saveAfkSettings, checkBannedPlayers} from "./afk";
import { showRatioListMenu, defaultRatioConfig, ratioConfigs, loadRatioConfigs } from "./ratio.js"
import { loadScoreRewardConfigs, defaultScoreRewardConfig, scoreRewardConfigs, scoreRewardManager } from "./scoreRewards.js"


export {
    adminMainMenu,
    parseRangeInput,
    createScoreboardIfNotExists,
    randomInRange,
    checkScoreFilter,
    getScoreSafe,
    showSingleActionBar,
    showPvPActionBar,
    applyDeltaSafely,
    showSettingsMenu
  }
//--------------Itialize Data------------------
//load all data
world.afterEvents.worldInitialize.subscribe(() => {
  loadBasicCounterConfigs();
  loadAfkSettings();
  loadPvPKillCounters();
  loadKillCounters();
  loadAdminConfig();
  loadDeathCounters();
  loadBlockCounters();
  loadPlaytimeCounters();
  loadDistanceCounters();
  loadRatioConfigs();
  loadPlayerMenuConfigs();
  loadScoreRewardConfigs ();
  createScoreboardIfNotExists("player_menu", "Player Menu");
});


//run ban check and player menu score check
system.runInterval(() => {
    checkBannedPlayers();
    for (const player of world.getPlayers()) {
      const menuObj = world.scoreboard.getObjective("player_menu");
      const score = getScoreSafe(player, "player_menu") || 0;
      if (score === 1) {
        playerMenu(player);
        menuObj.setScore(player, 0);
      }
    }
},60);



const validCounterTypes = [
  { id: "pvpkill", label: "§l§vPVP Kill Counter" },
  { id: "kill", label: "§l§5Entity Kill Counter" },
  { id: "death", label: "§l§4Death Counter" },
  { id: "container", label: "§l§3Container Counter"},
  { id: "block", label: "§l§2Block Counter" },
  { id: "playtime", label: "§l§8Playtime Counter" },
  { id: "distance", label: "§l§uDistance Counter" }
];

//------------------Item-Use Event for Admin and Player Items----------------------

world.beforeEvents.itemUse.subscribe((event) => {
  system.run(async () => {
    const player = event.source;
    const item   = event.itemStack;
    const cfg    = loadAdminConfig() || defaultAdminConfig;

    // ensure arrays exist
    cfg.ownerList     = cfg.ownerList     || [];
    cfg.adminNameList = cfg.adminNameList || [];

    // ── FIRST-TIME OWNER SETUP ─────────────────────────────────────
    if (
      cfg.ownerList.length === 0 &&
      item?.typeId === cfg.adminItemIdentifier
    ) {
      const welcome = new MessageFormData()
        .title("Welcome To Shark's Counters")
        .body(
          `You’re the first to use the admin tool, do you agree to become OWNER?.\n` +
          `• Owners can manage the admin list (who else gets access to this tool)\n` +
          `• If "NO" then have the real Owner use this Menu (use this item again).\n` +
          `• If "YES" then you agree to become Owner/Admin of this world.\n` +
          `• You can open Player Menu with: "${cfg.playerItemIdentifier}"`
        )
        .button1("Yes, make me owner")
        .button2("No, thanks");

      // ← await their response
      const res = await welcome.show(player);
      if (res.canceled || res.selection === 1) {
        // they said “No” (or closed), so do nothing
        return;
      }

      // they clicked “Yes”
      const name = player.nameTag;
      if (!cfg.adminNameList.includes(name)) {
        cfg.adminNameList.push(name);
      }
      if (!cfg.ownerList.includes(name)) {
         cfg.ownerList.push(name);
      }
      saveAdminConfig(cfg);

      player.sendMessage(`§a${name} is now Shark Counters OWNER and ADMIN.`);
      showAdminSettings(player);
      return;
    }

    // ── REAL ADMIN ITEM CHECK ─────────────────────────────────────
    if (
      item?.typeId === cfg.adminItemIdentifier &&
      cfg.ownerList.length > 0
    ) {
      const skipTagCheck  = !cfg.requireAdminItemTag  || !cfg.adminItemTag;
      const hasValidTag   = skipTagCheck || player.hasTag(cfg.adminItemTag);
      const skipNameCheck = !cfg.adminNameList.length;
      const hasValidName  = skipNameCheck || cfg.adminNameList.includes(player.nameTag);

      if (hasValidTag || hasValidName) {
        adminMainMenu(player);
      } else {
        player.sendMessage("§cYou must be admin to use this item.");
      }
      return;
    }

    // ── PLAYER ITEM CHECK ───────────────────────────────────────
    if (item?.typeId === cfg.playerItemIdentifier) {


    // ── PLAYER ITEM ───────────────────────────────────────────────────────
    if (item?.typeId === adminConfig.playerItemIdentifier) {
      const skipPTC  = !adminConfig.requirePlayerItemTag || !adminConfig.playerItemTag;
      const hasPlayerTag  = player.hasTag(adminConfig.playerItemTag);

      if (!skipPTC && !hasPlayerTag) {
        player.sendMessage("§cYou are not authorized to use this item.");
        return;
      }
      player.sendMessage("Opening player menu");
      playerMenu(player);
    }
  }});
});



//-----------------------HEPER FUNCTIONS-----------------------------------------

/**
 * Shows a single-player action bar using your “add”/“remove” mode and format code.
 *
 * @param {Player}          player
 * @param {string[]}        ids         - objective IDs
 * @param {string[]}        names       - display names
 * @param {number}          delta       - amount changed
 * @param {"add"|"remove"}  mode        - drives “+” vs “-”
 * @param {string}          formatCode  - § code, e.g. "r" or "6"
 */
function showSingleActionBar(player, ids, names, delta, mode, formatCode = "r") {
  // safe getter
  const getScoreOrZero = (obj, pl) => {
    try {
      const s = obj.getScore(pl);
      if (typeof s === "number")      return s;
      if (s?.score  != null)          return s.score;
      if (s?.value  != null)          return s.value;
    } catch {}
    return 0;
  };

  const sign     = mode === "add"    ? "+" 
                 : mode === "remove" ? "-" 
                 : "";  // neither add nor remove
  const absDelta = Math.abs(delta);

  // build segments
  const segs = (ids || []).map((id,i) => {
    const obj     = world.scoreboard.getObjective(id);
    if (!obj) return null;
    const current = getScoreOrZero(obj, player);
    const label   = typeof names[i] === "string" ? names[i] : id;
    return `§${formatCode}${label}: ${sign}${absDelta} - ${current}`;
  }).filter(Boolean);

  // fallback if no objectives configured
  if (!segs.length) {
    const firstObj = world.scoreboard.getObjective(ids?.[0]);
    const current  = firstObj ? getScoreOrZero(firstObj, player) : 0;
    segs.push(`§${formatCode}Score: ${sign}${absDelta} - ${current}`);
  }

  const text = JSON.stringify(segs.join("  "));
  const cmd  = `title @s actionbar ${text}`;
  if (player.runCommandAsync) {
    player.runCommandAsync(cmd);
  } else {
    player.dimension.runCommandAsync(`title ${player.name} actionbar ${text}`);
  }
}

/**
 * Shows two action bars back-to-back—one for the killer, one for the victim—
 * each with its own mode and shared formatCode.
 *
 * @param {Player}          killer
 * @param {string[]}        kIds
 * @param {string[]}        kNames
 * @param {number}          kDelta
 * @param {"add"|"remove"}  kMode
 * @param {Player}          victim
 * @param {string[]}        vIds
 * @param {string[]}        vNames
 * @param {number}          vDelta
 * @param {"add"|"remove"}  vMode
 * @param {string}          formatCode
 */
function showPvPActionBar(
  killer, kIds, kNames, kDelta, kMode,
  victim, vIds,   vNames, vDelta, vMode,
  formatCode = "r"
) {
  showSingleActionBar(killer, kIds,   kNames, kDelta, kMode, formatCode);
  showSingleActionBar(victim, vIds,   vNames, vDelta, vMode, formatCode);
}



//------------------ Apply Score Amount (delta) Safely ------------------

const INT_MIN = -2147483648;
const INT_MAX =  2147483647;

/**
 * Picks a random delta in [min..max], 
 * applies it (or negates it for “remove” mode),
 * retries up to 10× if out of bounds,
 * then clamps to [lowBound..INT_MAX].
 *
 * Uses your existing getScoreSafe() to fetch the current score.
 */
function applyDeltaSafely(objective, player, cfg) {
  const { min, max } = cfg.amount;
  const lowBound = cfg.allowNegative ? INT_MIN : 0;

  // read current score via your helper instead of obj.getScore()
  const current = getScoreSafe(player, objective.id);

  let delta, candidate, tries = 0;
  do {
    delta = Math.floor(Math.random() * (max - min + 1)) + min;
    if (cfg.mode === 'remove') delta = -delta;

    candidate = current + delta;
    tries++;
  } while (
    (candidate < lowBound || candidate > INT_MAX)
    && tries < 10
  );

  const finalScore = Math.min(Math.max(candidate, lowBound), INT_MAX);
  objective.setScore(player, finalScore);
}


/**
 * @param {Entity} entity         - whose score to test
 * @param {object} filterConfig   - {objective, min, max, exclude}
 * @param {string} label          - debug label prefix
 * @param {boolean} log           - console.warn debug info
 * @param {boolean} sendFailure   - whether to message on failure
 * @param {Entity} [recipient]    - who gets the failure message; defaults to `entity`
 */
function checkScoreFilter(
  entity,
  filterConfig,
  label = "scoreFilter",
  log = false,
  sendFailure = false,
  recipient
) {
  // ensure recipient falls back to the entity if not provided
  recipient = recipient || entity;

  if (!entity || !filterConfig || !filterConfig.objective) return true;
  const objectives = Array.isArray(filterConfig.objective)
    ? filterConfig.objective
    : [filterConfig.objective];
  if (objectives[0] === "none") return true;

  const debug = msg => {
    if (log) console.warn(`[Debug][${label}] ${msg}`);
  };

  for (const obj of objectives) {
    const score = getScoreSafe(entity, obj);
    const { min, max, exclude } = filterConfig;
    const inExcludeRange = exclude &&
      score >= (exclude.min ?? -Infinity) &&
      score <= (exclude.max ?? Infinity);
  const inIncludeRange =
      (min == null || score >= min) &&
      (max == null || score <= max);
 
    debug(`objective='${obj}', score=${score}`);
    debug(`min=${min}, max=${max}, excludeMin=${exclude?.min}, excludeMax=${exclude?.max}`);
    debug(`inExcludeRange=${inExcludeRange}`);
    
    if (sendFailure) {
      recipient.sendMessage(`[${label}] objective='${obj}', score=${score}`);
      recipient.sendMessage(`[${label}] min=${min}, max=${max}, excludeMin=${exclude?.min}, excludeMax=${exclude?.max}\n`);
      recipient.sendMessage(`[${label}] inExcludeRange=${inExcludeRange} inIncludeRange=${inIncludeRange}`);
    }

    if (exclude) {
      if (inExcludeRange) {
        debug(`Score is excluded. FAIL`);
        if (sendFailure) { recipient.sendMessage(`Score is excluded. FAIL`);
        } continue;
      } else {
        recipient.sendMessage(`Score passed exclusion. PASS`);
// 420 smoke break 

        debug(`Score passed exclusion. PASS`);
        return true;
      }
    }

  
    debug(`inIncludeRange=${inIncludeRange}`);

    if (inIncludeRange) {
      if (sendFailure) {
      recipient.sendMessage(`Score is in allowed range. PASS`)}
      debug(`Score is in allowed range. PASS`);
      return true;
    }
    if (sendFailure) {
      recipient.sendMessage(`Score is outside allowed range. Fail`)}
    debug(`Score is outside allowed range. FAIL`);
  }

  
  return false;
}





const pendingCounterSetup = {}; // temporary storage during setup
/**
 * Safely get a player's (or entity's) score for an objective,
 * defaulting to 0 if unset or on error.
 * @param {Entity} entity
 * @param {string} objectiveId
 * @returns {number}
 */

//retrieve score safely
function getScoreSafe(entity, objectiveId) {
  try {
    const obj = world.scoreboard.getObjective(objectiveId);
    if (!obj) return 0;
    const raw = obj.getScore(entity);
    return Number.isFinite(raw) ? raw : 0;
  } catch {
    return 0;
  }
}

//Helper function to parse range input for the score filter sections of menu
/**
 * Parses a user-entered range string into a numeric range (or exclude-range).
 *
 * Supports:
 *   “3”      → { min: 3,     max: 3     }
 *   “1..5”   → { min: 1,     max: 5     }
 *   “..10”   → { min: INT_MIN, max: 10  }
 *   “1..”    → { min: 1,     max: INT_MAX }
 *   “!2..4”  → { exclude: { min: 2, max: 4 } }
 *
 * @param {string} rawInput
 * @returns {{min: number, max: number} | {exclude: {min: number, max: number}}}
 */
function parseRangeInput(rawInput) {
  const INT_MIN = -2147483648;
  const INT_MAX =  2147483647;

  let s = rawInput.trim();
  let isExclude = false;
  if (s.startsWith("!")) {
    isExclude = true;
    s = s.slice(1);
  }

  let min = null, max = null;
  if (s.includes("..")) {
    const [a, b] = s.split("..");
    min = a !== "" ? parseInt(a, 10) : null;
    max = b !== "" ? parseInt(b, 10) : null;
  } else {
    const n = parseInt(s, 10);
    if (!Number.isNaN(n)) min = max = n;
  }

  // clamp open ends to INT_MIN/INT_MAX
  const clampedMin = (min != null ? Math.min(Math.max(min, INT_MIN), INT_MAX) : INT_MIN);
  const clampedMax = (max != null ? Math.min(Math.max(max, INT_MIN), INT_MAX) : INT_MAX);

  if (isExclude) {
    return { exclude: { min: clampedMin, max: clampedMax } };
  } else {
    return { min: clampedMin, max: clampedMax };
  }
}

  
//missing scoreboard helper function
function createScoreboardIfNotExists(objectiveId, displayName) {  //create scoreboards
    let scoreboard = world.scoreboard.getObjective(objectiveId);
    if (scoreboard === undefined) {
    return world.scoreboard.addObjective(objectiveId,displayName);
    }
    return scoreboard;
}


// Utility to select a random value between min and max (inclusive)
function randomInRange(min, max) {
  if (typeof min !== "number" || typeof max !== "number" || isNaN(min) || isNaN(max)) {
    console.warn(`[randomInRange] Invalid input: min=${min}, max=${max}`);
    return 0; // safe fallback
  }

  const value = Math.floor(Math.random() * (max - min + 1)) + min;
  return value;
}

// —— track the last entity_explosion source per victim —— 
export const lastExploderBy = new WeakMap();

world.afterEvents.entityHurt.subscribe(({ hurtEntity, damageSource }) => {
  if (
    damageSource.type === "entity_explosion" &&
    damageSource.damagingEntity &&
    typeof damageSource.damagingEntity.getTags === "function"
  ) {
    // remember that this entity was just hurt by that creeper’s explosion
    lastExploderBy.set(hurtEntity, damageSource.damagingEntity);
  }
});




//-------------------------UI Main Menus-------------------------
function adminMainMenu(player) {
    const form = new ActionFormData()
      .title("\u00a7l\u00a73Shark's Counters")
      .body("Select a setting:")
      .button("\u00a7lDefault Counters")
      .button("\u00a7lCustom Counters")
      .button("\u00a7lScore Ratios")
      .button("\u00a7lScore Rewards")
      .button("\u00a7lLogs")
      .button("\u00a7lAdmin Settings")
      .button("\u00a7lExit");
  
    form.show(player).then((response) => {
      if (response.canceled) return;
  
      switch (response.selection) {
        case 0:
          defaultCountersMenu(player);
          break;
        case 1:
          manageAllCountersMenu(player);
          break;
        case 2:
          loadRatioConfigs(); 
          showRatioListMenu(player);
          break;
        case 3:
          scoreRewardManager(player);
          break; 
        case 4:
          showLogMenu(player);
          break;
        case 5:
          showSettingsMenu(player);
          break;
        case 6:
          break;
      }
    });
  }


function showSettingsMenu(player) {

  const cfg     = loadAdminConfig() || defaultAdminConfig;
  const isOwner = Array.isArray(cfg.ownerList) && cfg.ownerList.includes(player.nameTag);


  const form = new ActionFormData()
    .title("\u00a7l\u00a73Shark's Counters")
    .body("Select a setting:")
    .button("Item Settings")         // 0
    .button(`Player Menu Settings`)  // 1
    .button("Ban Settings")          // 2
    .button("AFK Settings")          // 3
    .button("Score Displays")        // 4

  if (isOwner) {
    form.button("Owner Settings");  // 5 (only for owners)
  }

  form.button("Back");              // 5 for non-owners, 6 for owners

 
  form.show(player).then(response => {
    if (response.canceled) return;

    const sel = response.selection;
    if (sel === 0) {
      showEditItemSettingsForm(player);
    }
    if (sel === 1) {
      playerMenuManager(player); 
    }
    else if (sel === 2) {
      showManageBansMenu(player);
    } 
    else if (sel === 3) {
      showAfkSettingsMenu(player);
    } 
    else if (sel === 4) {
      showScoreDisplaySettingsMenu(player);
    }
    else if (isOwner && sel === 5) {
      // owner’s extra option
      showAdminSettings(player);
    } else {
      // Back (sel === 5 for non-owners, 6 for owners)
      adminMainMenu(player);
    }
  });
}



//-------------------------Default Counter Menus-------------------------



//----------------Manage All Custom Counters Menu ----------------------------
export function manageAllCountersMenu(player) {
  const form = new ActionFormData()
    .title("Manage Counters")
    .body("Select a counter to configure:");

  // Load all counter configs into memory
  loadPvPKillCounters();
  loadKillCounters();
  loadDeathCounters();
  loadBlockCounters();
  loadChestInteractionCounters();
  loadPlaytimeCounters();
  loadDistanceCounters();
 

  // Gather every counter entry
  const allCounters = [
    ...Object.entries(pvpKillCounters),
    ...Object.entries(killCounters),
    ...Object.entries(deathCounters),
    ...Object.entries(blockCounters),
    ...Object.entries(chestInteractionCounters),
    ...Object.entries(playtimeCounters),
    ...Object.entries(distanceCounters)
    
  ];


  // Labels for each type (including ERROR)
  const counterLabels = {
    error:   "§cERROR Counter§r",
    pvpkill: "§l§vPvP Counter§r",
    kill:    "§l§5Kill Counter§r",
    death:   "§l§4Death Counter§r",
    block:   "§l§2Block Counter§r",
    container:  "§l§3Container Counter§r",
    playtime: "§l§8Playtime Counter§r",
    distance: "§l§uDistance Counter§r"
  };

  // Known types
  const knownTypes = ["pvpkill", "kill", "death", "block", "container", "playtime", "distance"];
  // Initialize buckets (including an ERROR bucket)
  const grouped = knownTypes.reduce((acc, t) => {
    acc[t] = [];
    return acc;
  }, { error: [] });

  // Distribute counters into their type-buckets or ERROR if invalid/missing
  for (const [name, config] of allCounters) {
    const t = config.type;
    if (t && knownTypes.includes(t)) {
      grouped[t].push({ name, config });
    } else {
      // DEBUG: log out what "type" we actually saw
      console.warn(`[DEBUG] Counter "${name}" has invalid type:`, t);
      player.sendMessage(`§e[DEBUG] Counter "${name}" type → ${t}`);
      grouped.error.push({ name, config });
    }
  }

  // Build form buttons in this order: ERROR first, then each known type
  const selectable = [];
  for (const type of ["error", ...knownTypes]) {
    const entries = grouped[type];
    if (entries.length === 0) continue;
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const { name, config } of entries) {
      const label  = counterLabels[type] || type;
      const status = config.enabled ? "§aENABLED§r" : "§cDISABLED§r";
      form.button(`§l${name}:§r ${status}\n(${label})`);
      selectable.push({ name, type, config });
    }
  }

  // ── NEW: add a "Create New Counter" button ──
  form.button("§l+ Add New Counter");
  selectable.push({ isCreate: true });

  form.show(player).then(response => {
    if (response.canceled) return;
    const sel = selectable[response.selection];
    if (!sel) return;

    // ── handle the Create button ──
    if (sel.isCreate) {
      showCreateCounterForm(player);
      return;
    }

    // ── existing logic for ERROR vs valid types ──
    if (sel.type === "error") {
      new ActionFormData()
        .title(`Invalid Counter: ${sel.name}`)
        .body("This counter has no valid type and cannot be configured.")
        .button("Delete Counter")
        .button("Back")
        .show(player)
        .then(res => {
          if (res.canceled || res.selection === 1) return;
          confirmDeleteCounter(player, sel.name, sel.type, sel.config);
        });
    } else {
      showCounterSubMenu(player, sel.name, sel.type, sel.config);
    }
  });
}





//Sub Menu Options for each counter type
function showCounterSubMenu(player, counterName, type, config) {
  // 1) decide our toggle label
  const toggleLabel = config.enabled
    ? "§l§cDisable Counter"
    : "§l§2Enable Counter";

  // 2) build the form with the toggle as button #0
  const form = new ActionFormData()
    .title(`${counterName} Options`)
    .body("What would you like to do?")
    .button(toggleLabel)       // 0 = toggle on/off
    .button("Edit Counter")    // 1 = edit
    .button("Configure Dimensions") // 2 = dimensions 
    .button("Delete Counter")  // 2 = delete
    .button("Reset Scoreboard Objectives")
    .button("Back");           // 3 = back

  form.show(player).then(response => {
    if (response.canceled) return;

    switch (response.selection) {
      case 0: // toggle enabled/disabled
        config.enabled = !config.enabled;

        // persist based on counter type
        switch (type) {
          case "pvpkill":
            savePvPKillCounter(counterName, config);
            break;
          case "kill":
            saveKillCounter(counterName, config);
            break;
          case "death":
            saveDeathCounter(counterName, config);
            break;
          case "block":
            saveBlockCounter(counterName, config);
            break;
          case "container": 
            saveChestInteractionCounter(counterName, config);
            break;
          case "playtime": 
            savePlaytimeCounter(counterName, config);
            break;
          case "distance":
            saveDistanceCounter(counterName, config);
            break;
        }

        // feedback and re-open
        player.sendMessage(
          `${counterName} is now ${config.enabled ? "ENABLED" : "DISABLED"}`
        );
        showCounterSubMenu(player, counterName, type, config);
        break;

      case 1: // Edit Counter
        switch (type) {
          case "pvpkill":
            showConfigurePvPKillCounterForm(player, counterName);
            break;
          case "kill":
            showConfigureKillCounterForm(player, counterName);
            break;
          case "death":
            showConfigureDeathCauseFilterForm(player, counterName);
            break;
          case "block":
            if (config.blockBreakEnabled && !config.blockPlaceEnabled) {
              showConfigureBrokenBlockCounterForm(player, counterName);
            } else if (config.blockPlaceEnabled && !config.blockBreakEnabled) {
              showConfigurePlacedBlockCounterForm(player, counterName);
            } else {
              showChooseBlockCounterTypeMenu(player, counterName);
            }
            break;
          case "container":
              showConfigureBlockTypesForm(player, counterName);
              break;
          case "playtime":
            showConfigurePlaytimeCounterForm(player, counterName);
            break;
          case "distance":
            showConfigureDistanceCounterForm(player, counterName);
            break;
         
        }
        break;
      case 2: // Delete Counter
        showConfigureDimensionFilterForm(player, counterName, type, config);
        break;

      case 3: // Delete Counter
        confirmDeleteCounter(player, counterName, type, config);
        break;
      case 4: // Reset Scoreboard Objectives
       showResetCounterScoresForm(player, counterName, config, type);    
        break;

      case 5: // Back
        manageAllCountersMenu(player);
        break;
    }
  });
}





//----------------Add Counter Forms---------------------
function showCreateCounterForm(player) {
  const form = new ActionFormData()
    .title("New Counter Setup")
    .body("Choose a counter type to create");

  // Add one button per valid type…
  for (const type of validCounterTypes) {
    form.button(type.label);
  }
  // …then a Back button at the end
  form.button("Back");

  form.show(player).then(response => {
    if (response.canceled) return;

    const choice = response.selection;
    const lastIndex = validCounterTypes.length; 

    // If they hit Back
    if (choice === lastIndex) {
      manageAllCountersMenu(player);
      return;
    }

    // Otherwise process the type they picked
    const type = validCounterTypes[choice]?.id;
    if (!type) return;

    showNameInputForm(player, type);
  });
}



//Add Counter Name Input Form


function showNameInputForm(player, type) {
  const nameForm = new ModalFormData()
    .title("Counter Name")
    .textField("Name for this counter", "e.g. pvpKills");

  nameForm.show(player).then(response => {
    if (response.canceled) return;

    let name = response.formValues[0]?.trim();
    name = name.replace(/[^a-zA-Z0-9_]/g, "").replace(/\s+/g, "_");

    if (!name || name.length === 0) {
      player.sendMessage("Invalid counter name. Please enter a valid name (alphanumeric, no spaces)");
      return;
    }

    if (pvpKillCounters[name] || killCounters[name] || deathCounters[name] || pendingCounterSetup[name]) {
      player.sendMessage("A counter with this name already exists. Please choose a different name.");
      return;
    }

    pendingCounterSetup[player.name] = { name, type };

    if (type === "pvpkill") {
      showConfigurePvPKillCounterForm(player, name);
    } 
    if (type === "kill") {
      showConfigureKillCounterForm(player, name);
    }
    if (type === "death") {
      deathCounters[name] = { ...defaultDeathCounterConfig };
      saveDeathCounter(name, deathCounters[name]);
      showConfigureDeathCauseFilterForm(player, name);
    }
    if (type === "block") {
      showChooseBlockCounterTypeMenu(player, name);
    }
    if (type === "container") {
    chestInteractionCounters[name] = { ...defaultChestInteractionConfig };
    saveChestInteractionCounter(name, chestInteractionCounters[name]);
    showConfigureBlockTypesForm(player, name);
    }
    if (type === "playtime") {
      playtimeCounters[name] = { ...defaultPlaytimeConfig };
      savePlaytimeCounter(name, playtimeCounters[name]);
      showConfigurePlaytimeCounterForm(player, name);
    }
    if (type === "distance") {
      distanceCounters[name] = { ...defaultDistanceConfig };
      saveDistanceCounter(name, distanceCounters[name]);
      showConfigureDistanceCounterForm(player, name);
    }
  }
);
}



function showChooseBlockCounterTypeMenu(player, name) {
  new ActionFormData()
    .title(`Block Counter: ${name}`)
    .body("Count broken blocks or placed blocks?")
    .button("Broken Blocks")
    .button("Placed Blocks")
    .show(player)
    .then(response => {
      if (response.canceled) return;
      const isBroken = response.selection === 0;

      // ensure our raw config has the right flags
      const raw = blockCounters[name] || {};
      raw.blockBreakEnabled = isBroken;
      raw.blockPlaceEnabled = !isBroken;
      blockCounters[name] = raw;
      saveBlockCounter(name, raw);          // ← persist the change immediately

      // branch into the appropriate form
      if (isBroken) {
        showConfigureBrokenBlockCounterForm(player, name);
      } else {
        showConfigurePlacedBlockCounterForm(player, name);
      }
    });
}

//----------------Dimension Menu ---------------------
/**
 * Universal Dimension‐Filter form for any counter type.
 * @param {Player} player 
 * @param {string} counterName 
 * @param {string} type           // "pvpkill" | "kill" | "death" | "block" | etc.
 * @param {Object} config         // the actual config object with .dimensionFilter=[]
 */
export function showConfigureDimensionFilterForm(player, counterName, type, config) {
  const dimensions = [
    ["Overworld", "overworld"],
    ["Nether",    "nether"],
    ["The End",   "the_end"]
  ];

  const form = new ModalFormData()
    .title(`${counterName}: Dimension Filter`);

  // add a toggle for each dimension
  dimensions.forEach(([label, id]) => {
    form.toggle(label, config.dimensionFilter.includes(id));
  });

  form.show(player).then(response => {
    if (response.canceled) return;

    // sync config.dimensionFilter based on toggles
    response.formValues.forEach((enabled, i) => {
      const [, id] = dimensions[i];
      const idx = config.dimensionFilter.indexOf(id);
      if (enabled && idx === -1)      config.dimensionFilter.push(id);
      else if (!enabled && idx !== -1) config.dimensionFilter.splice(idx, 1);
    });

    // pick the right save function for this counter type
    const saveMap = {
      pvpkill: savePvPKillCounter,
      kill:    saveKillCounter,
      death:   saveDeathCounter,
      block:   saveBlockCounter,
      container: saveChestInteractionCounter
    };
    const saver = saveMap[type];
    if (typeof saver === "function") {
      saver(counterName, config);
    } else {
      player.sendMessage(`§cError: no save handler for counter type "${type}"`);
      return;
    }

    // give the player feedback
    const dimsText = config.dimensionFilter.length
      ? config.dimensionFilter.join(", ")
      : "all dimensions";
    player.sendMessage(`${counterName}: now counting in ${dimsText}`);
    showCounterSubMenu(player, counterName, type, config);
  });
}


//-------------------Deletion Menus ------------------


function confirmDeleteCounter(player, counterName, type, config) {
  const confirm = new MessageFormData()
    .title("Delete Counter")
    .body(`Are you sure you want to delete §3'${counterName}' §6(${type})§r?\n\n§cThis cannot be undone.`)
    .button1("§4Yes, Delete")
    .button2("§2Cancel");

  confirm.show(player).then(res => {
    if (res.canceled || res.selection !== 0) return;

    showConfirmDeleteAssociatedScores(player, counterName, config, type);
  });
}

//then confirm delete associated scores or not
export function showConfirmDeleteAssociatedScores(player, counterName, config, type) {
  // Build a list of all associated scoreboard objectives (id + label) depending on counter type
  const scoreboardEntries = [];

  if (type === "pvpkill") {
    // PvP Kill: “killer” objectives and, if enabled, “victim” objectives
    const killerIds = Array.isArray(config.objectiveName)
      ? config.objectiveName
      : [config.objectiveName];
    const killerDisplay = Array.isArray(config.displayName)
      ? config.displayName
      : [config.displayName];

    for (let i = 0; i < killerIds.length; i++) {
      const id = killerIds[i];
      const disp = killerDisplay[i] || id;
      scoreboardEntries.push({ id, label: `Killer • ${id} (${disp})` });
    }

    if (config.victimScore?.victimScoreEnabled) {
      const victimIds = config.victimScore.victimScoreObjective || [];
      const victimDisplay = config.victimScore.victimScoreDisplayName || [];
      for (let i = 0; i < victimIds.length; i++) {
        const id = victimIds[i];
        const disp = victimDisplay[i] || id;
        scoreboardEntries.push({ id, label: `Victim • ${id} (${disp})` });
      }
    }
  }
  else if (type === "playtime") {
    // Playtime: seconds, minutes, hours, days objectives
    const fields = [
      {
        id: config.secondsObjectiveName,
        disp: config.secondsDisplayName,
        name: "Seconds",
      },
      {
        id: config.minutesObjectiveName,
        disp: config.minutesDisplayName,
        name: "Minutes",
      },
      {
        id: config.hoursObjectiveName,
        disp: config.hoursDisplayName,
        name: "Hours",
      },
      {
        id: config.daysObjectiveName,
        disp: config.daysDisplayName,
        name: "Days",
      },
    ];

    for (const { id, disp, name } of fields) {
      if (id && id.trim()) {
        const displayLabel = disp && disp.trim() ? disp : id;
        scoreboardEntries.push({
          id,
          label: `${name} • ${id} (${displayLabel})`,
        });
      }
    }
  }
  else {
    // All other types (kill, death, block, custom, distance, etc.):
    // use config.objectiveName / config.displayName (string or array)
    const ids = Array.isArray(config.objectiveName)
      ? config.objectiveName
      : [config.objectiveName];
    const labels = Array.isArray(config.displayName)
      ? config.displayName
      : [config.displayName];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const disp = labels[i] || id;
      scoreboardEntries.push({
        id,
        label: `${id} (${disp})`,
      });
    }
  }

  // If there are no associated scoreboards, just delete the counter immediately
  if (scoreboardEntries.length === 0) {
    runDeleteCounterByType(counterName, type);
    player.sendMessage(
      `Counter '${counterName}' deleted. No associated scoreboards to remove.`
    );
    addLog(
      `§c[Delete]§r ${player.nameTag} deleted ${type} counter '${counterName}' (no scores)`
    );
    return;
  }

  // Main dropdown: delete all, keep all, select individual, or cancel
  const form = new ModalFormData()
    .title("Delete Associated Scoreboards?")
    .dropdown("Choose what to do with these scoreboards", [
      "Yes, delete all listed",
      "No, keep scoreboards",
      "Select individual scoreboards",
      "Cancel",
    ]);

  form.show(player).then((result) => {
    if (result.canceled) return;
    const choice = result.formValues[0];

    if (choice === 3) {
      // Cancel
      return;
    }

    if (choice === 1) {
      // Keep all scoreboards, just delete counter
      runDeleteCounterByType(counterName, type);
      player.sendMessage(
        `Counter '${counterName}' deleted. Scoreboards were kept.`
      );
      addLog(
        `§c[Delete]§r ${player.nameTag} deleted ${type} counter '${counterName}'. Scores kept.`
      );
      return;
    }

    if (choice === 0) {
      // Delete every listed scoreboard objective
      for (const { id } of scoreboardEntries) {
        try {
          world.scoreboard.removeObjective(id);
          world.scoreboard.removeObjective(`${id}_display`);
        } catch {}
      }
      runDeleteCounterByType(counterName, type);
      player.sendMessage(
        `Counter '${counterName}' and all associated scoreboards deleted.`
      );
      addLog(
        `§c[Delete]§r ${player.nameTag} deleted ${type} counter '${counterName}' and all scores.`
      );
      return;
    }

    // choice === 2 → “Select individual scoreboards”
    const checklistForm = new ModalFormData().title(
      "Select Scoreboards to Delete"
    );
    scoreboardEntries.forEach((entry) => {
      checklistForm.toggle(entry.label, false);
    });
    checklistForm.toggle("Cancel (Do Not Delete Anything)", false);

    checklistForm.show(player).then((subRes) => {
      if (subRes.canceled) return;

      const cancelLast =
        subRes.formValues[scoreboardEntries.length];
      if (cancelLast) {
        player.sendMessage(
          `Canceled deletion. No scoreboards or counters were removed.`
        );
        return;
      }

      // For each checked entry, delete that objective
      subRes.formValues.forEach((checked, i) => {
        if (i >= scoreboardEntries.length || !checked) return;
        const id = scoreboardEntries[i].id;
        try {
          world.scoreboard.removeObjective(id);
          world.scoreboard.removeObjective(`${id}_display`);
        } catch {}
      });

      runDeleteCounterByType(counterName, type);
      player.sendMessage(
        `Counter '${counterName}' deleted. Selected scoreboards were removed.`
      );
      addLog(
        `§c[Delete]§r ${player.nameTag} deleted ${type} counter '${counterName}' and selected scores.`
      );
    });
  });
}



//Delete Counter BY Type

export function runDeleteCounterByType(counterName, type) {
  // Use the exact key you stored—don't lowercase it
  const name = counterName.trim();
  if (!name) return;

  // 1) Delete from whichever map the user explicitly picked
  switch (type) {
    case "pvpkill":
      deletePvPKillCounter(name);
      break;
    case "kill":
      deleteKillCounter(name);
      break;
    case "death":
      deleteDeathCounter(name);
      break;
    case "block":
      deleteBlockCounter(name);
      break;
    case "container":
      deleteChestInteractionCounter(name);
      break;
    case "playtime": 
      deletePlaytimeCounter(name);
      break;
    case "distance":
      deleteDistanceCounter(name);
      break;
  }

  // 2) Now unconditionally remove from *every* prefix in case
  //    it lived in a different map or was mis-typed
  deletePvPKillCounter(name);
  deleteKillCounter(name);
  deleteDeathCounter(name);
  deleteBlockCounter(name);
  deleteChestInteractionCounter(name);
  deletePvPKillCounter(name);
  deleteDistanceCounter(name);



  addLog(`[Delete Error] Forced removal of counter '${name}' from all types`);
}

//------------------Teleport Back to Death Location Event --------------------------------
export const lastDeathPositions = new Map();

world.afterEvents.playerSpawn.subscribe(({ player }) => {
  // 2) Look up their saved death‐coords
  const deathPos = lastDeathPositions.get(player.name);
  if (!deathPos) return;        // nothing to do if they didn’t die under teleportVictim

  // 3) Teleport them back
  // You can also use player.teleport if you prefer the native API
  if (player.runCommandAsync) {
    // teleport via command (works in both legacy & modern)
    player.runCommandAsync(`tp @s ${deathPos.x} ${deathPos.y} ${deathPos.z}`);
  } else {
    // fallback: target by name
    player.dimension.runCommandAsync(
      `tp "${player.name}" ${deathPos.x} ${deathPos.y} ${deathPos.z}`
    );
  }

  // 4) Remove their record so this only happens once
  lastDeathPositions.delete(player.name);
});


//------------------------Reset Scores By Counter --------------------------
/**
 * Shows a confirmation form listing all scoreboard objectives associated with
 * the given counter, allowing the user to select which to reset (delete).
 * The counter itself is not deleted—only the selected objectives are removed.
 *
 * @param {Player} player       - the player who will see the form
 * @param {string} counterName  - the name of the counter
 * @param {object} config       - the counter’s config object
 * @param {string} type         - one of "pvpkill", "kill", "death", "block", "container", "playtime", etc.
 */
export function showResetCounterScoresForm(player, counterName, config, type) {
  // 1) Build a list of all associated objective IDs & friendly labels
  const entries = [];

  // Common: config.objectiveName/displayName (could be array or single)
  if (Array.isArray(config.objectiveName)) {
    config.objectiveName.forEach((id, idx) => {
      const label = Array.isArray(config.displayName)
        ? config.displayName[idx] || id
        : config.displayName || id;
      entries.push({ id, label: `${id} (${label})` });
    });
  } else if (config.objectiveName) {
    const id = config.objectiveName;
    const label = (Array.isArray(config.displayName)
      ? config.displayName[0]
      : config.displayName) || id;
    entries.push({ id, label: `${id} (${label})` });
  }

  // PvP-type: also include victimScore objectives if enabled
  if (type === "pvpkill" && config.victimScore?.victimScoreEnabled) {
    if (Array.isArray(config.victimScore.victimScoreObjective)) {
      config.victimScore.victimScoreObjective.forEach((id, idx) => {
        const label = Array.isArray(config.victimScore.victimScoreDisplayName)
          ? config.victimScore.victimScoreDisplayName[idx] || id
          : config.victimScore.victimScoreDisplayName || id;
        entries.push({ id, label: `${id} (${label})` });
      });
    } else if (config.victimScore.victimScoreObjective) {
      const id = config.victimScore.victimScoreObjective;
      const label = config.victimScore.victimScoreDisplayName || id;
      entries.push({ id, label: `${id} (${label})` });
    }
  }

  // Playtime: include each “seconds”, “minutes”, “hours”, “days”, and the limit‐flag objective
  if (type === "playtime") {
    if (config.secondsDisplayEnabled && config.secondsObjectiveName) {
      entries.push({
        id: config.secondsObjectiveName,
        label: `${config.secondsObjectiveName} (${config.secondsDisplayName || ""})`
      });
    }
    if (config.minutesDisplayEnabled && config.minutesObjectiveName) {
      entries.push({
        id: config.minutesObjectiveName,
        label: `${config.minutesObjectiveName} (${config.minutesDisplayName || ""})`
      });
    }
    if (config.hoursDisplayEnabled && config.hoursObjectiveName) {
      entries.push({
        id: config.hoursObjectiveName,
        label: `${config.hoursObjectiveName} (${config.hoursDisplayName || ""})`
      });
    }
    if (config.daysDisplayEnabled && config.daysObjectiveName) {
      entries.push({
        id: config.daysObjectiveName,
        label: `${config.daysObjectiveName} (${config.daysDisplayName || ""})`
      });
    }
    // “Limit reached” scoreboard is named playtimeLimit_<counterName>
    const limitId = `playtimeLimit_${counterName}`;
    entries.push({ id: limitId, label: `${limitId} (Limit Flag)` });
  }

  // If no objectives found, inform and return
  if (entries.length === 0) {
    player.sendMessage(`§cNo score objectives found for counter '${counterName}'.`);
    return;
  }

  // 2) Build a modal form with a toggle for each entry, plus a final “Cancel” toggle
  const form = new ModalFormData().title(`Reset Scores for '${counterName}'`);
  entries.forEach(e => {
    form.toggle(e.label, false);
  });
  form.toggle("Cancel (Do nothing)", false);

  form.show(player).then(res => {
    if (res.canceled) return;
    const values = res.formValues;
    const cancelIndex = entries.length; // last toggle is “Cancel”
    if (values[cancelIndex]) {
      player.sendMessage("Operation canceled. No scores were reset.");
      return;
    }

    // 3) For each checked toggle (except cancel), remove objective and its “_display”
    entries.forEach((e, i) => {
      if (!values[i]) return;
      try {
        world.scoreboard.removeObjective(e.id);
      } catch {}
      try {
        world.scoreboard.removeObjective(`${e.id}_display`);
      } catch {}
    });

    player.sendMessage(`§aSelected score objectives for '${counterName}' have been reset.`);
    addLog(`§c[Reset Scorebaords]§r ${player.name} reset selected scores for '${counterName}'.`);
  });
}
