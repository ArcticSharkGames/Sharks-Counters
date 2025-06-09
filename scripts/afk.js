import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { world, system, Player } from "@minecraft/server";
import {showSettingsMenu, createScoreboardIfNotExists, adminMainMenu, getScoreSafe, applyDeltaSafely} from "./main"
import { addLog } from "./logManager";
import {loadAdminConfig, saveAdminConfig, adminConfig, defaultAdminConfig} from "./adminSettings.js";

//------------------------AFK SYSTEM and Ban System-------------------------------------


//------------------------LOAD and SAVE Data-------------------------------------
/**
 * Default AFK settings schema.
 */
const DEFAULT_AFK_SETTINGS = {
  enabled: false,
  kickEnabled: true,
  timeoutMinutes: 5,
  kickAfterMinutes: 30,
  playerMessage: "You are now AFK.",
  requiredTags: ["!admin"],
  playerScoreFilter: { objective: "none", min: 1, max: 1 },
  playerLocantionEnabled: false,
  playerLocation: {
    x: { min: -100, max: 100 },
    y: { min: -100, max: 100 },
    z: { min: -100, max: 100 },
  },
  playerCommands: [],
  playerScore: {
    objective: "none",
    min: 1,
    max: 1,
    mode: "add"
  },
};

// Load AFK settings from dynamic property (or set default if not found)
/**
 * Loads the AFK settings from the world’s dynamic properties,
 * merging any saved values on top of the defaults.
 *
 * @returns {{
 *   enabled: boolean,
 *   timeoutMinutes: number,
 *   includeMods: boolean,
 *   kickAfterMinutes: number,
 *   excludedTags: string[]
 * }}
 */
export function loadAfkSettings() {
  const raw = world.getDynamicProperty("afkSettings");
  if (!raw) return { ...DEFAULT_AFK_SETTINGS };

  try {
    const parsed = JSON.parse(raw);
    // Merge so that any missing keys fall back to defaults
    return { ...DEFAULT_AFK_SETTINGS, ...parsed };
  } catch (err) {
    console.warn("Failed to parse afkSettings, using defaults:", err);
    return { ...DEFAULT_AFK_SETTINGS };
  }
}

/**
 * @param {object} settings
 */
export function saveAfkSettings(settings) {
  // Re-merge with defaults so we always write a complete object
  const toSave = { ...DEFAULT_AFK_SETTINGS, ...settings };
  world.setDynamicProperty("afkSettings", JSON.stringify(toSave));
}




//----------------------------------------Admin AFK Settings Menu-----------------------------------------------

export async function showAfkSettingsMenu(player) {
  // 1) Load existing settings or fall back to defaults
  const cfg = loadAfkSettings() || { ...DEFAULT_AFK_SETTINGS };

  // ─── Repair legacy playerLocation values if they come in as numbers ───────
  ["x", "y", "z"].forEach(axis => {
    const val = cfg.playerLocation?.[axis];
    if (typeof val === "number") {
      cfg.playerLocation[axis] = { min: val, max: val };
    }
  });
  if (!cfg.playerLocation) {
    cfg.playerLocation = { ...DEFAULT_AFK_SETTINGS.playerLocation };
  }

  // Ensure new toggle field exists
  if (typeof cfg.playerLocantionEnabled !== "boolean") {
    cfg.playerLocantionEnabled = DEFAULT_AFK_SETTINGS.playerLocantionEnabled || false;
  }

  // Repair playerScoreFilter if missing/malformed
  if (
    !cfg.playerScoreFilter ||
    typeof cfg.playerScoreFilter.objective !== "string" ||
    typeof cfg.playerScoreFilter.min !== "number" ||
    typeof cfg.playerScoreFilter.max !== "number"
  ) {
    cfg.playerScoreFilter = { ...DEFAULT_AFK_SETTINGS.playerScoreFilter };
  }
  // Repair playerScore if missing/malformed
  if (
    !cfg.playerScore ||
    typeof cfg.playerScore.objective !== "string" ||
    typeof cfg.playerScore.min !== "number" ||
    typeof cfg.playerScore.max !== "number" ||
    (cfg.playerScore.mode !== "add" && cfg.playerScore.mode !== "remove")
  ) {
    cfg.playerScore = { ...DEFAULT_AFK_SETTINGS.playerScore };
  }

  // 2) Prepare “initial” values for the form:

  // Booleans
  const initialEnabled               = Boolean(cfg.enabled);
  const initialKickEnabled           = Boolean(cfg.kickEnabled);
  const initialPlayerLocationEnabled = Boolean(cfg.playerLocantionEnabled);

  // Numeric → string
  const initialTimeout               = cfg.timeoutMinutes.toString();
  const initialKickAfter             = cfg.kickAfterMinutes.toString();

  // AFK message (string)
  const initialPlayerMessage         = cfg.playerMessage;

  // Required tags: array → comma-separated string
  const initialRequiredTags          = Array.isArray(cfg.requiredTags)
    ? cfg.requiredTags.join(", ")
    : "";

  // PlayerScoreFilter: objective name (string)
  const initialFilterObj             = cfg.playerScoreFilter.objective || "";
  // PlayerScoreFilter: range → "min..max"
  const initialFilterRange           = `${cfg.playerScoreFilter.min}..${cfg.playerScoreFilter.max}`;

  // PlayerScore (to set): objective name (string)
  const initialSetObj                = cfg.playerScore.objective || "";
  // PlayerScore (to set): range → "min..max"
  const initialSetRange              = `${cfg.playerScore.min}..${cfg.playerScore.max}`;
  // PlayerScore (to set): mode index (0="add", 1="remove")
  const initialSetMode               = cfg.playerScore.mode === "remove" ? 1 : 0;

  // Location ranges (x,y,z) → "xmin..xmax,ymin..ymax,zmin..zmax"
  let initialLocRange                = "0..0,0..0,0..0";
  if (
    cfg.playerLocation &&
    cfg.playerLocation.x &&
    cfg.playerLocation.y &&
    cfg.playerLocation.z
  ) {
    const { x, y, z } = cfg.playerLocation;
    initialLocRange = `${x.min}..${x.max},${y.min}..${y.max},${z.min}..${z.max}`;
  }

  // Player commands: array → comma-separated string
  const initialPlayerCommands        = Array.isArray(cfg.playerCommands)
    ? cfg.playerCommands.join(", ")
    : "";

  // 3) Build the form
  const form = new ModalFormData()
    .title("AFK Settings")
    // — Master Toggle —
    .toggle("AFK System Enabled",             initialEnabled)                   // index 0
    // — Kick Settings —
    .toggle("Kick Enabled",                   initialKickEnabled)               // index 1
    .textField("Kick After (minutes)",        initialKickAfter)                 // index 2
    // — Timeout —
    .textField("Timeout (minutes)",           initialTimeout)                   // index 3
    // — Player AFK Message —
    .textField("Player AFK Message",          initialPlayerMessage)             // index 4
    // — Required Tags —
    .textField(
      "Required Tags (comma-separated, e.g. !admin,!mod)",
      initialRequiredTags                                // index 5
    )
    // — PlayerScoreFilter (who qualifies) —
    .textField("Filter Objective Name",        initialFilterObj)                // index 6
    .textField("Filter Score Range (min..max)", initialFilterRange)            // index 7
    // — PlayerScore to Set When AFK —
    .textField("Set Score Objective Name",     initialSetObj)                   // index 8
    .textField("Set Score Range (min..max)",   initialSetRange)                 // index 9
    .dropdown("Set Score Mode", ["Add Score","Remove Score"], initialSetMode)    // index 10
    // — Location Toggle + Ranges —
    .toggle("Enable Location Filter",          initialPlayerLocationEnabled)     // index 11
    .textField(
      "Location Ranges (x..x,y..y,z..z)",
      initialLocRange                                    // index 12
    )
    // — Commands to Run When AFK —
    .textField(
      "Commands to run on AFK (comma-separated)",
      initialPlayerCommands                              // index 13
    );

  const res = await form.show(player);
  if (res.canceled || !res.formValues) return;

  // 4) Parse form values in exact same order:
  const [
    enabledRaw,            // 0
    kickEnabledRaw,        // 1
    kickAfterRaw,          // 2
    timeoutRaw,            // 3
    messageRaw,            // 4
    tagsRaw,               // 5
    filterObjRaw,          // 6
    filterRangeRaw,        // 7
    setObjRaw,             // 8
    setRangeRaw,           // 9
    setModeIdx,            // 10
    locToggleRaw,          // 11
    locRangeRaw,           // 12
    commandsRaw            // 13
  ] = res.formValues;

  // Booleans
  const enabled                 = Boolean(enabledRaw);
  const kickEnabled             = Boolean(kickEnabledRaw);
  const playerLocationEnabled   = Boolean(locToggleRaw);

  // Numeric fields
  let timeoutMinutes            = parseInt(timeoutRaw.trim(), 10);
  if (isNaN(timeoutMinutes) || timeoutMinutes < 0) {
    timeoutMinutes = cfg.timeoutMinutes;
  }
  let kickAfterMinutes          = parseInt(kickAfterRaw.trim(), 10);
  if (isNaN(kickAfterMinutes) || kickAfterMinutes < 0) {
    kickAfterMinutes = cfg.kickAfterMinutes;
  }

  // AFK message
  const playerMessage           = messageRaw.trim() !== ""
    ? messageRaw.trim()
    : cfg.playerMessage;

  // Required tags
  const requiredTags            = tagsRaw.trim()
    ? tagsRaw.split(",").map(s => s.trim()).filter(s => s.length > 0)
    : cfg.requiredTags;

  // PlayerScoreFilter parsing
  const filterObjective         = filterObjRaw.trim() !== ""
    ? filterObjRaw.trim()
    : cfg.playerScoreFilter.objective;
  let filterMin                 = cfg.playerScoreFilter.min;
  let filterMax                 = cfg.playerScoreFilter.max;
  if (filterRangeRaw.trim()) {
    const parts = filterRangeRaw.split("..").map(s => s.trim());
    if (parts.length === 2) {
      const a = parseInt(parts[0], 10),
            b = parseInt(parts[1], 10);
      if (!isNaN(a) && !isNaN(b)) {
        filterMin = a;
        filterMax = b;
      }
    }
  }

  // PlayerScore to set parsing
  const setObjective            = setObjRaw.trim() !== ""
    ? setObjRaw.trim()
    : cfg.playerScore.objective;
  let setMin                    = cfg.playerScore.min;
  let setMax                    = cfg.playerScore.max;
  if (setRangeRaw.trim()) {
    const parts = setRangeRaw.split("..").map(s => s.trim());
    if (parts.length === 2) {
      const a = parseInt(parts[0], 10),
            b = parseInt(parts[1], 10);
      if (!isNaN(a) && !isNaN(b)) {
        setMin = a;
        setMax = b;
      }
    }
  }
  const setMode                 = setModeIdx === 1 ? "remove" : "add";

  // Location ranges parsing (only if enabled)
  let playerLocation            = { ...cfg.playerLocation };
  if (playerLocationEnabled && locRangeRaw.trim()) {
    const axes = locRangeRaw.split(",").map(s => s.trim());
    if (axes.length === 3) {
      let parsedSuccess = true;
      const newLoc = {};
      ["x", "y", "z"].forEach((axis, i) => {
        const rangeStr = axes[i];
        const parts = rangeStr.split("..").map(s => s.trim());
        if (parts.length !== 2) {
          parsedSuccess = false;
          return;
        }
        const minVal = parseInt(parts[0], 10);
        const maxVal = parseInt(parts[1], 10);
        if (isNaN(minVal) || isNaN(maxVal)) {
          parsedSuccess = false;
          return;
        }
        newLoc[axis] = { min: minVal, max: maxVal };
      });
      if (parsedSuccess) {
        playerLocation = newLoc;
      } else {
        player.sendMessage("§cLocation parse failed; keeping previous.");
      }
    } else {
      player.sendMessage("§cLocation must be 3 comma-separated ranges.");
    }
  }

  // Player commands parsing
  const playerCommands          = commandsRaw.trim()
    ? commandsRaw.split(",").map(s => s.trim()).filter(s => s.length > 0)
    : cfg.playerCommands;

  // 5) Merge into new settings & save
  const updated = {
    enabled,
    kickEnabled,
    timeoutMinutes,
    kickAfterMinutes,
    playerMessage,
    requiredTags,
    playerLocationEnabled,
    playerLocation,
    playerCommands,
    playerScoreFilter: {
      objective: filterObjective,
      min: filterMin,
      max: filterMax
    },
    playerScore: {
      objective: setObjective,
      min: setMin,
      max: setMax,
      mode: setMode
    }
  };

  saveAfkSettings(updated);
  player.sendMessage("§aAFK settings saved.");
}


//----------------------------Player Activity System and Helpers ------------------------------------

// Track last activity timestamps by player name
let lastActivity = {};

// Update a player's last activity time
function updatePlayerActivity(player) {
  lastActivity[player.name] = Date.now();
}

// ─── Exemption Filter ────────────────────────────────────────────────────────
// Uses `settings.requiredTags`. Entries beginning with "!" indicate a tag that
// exempts that player (e.g. "!admin" means anyone with tag "admin" is exempt).
// Entries without "!" mean: if the player does NOT have that tag, they’re exempt.
function isExempt(player) {
  const settings = loadAfkSettings();

  for (const tagEntry of settings.requiredTags || []) {
    if (tagEntry.startsWith("!")) {
      // “!xyz” ⇒ exempt if player.hasTag("xyz")
      const t = tagEntry.slice(1);
      if (player.hasTag(t)) return true;
    } else {
      // “xyz” ⇒ exempt if player DOES NOT have tag "xyz"
      if (!player.hasTag(tagEntry)) return true;
    }
  }

  return false;
}

// ─── AFK Checks ───────────────────────────────────────────────────────────────
// Run once every AFK_CHECK_FREQUENCY ticks
const AFK_CHECK_FREQUENCY = 1200; // 60 seconds (20 ticks/sec * 60)

let tickCounter = 0;
system.runInterval(() => {
  tickCounter += AFK_CHECK_FREQUENCY;
  if (tickCounter >= AFK_CHECK_FREQUENCY) {
    checkAfkPlayers();
    tickCounter = 0;
  }
}, AFK_CHECK_FREQUENCY);

// When a player leaves, remove them from lastActivity
world.afterEvents.playerLeave.subscribe(ev => {
  delete lastActivity[ev.playerName];
});

// Track button input as activity
world.afterEvents.playerButtonInput.subscribe(ev => {
  updatePlayerActivity(ev.player);
});

// Track movement as activity (runs every 30 seconds: 600 ticks)
const lastPositions = new Map();
system.runInterval(() => {
  for (const player of world.getPlayers()) {
    const prev = lastPositions.get(player.name);
    const cur  = player.location;
    if (!prev || prev.x !== cur.x || prev.y !== cur.y || prev.z !== cur.z) {
      updatePlayerActivity(player);
      lastPositions.set(player.name, { x: cur.x, y: cur.y, z: cur.z });
    }
  }
}, 600);

// ─── Core AFK Logic ───────────────────────────────────────────────────────────
export function checkAfkPlayers() {
  const settings = loadAfkSettings();
  if (!settings.enabled) return;

  const now = Date.now();
  const overworld = world.getDimension("overworld");

  for (const player of world.getPlayers()) {
    const name = player.name;

    // 1) Exemptions
    if (isExempt(player)) continue;

    // 2) Score Filter (if objective ≠ "none")
    if (settings.playerScoreFilter.objective !== "none") {
      const objName = settings.playerScoreFilter.objective;
      const score   = getScoreSafe(name, objName) || 0;
      const { min, max } = settings.playerScoreFilter;

      if (settings.playerScore.mode === "add") {
        if (score < min || score > max) {
          continue;
        }
      } else { // mode="remove"
        if (score >= min && score <= max) {
          continue;
        }
      }
    }

    // 3) Location Filter (if enabled)
    if (settings.playerLocationEnabled) {
      const loc = player.location;
      const { x: xr, y: yr, z: zr } = settings.playerLocation;

      if (
        loc.x < xr.min || loc.x > xr.max ||
        loc.y < yr.min || loc.y > yr.max ||
        loc.z < zr.min || loc.z > zr.max
      ) {
        continue;
      }
    }

    // 4) Determine idle time
    const last = lastActivity[name] || now;
    const idleMins = (now - last) / 1000 / 60;

    // 5) If they've exceeded timeout, mark AFK
    if (idleMins >= settings.timeoutMinutes) {
      player.sendMessage("§eYou are now AFK.");

      // Run any playerCommands they requested
      for (const cmd of settings.playerCommands) {
        overworld.runCommand(`execute as "${name}" run ${cmd}`);
      }

      // 6) If kicking is enabled and they exceed kickAfterMinutes, kick
      if (
        settings.kickEnabled &&
        settings.kickAfterMinutes > 0 &&
        idleMins >= settings.kickAfterMinutes
      ) {
        addLog(`[Afk-Kick] ${name} was kicked for AFK.`);
        player.sendMessage("§cYou were kicked for being AFK.");
        overworld.runCommand(`kick "${name}"`);
      }
    }
  }
}





//-----------------------------Ban Functions-------------------------------------

export function isBanned(player) {
  // always pull fresh config so we see the latest banList
  const cfg = loadAdminConfig() || defaultAdminConfig;
  return cfg.banList
    .some(n => n.toLowerCase() === player.name.toLowerCase());
}

const banCommandRunThisSession = new Set();
const softBanCommandRunThisSession = new Set();
const softBanTeleportRunThisSession = new Set();

export function checkBannedPlayers() {
  const cfg = loadAdminConfig() || defaultAdminConfig;
  const overworld = world.getDimension("overworld");

  for (const player of world.getPlayers()) {
    const name = player.nameTag;

    // ─── Skip owners/admins or anyone with the admin‐item tag ──────────────
    const isOwner   = Array.isArray(cfg.ownerList) && cfg.ownerList.includes(name);
    const isAdmin   = Array.isArray(cfg.adminNameList) && cfg.adminNameList.includes(name);
    const hasAdminTag = cfg.adminItemTag && player.hasTag(cfg.adminItemTag);
    if (isOwner || isAdmin || hasAdminTag) {
      continue;
    }

    const isHardBanned = Array.isArray(cfg.banList) && cfg.banList.includes(name);
    const isSoftBanned = Array.isArray(cfg.softBanList) && cfg.softBanList.includes(name);
    const banKickEnabled = Boolean(cfg.banKick);

    // ─── 1) Handle “hard” ban (banList) ─────────────────────────────────────
    if (isHardBanned) {
      // 1a) Run banCommand **once** per session
      if (cfg.banCommand && cfg.banCommand.trim() !== "" && !banCommandRunThisSession.has(name)) {
        const cmd = cfg.banCommand.trim();
        overworld.runCommand(`execute as "${name}" run ${cmd}`);
        banCommandRunThisSession.add(name);
      }

      // 1b) If banKick is enabled, kick immediately and skip any further logic
      if (banKickEnabled) {
        addLog(`[BAN-System] ${name} was kicked`);
        overworld.runCommand(`kick "${name}"`);
        continue;
      }
      // If banKick is disabled, fall through so they are treated like a “soft ban” below.
    }

    // ─── 2) Handle “soft” ban (either in softBanList, or in banList but banKick disabled) ────
    if (isSoftBanned || (isHardBanned && !banKickEnabled)) {
      // 2a) Run softBanCommand once per session
      if (cfg.softBanCommand && cfg.softBanCommand.trim() !== "" && !softBanCommandRunThisSession.has(name)) {
        const cmd = cfg.softBanCommand.trim();
        overworld.runCommand(`execute as "${name}" run ${cmd}`);
        softBanCommandRunThisSession.add(name);
      }

      // 2b) If softBanTeleport is enabled, teleport **once** per session to softBanTeleportCoords
      if (
        cfg.softBanTeleport &&
        cfg.softBanTeleportCoords &&
        !softBanTeleportRunThisSession.has(name)
      ) {
        const { x: tx, y: ty, z: tz } = cfg.softBanTeleportCoords;
        player.runCommandAsync(`tp @s ${tx} ${ty} ${tz}`);
        softBanTeleportRunThisSession.add(name);
      }

      // 2c) Continuously keep them within the configured softBanArea ranges.
      //     If they walk outside, teleport them back to softBanTeleportCoords.
      if (
        cfg.softBanAreaX && cfg.softBanAreaY && cfg.softBanAreaZ &&
        cfg.softBanTeleportCoords
      ) {
        const px = player.location.x;
        const py = player.location.y;
        const pz = player.location.z;
        const { min: xmin, max: xmax } = cfg.softBanAreaX;
        const { min: ymin, max: ymax } = cfg.softBanAreaY;
        const { min: zmin, max: zmax } = cfg.softBanAreaZ;

        // If outside any axis range, teleport back
        if (
          px < xmin || px > xmax ||
          py < ymin || py > ymax ||
          pz < zmin || pz > zmax
        ) {
          const { x: tx2, y: ty2, z: tz2 } = cfg.softBanTeleportCoords;
          player.runCommandAsync(`tp @s ${tx2} ${ty2} ${tz2}`);
        }
      }
    }
  }
}

// ─── Optional: Clear “once per join” tracking on leave so soft‐ban actions run again upon rejoin ───
world.afterEvents.playerLeave.subscribe(ev => {
  banCommandRunThisSession.delete(ev.playerName);
  softBanCommandRunThisSession.delete(ev.playerName);
  softBanTeleportRunThisSession.delete(ev.playerName);
});



//------------------------Ban System-------------------------------------
//------------- BAN MENU ----------------------------------------------------------------------------
export async function showManageBanMenu(player) {
  // 1) load config (with defaults)
  const cfg = loadAdminConfig() || defaultAdminConfig;

  // 2) seed knownPlayers from everyone currently online
  let didSeed = false;
  for (const p of world.getPlayers()) {
    const nm = p.nameTag;
    if (!cfg.knownPlayers.includes(nm)) {
      cfg.knownPlayers.push(nm);
      didSeed = true;
    }
  }
  if (didSeed) saveAdminConfig(cfg);

  // 3) build “currently banned” list (read‐only display)
  const banOptions = cfg.banList.length ? [...cfg.banList] : ["None"];

  // 4) build “add player” list: those knownPlayers who are not banned or owner
  const toBan = cfg.knownPlayers.filter(nm =>
    !cfg.banList.includes(nm) &&
    !cfg.ownerList.includes(nm)
  );
  const addOptions = toBan.length ? ["None", ...toBan] : ["None"];

  // 5) build “remove player” list: same as banList (plus “None” if empty)
  const removeOptions = cfg.banList.length ? ["None", ...cfg.banList] : ["None"];

  // 6) show combined form
  const form = new ModalFormData()
    .title("Manage Ban List")
    .dropdown("Currently banned (read‐only)", banOptions, 0)
    .dropdown("Select player to ban",       addOptions, 0)
    .dropdown("Select player to unban",     removeOptions, 0);

  const res = await form.show(player);
  if (res.canceled || !res.formValues) return;

  const [, addIdx, remIdx] = res.formValues;
  const didAdd    = addIdx > 0;
  const didRemove = remIdx > 0;

  // 7) ensure only one action at a time
  if (didAdd && didRemove) {
    player.sendMessage("§ePlease choose either Add or Remove, not both.");
    return;
  }

  // 8) handle “add to ban list”
  if (didAdd) {
    const nameToBan = addOptions[addIdx];
    if (cfg.banList.includes(nameToBan)) {
      player.sendMessage(`§e${nameToBan} is already banned.`);
      return;
    }
    cfg.banList.push(nameToBan);
    saveAdminConfig(cfg);

    // apply ban immediately
    checkBannedPlayers();
    player.sendMessage(`§aAdded ${nameToBan} to ban list.`);
    addLog(`[Ban-Manager] Admin: ${player.nameTag} added ${nameToBan} to ban list`);
    return;
  }

  // 9) handle “remove from ban list”
  if (didRemove) {
    const nameToUnban = removeOptions[remIdx];
    const banIndex = cfg.banList.indexOf(nameToUnban);
    if (banIndex === -1) {
      player.sendMessage(`§e${nameToUnban} is not in the ban list.`);
      return;
    }
    cfg.banList.splice(banIndex, 1);
    saveAdminConfig(cfg);

    // clear their “ban” scoreboard if they’re online
    const overworld = world.getDimension("overworld");
    overworld.runCommand(`scoreboard players reset "${nameToUnban}" ban`);

    player.sendMessage(`§aRemoved ${nameToUnban} from ban list.`);
    addLog(`[Ban-Manager] Admin: ${player.nameTag} removed ${nameToUnban} from ban list`);
    return;
  }

  // 10) if neither add nor remove was selected
  player.sendMessage("§eNo changes made to ban list.");
}

/**
 * Manage Bans submenu—just like showManageAdminsMenu.
 */
export function showManageBansMenu(player) {
  const form = new ActionFormData()
    .title("Manage Ban List")
    .body("Would you like to add or remove a ban?")
    .button("Manage Ban List")
    .button("Manage Soft-Ban List")
    .button("Ban Settings")
    .button("Back");

  form.show(player).then((response) => {
    
    if (response.selection === 0) return showManageBanMenu(player);
    if (response.selection === 1) return showManageSoftBanMenu(player);
    if (response.selection === 2) return showBanSettings(player);
    if (response.canceled || response.selection === 3) return showSettingsMenu(player);
  });
}

export async function showBanSettings(player) {
  // 1) load config (with defaults)
  const cfg = loadAdminConfig() || defaultAdminConfig;

  // ─── Repair any legacy numeric values ───────────────────────────────────
  if (typeof cfg.softBanAreaX === "number") {
    cfg.softBanAreaX = { min: cfg.softBanAreaX, max: cfg.softBanAreaX };
  }
  if (typeof cfg.softBanAreaY === "number") {
    cfg.softBanAreaY = { min: cfg.softBanAreaY, max: cfg.softBanAreaY };
  }
  if (typeof cfg.softBanAreaZ === "number") {
    cfg.softBanAreaZ = { min: cfg.softBanAreaZ, max: cfg.softBanAreaZ };
  }

  // 2) prepare initial values
  const initialBanKick         = cfg.banKick ?? false;
  const initialSoftBanTeleport = cfg.softBanTeleport ?? false;

  // stringify teleport coords as "x,y,z"
  const initCoords = cfg.softBanTeleportCoords
    ? `${cfg.softBanTeleportCoords.x},${cfg.softBanTeleportCoords.y},${cfg.softBanTeleportCoords.z}`
    : "0,0,0";

  // stringify area ranges as "min..max,min..max,min..max"
  const initArea = (
    cfg.softBanAreaX && cfg.softBanAreaY && cfg.softBanAreaZ
  )
    ? `${cfg.softBanAreaX.min}..${cfg.softBanAreaX.max},` +
      `${cfg.softBanAreaY.min}..${cfg.softBanAreaY.max},` +
      `${cfg.softBanAreaZ.min}..${cfg.softBanAreaZ.max}`
    : "0..0,0..0,0..0";

  // initial commands
  const initBanCommand     = cfg.banCommand     || "";
  const initSoftBanCommand = cfg.softBanCommand || "";

  // 3) build form
  const form = new ModalFormData()
    .title("Ban Settings")
    .toggle("Kick on Ban",                    initialBanKick)
    .toggle("Enable Soft-Ban Teleport",       initialSoftBanTeleport)
    .textField("Soft-Ban Teleport Coords (x,y,z)",        initCoords)
    .textField("Soft-Ban Area Ranges (x..x,y..y,z..z)",   initArea)
    .textField("Command to run on Ban",                    initBanCommand)
    .textField("Command to run on Soft-Ban",               initSoftBanCommand);

  const res = await form.show(player);
  if (res.canceled || !res.formValues) return;

  const [
    banKickRaw,
    softBanTeleportRaw,
    coordsRaw,
    areaRaw,
    banCommandRaw,
    softBanCommandRaw
  ] = res.formValues;

  // 4) parse back into typed values
  const banKick         = Boolean(banKickRaw);
  const softBanTeleport = Boolean(softBanTeleportRaw);

  // parse coords (keep previous if blank/invalid)
  let softBanTeleportCoords = cfg.softBanTeleportCoords || { x: 0, y: 0, z: 0 };
  if (coordsRaw.trim()) {
    const parts = coordsRaw.split(",").map(s => s.trim());
    if (parts.length === 3) {
      const [sx, sy, sz] = parts.map(n => parseInt(n, 10));
      if (!isNaN(sx) && !isNaN(sy) && !isNaN(sz)) {
        softBanTeleportCoords = { x: sx, y: sy, z: sz };
      } else {
        player.sendMessage("§cInvalid teleport coords—using previous values.");
      }
    } else {
      player.sendMessage("§cTeleport coords must be exactly three numbers: x,y,z.");
    }
  }

  // parse a single "min..max" string, allowing negative numbers
  function parseOneRange(str) {
    const parts = str.split("..");
    if (parts.length !== 2) throw new Error("Not exactly two parts");
    const min = parseInt(parts[0], 10);
    const max = parseInt(parts[1], 10);
    if (isNaN(min) || isNaN(max)) throw new Error("Not a valid integer");
    return { min, max };
  }

  // parse area ranges (keep previous if blank/invalid)
  let softBanAreaX = cfg.softBanAreaX;
  let softBanAreaY = cfg.softBanAreaY;
  let softBanAreaZ = cfg.softBanAreaZ;
  if (areaRaw.trim()) {
    const ranges = areaRaw.split(",").map(s => s.trim());
    if (ranges.length === 3) {
      try {
        const parsedX = parseOneRange(ranges[0]);
        const parsedY = parseOneRange(ranges[1]);
        const parsedZ = parseOneRange(ranges[2]);

        softBanAreaX = parsedX;
        softBanAreaY = parsedY;
        softBanAreaZ = parsedZ;
      } catch {
        player.sendMessage("§cInvalid area format—using previous values.");
      }
    } else {
      player.sendMessage("§cArea must be three comma‐separated ranges like x..x,y..y,z..z");
    }
  }

  // commands (use previous if input is empty)
  const banCommand     = banCommandRaw.trim()     !== "" ? banCommandRaw.trim()     : cfg.banCommand     || "";
  const softBanCommand = softBanCommandRaw.trim() !== "" ? softBanCommandRaw.trim() : cfg.softBanCommand || "";

  // 5) merge into config and save
  const updated = {
    ...cfg,
    banKick,
    softBanTeleport,
    softBanTeleportCoords,
    softBanAreaX,
    softBanAreaY,
    softBanAreaZ,
    banCommand,
    softBanCommand
  };
  saveAdminConfig(updated);

  player.sendMessage("§aBan settings saved.");
}


//------------------------Soft Ban Menu-------------------------------------

export async function showManageSoftBanMenu(player) {
  // 1) load config (with defaults)
  const cfg = loadAdminConfig() || defaultAdminConfig;

  // 2) seed knownPlayers from everyone currently online
  let didSeed = false;
  for (const p of world.getPlayers()) {
    const nm = p.nameTag;
    if (!cfg.knownPlayers.includes(nm)) {
      cfg.knownPlayers.push(nm);
      didSeed = true;
    }
  }
  if (didSeed) saveAdminConfig(cfg);

  // 3) build “currently soft-banned” list (read-only display)
  const softBanOptions = cfg.softBanList.length
    ? [...cfg.softBanList]
    : ["None"];

  // 4) build “add soft-ban” list: those knownPlayers who are not already soft-banned or owner
  const toSoftBan = cfg.knownPlayers.filter(nm =>
    !cfg.softBanList.includes(nm) &&
    !cfg.ownerList.includes(nm)
  );
  const addOptions = toSoftBan.length
    ? ["None", ...toSoftBan]
    : ["None"];

  // 5) build “remove soft-ban” list
  const removeOptions = cfg.softBanList.length
    ? ["None", ...cfg.softBanList]
    : ["None"];

  // 6) show combined form
  const form = new ModalFormData()
    .title("Manage Soft-Ban List")
    .dropdown("Currently soft-banned (read-only)", softBanOptions, 0)
    .dropdown("Select player to soft-ban",       addOptions,    0)
    .dropdown("Select player to un-soft-ban",    removeOptions, 0);

  const res = await form.show(player);
  if (res.canceled || !res.formValues) return;

  const [, addIdx, remIdx] = res.formValues;
  const didAdd    = addIdx > 0;
  const didRemove = remIdx > 0;

  // 7) ensure only one action at a time
  if (didAdd && didRemove) {
    player.sendMessage("§ePlease choose either Add or Remove, not both.");
    return;
  }

  // 8) handle “add to soft-ban list”
  if (didAdd) {
    const nameToSoftBan = addOptions[addIdx];
    if (cfg.softBanList.includes(nameToSoftBan)) {
      player.sendMessage(`§e${nameToSoftBan} is already soft-banned.`);
      return;
    }
    cfg.softBanList.push(nameToSoftBan);
    saveAdminConfig(cfg);

    player.sendMessage(`§aSoft-banned ${nameToSoftBan}.`);
    addLog(`[SoftBan-Manager] Admin: ${player.nameTag} added ${nameToSoftBan} to soft-ban list`);
    return;
  }

  // 9) handle “remove from soft-ban list”
  if (didRemove) {
    const nameToUnSoftBan = removeOptions[remIdx];
    const idx = cfg.softBanList.indexOf(nameToUnSoftBan);
    if (idx === -1) {
      player.sendMessage(`§e${nameToUnSoftBan} is not in the soft-ban list.`);
      return;
    }
    cfg.softBanList.splice(idx, 1);
    saveAdminConfig(cfg);

    player.sendMessage(`§aUn-soft-banned ${nameToUnSoftBan}.`);
    addLog(`[SoftBan-Manager] Admin: ${player.nameTag} removed ${nameToUnSoftBan} from soft-ban list`);
    return;
  }

  // 10) if neither add nor remove was selected
  player.sendMessage("§eNo changes made to soft-ban list.");
}
