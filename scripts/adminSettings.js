import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { showSettingsMenu } from "./main.js";
import { updateAllRatios } from "./ratio.js";

export {
    loadAdminConfig,
    saveAdminConfig,
    defaultAdminConfig,
    adminConfig
  };
  

// Dynamic property prefix
const ADMIN_CONFIG_PREFIX = "sharkCounters:adminConfig";

// Default single admin config object
const defaultAdminConfig = {
  adminItemIdentifier: "minecraft:allow",
  playerItemIdentifier: "minecraft:stick",
  requireAdminItemTag: true,
  requirePlayerItemTag: false,
  adminItemTag: "admin",
  playerItemTag: "",
  adminNameList: [],
  banList: [],
  banKick: true,
  banCommand: "",
  softBanList: [],
  softBanTeleport: true,
  softBanTeleportCoords: { x: 0, y: 0, z: 0 },
  softBanAreaX: { min: 0, max: 0 },
  softBanAreaY: { min: 0, max: 0 },
  softBanAreaZ: { min: 0, max: 0 },
  softBanCommand: "",
  knownPlayers: [],
  ownerList: [],
  scoreDisplayList: [],
  scoreDisplayListEnabled: true,
  scoreDisplayListDelay: 15,
  scoreDisplaySidebar: [],
  scoreDisplaySidebarEnabled: true,
  scoreDisplaySidebarDelay: 15,
  scoreDisplayBelowName: [],
  scoreDisplayBelowNameEnabled: true,
  scoreDisplayBelowNameDelay: 15
};


const adminConfig = { ...defaultAdminConfig };


function loadAdminConfig() {
  let parsed = {};
  const raw = world.getDynamicProperty(ADMIN_CONFIG_PREFIX);
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse adminConfig:", e);
      parsed = {};
    }
  }
  // Merge saved → default so missing keys (like knownPlayers) get added
  return { ...defaultAdminConfig, ...parsed };
}

/**
 * Save the adminConfig object to dynamic properties.
 * @param {Object} config
 */
function saveAdminConfig(config) {
  try {
    world.setDynamicProperty(ADMIN_CONFIG_PREFIX, JSON.stringify(config));
  } catch (e) {
    console.error("[AdminSettings] failed to save config:", e);
  }
}


//-----------------------Item Settings Menu-----------------------
export function showEditItemSettingsForm(player) {
  const cfg = loadAdminConfig() || defaultAdminConfig;

  new ModalFormData()
    .title("Item Settings")
    .textField("Admin Item Identifier", "Enter item identifier", cfg.adminItemIdentifier)
    .textField("Player Item Identifier", "Enter player item identifier", cfg.playerItemIdentifier)
    .toggle("Require Admin Item Tag", cfg.requireAdminItemTag)
    .toggle("Require Player Item Tag", cfg.requirePlayerItemTag)
    .textField("Admin Item Tag", "Enter admin item tag", cfg.adminItemTag)
    .textField("Player Item Tag", "Enter player item tag", cfg.playerItemTag)
    .show(player)
    .then(res => {
      if (res.canceled) return;
      const [
        adminId,
        playerId,
        requireAdmin,
        requirePlayer,
        adminTag,
        playerTag
      ] = res.formValues;

      const newCfg = {
        ...cfg,
        adminItemIdentifier:    adminId.trim()    || defaultAdminConfig.adminItemIdentifier,
        playerItemIdentifier:   playerId.trim()   || defaultAdminConfig.playerItemIdentifier,
        requireAdminItemTag:    requireAdmin,
        requirePlayerItemTag:   requirePlayer,
        adminItemTag:           adminTag.trim()   || defaultAdminConfig.adminItemTag,
        playerItemTag:          playerTag.trim()  || defaultAdminConfig.playerItemTag,
        // leave cfg.adminNameList untouched here
      };

      saveAdminConfig(newCfg);
      player.sendMessage("Item settings saved.");
    });
}

export async function showAdminSettings(player) {
  // 1) load config (with defaults)
  const cfg          = loadAdminConfig() || defaultAdminConfig;
  const knownPlayers = cfg.knownPlayers || [];

  // Admin lists
  const ownerList       = cfg.ownerList       || [];
  const adminList       = cfg.adminNameList   || [];
  const currentAdmins   = [...ownerList, ...adminList];
  const addAdminList    = knownPlayers.filter(n => !currentAdmins.includes(n));
  const removeAdminList = adminList.filter(n => !ownerList.includes(n));

  // Owner lists
  const currentOwners   = ownerList;
  const addOwnerList    = knownPlayers.filter(n => !ownerList.includes(n));
  const removeOwnerList = ownerList;

  // 2) build placeholder-backed option arrays
  const addAdminOptions    = addAdminList.length    ? ["Select a player", ...addAdminList]    : ["<no one available>"];
  const removeAdminOptions = removeAdminList.length ? ["Select a player", ...removeAdminList] : ["<none to remove>"];
  const addOwnerOptions    = addOwnerList.length    ? ["Select a player", ...addOwnerList]    : ["<no one available>"];
  const removeOwnerOptions = removeOwnerList.length ? ["Select a player", ...removeOwnerList] : ["<none to remove>"];

  // 3) build form
  const form = new ModalFormData()
    .title("Admin Settings")

    // — Admin section —
    .dropdown(
      "Current Admins (menu permisions)",
      currentAdmins.length ? currentAdmins : ["<none>"]
    )
    .dropdown("Add Admin",    addAdminOptions)
    .dropdown("Remove Admin", removeAdminOptions)
    .textField("Enter custom admin name", "Any name not in knownPlayers", "")

    // — Owner section —
    .dropdown(
      "Current Owners (full permissions to view even this menu)",
      currentOwners.length ? currentOwners : ["<none>"]
    )
    .dropdown("Add Owner",    addOwnerOptions)
    .dropdown("Remove Owner", removeOwnerOptions)
    .textField("Enter custom owner name", "Any name not in knownPlayers", "");

  // 4) show + bail if canceled
  const res = await form.show(player);
  if (res.canceled || !res.formValues) return;

  // 5) unpack indices & names
  const [
    /*curAdmin*/, addAdminIdx, remAdminIdx, customAdminName,
    /*curOwner*/, addOwnerIdx, remOwnerIdx, customOwnerName
  ] = res.formValues;

  // 6) apply Admin changes only if index > 0
  if (addAdminIdx > 0) {
    const toAdd = addAdminList[addAdminIdx - 1];
    if (cfg.adminNameList.includes(toAdd)) {
      player.sendMessage(`§c${toAdd} is already an admin.`);
      return;
    }
    if (!cfg.adminNameList.includes(toAdd)) {  
      cfg.adminNameList.push(toAdd);
    player.sendMessage(`§aAdded ${toAdd} as admin.`);
    }
    }
  if (remAdminIdx > 0) {
    const toRemove = removeAdminList[remAdminIdx - 1];
    cfg.adminNameList = cfg.adminNameList.filter(n => n !== toRemove);
    player.sendMessage(`§cRemoved ${toRemove} from admins.`);
  }
  const customAdmin = customAdminName.trim();
  if (customAdmin) {
    if (!cfg.adminNameList.includes(customAdmin)) {
      cfg.adminNameList.push(customAdmin);
    player.sendMessage(`§aAdded custom admin: ${customAdmin}.`);
    }
    if (cfg.adminNameList.includes(customAdmin)) { 
      player.sendMessage(`§cCustom admin ${customAdmin} already is in list.`);
    }
  }

  // 7) apply Owner changes only if index > 0
  if (addOwnerIdx > 0) {
    const toAddOwner = addOwnerList[addOwnerIdx - 1];
    if (cfg.ownerList.includes(toAddOwner)) {
      player.sendMessage(`§c${toAddOwner} is already an owner.`);
      return;
    }
    if (!cfg.ownerList.includes(toAddOwner)) {
    cfg.ownerList.push(toAddOwner);
    player.sendMessage(`§aAdded ${toAddOwner} as owner.`);
    }
  }
  if (remOwnerIdx > 0) {
    const toRemoveOwner = removeOwnerList[remOwnerIdx - 1];
    cfg.ownerList = cfg.ownerList.filter(n => n !== toRemoveOwner);
    player.sendMessage(`§cRemoved ${toRemoveOwner} from owners.`);
  }
  const customOwner = customOwnerName.trim();
  if (customOwner) {
    if (!cfg.ownerList.includes(customOwner)) {
       cfg.ownerList.push(customOwner);
      
    player.sendMessage(`§aAdded custom owner: ${customOwner}.`);
    }
    if (cfg.ownerList.includes(customOwner)) { 
      player.sendMessage(`§cCustom owner ${customOwner} already is in list.`);
    }
  }

  // 8) persist
  saveAdminConfig(cfg);
}


//------------------------Score Display Settings Menu------------------------
export async function showScoreDisplaySettingsMenu(player) {
  // 1) Load existing adminConfig or fall back to defaults
  const cfg = loadAdminConfig() || defaultAdminConfig;

  // Ensure arrays exist
  const listArr    = Array.isArray(cfg.scoreDisplayList)    ? cfg.scoreDisplayList    : [];
  const sidebarArr = Array.isArray(cfg.scoreDisplaySidebar) ? cfg.scoreDisplaySidebar : [];
  const belowArr   = Array.isArray(cfg.scoreDisplayBelowName) ? cfg.scoreDisplayBelowName : [];

  // 2) Prepare initial values
  const initialListEnabled    = Boolean(cfg.scoreDisplayListEnabled);
  const initialListText       = listArr.join(", ");
  const initialListDelay      = (cfg.scoreDisplayListDelay ?? 15).toString();

  const initialSidebarEnabled = Boolean(cfg.scoreDisplaySidebarEnabled);
  const initialSidebarText    = sidebarArr.join(", ");
  const initialSidebarDelay   = (cfg.scoreDisplaySidebarDelay ?? 15).toString();

  const initialBelowEnabled   = Boolean(cfg.scoreDisplayBelowNameEnabled);
  const initialBelowText      = belowArr.join(", ");
  const initialBelowDelay     = (cfg.scoreDisplayBelowNameDelay ?? 15).toString();

  // 3) Build the form
  const form = new ModalFormData()
    .title("Score Display Settings")
    // List slot settings
    .toggle("List Display Enabled (will create its own displayObjective)",                initialListEnabled)
    .textField("Objectives for List (e.g. kills,deaths) (use format colors)", initialListText)
    .textField("List Delay (seconds)",             initialListDelay)
    // Sidebar slot settings
    .toggle("Sidebar Display Enabled",             initialSidebarEnabled)
    .textField("Objectives for Sidebar (e.g. kills,deaths) (use format colors)", initialSidebarText)
    .textField("Sidebar Delay (seconds)",          initialSidebarDelay)
    // Below-Name slot settings
    .toggle("Below-Name Display Enabled",          initialBelowEnabled)
    .textField("Objectives for Below-Name (e.g. kills,deaths) (use format colors)", initialBelowText)
    .textField("Below-Name Delay (seconds)",       initialBelowDelay);

  const res = await form.show(player);
  if (res.canceled || !res.formValues) return;

  // 4) Parse form values
  const [
    listEnabledRaw,   // 0
    listTextRaw,      // 1
    listDelayRaw,     // 2
    sidebarEnabledRaw,// 3
    sidebarTextRaw,   // 4
    sidebarDelayRaw,  // 5
    belowEnabledRaw,  // 6
    belowTextRaw,     // 7
    belowDelayRaw     // 8
  ] = res.formValues;

  // Booleans
  const scoreDisplayListEnabled    = Boolean(listEnabledRaw);
  const scoreDisplaySidebarEnabled = Boolean(sidebarEnabledRaw);
  const scoreDisplayBelowNameEnabled = Boolean(belowEnabledRaw);

  // Parse objectives lists
  const scoreDisplayList = listTextRaw.trim()
    ? listTextRaw.split(",").map(s => s.trim()).filter(s => s.length > 0)
    : [];
  const scoreDisplaySidebar = sidebarTextRaw.trim()
    ? sidebarTextRaw.split(",").map(s => s.trim()).filter(s => s.length > 0)
    : [];
  const scoreDisplayBelowName = belowTextRaw.trim()
    ? belowTextRaw.split(",").map(s => s.trim()).filter(s => s.length > 0)
    : [];

  // Parse delays (in seconds)
  let scoreDisplayListDelay = parseInt(listDelayRaw.trim(), 10);
  if (isNaN(scoreDisplayListDelay) || scoreDisplayListDelay <= 0) {
    scoreDisplayListDelay = cfg.scoreDisplayListDelay ?? 15;
  }
  let scoreDisplaySidebarDelay = parseInt(sidebarDelayRaw.trim(), 10);
  if (isNaN(scoreDisplaySidebarDelay) || scoreDisplaySidebarDelay <= 0) {
    scoreDisplaySidebarDelay = cfg.scoreDisplaySidebarDelay ?? 15;
  }
  let scoreDisplayBelowNameDelay = parseInt(belowDelayRaw.trim(), 10);
  if (isNaN(scoreDisplayBelowNameDelay) || scoreDisplayBelowNameDelay <= 0) {
    scoreDisplayBelowNameDelay = cfg.scoreDisplayBelowNameDelay ?? 15;
  }

  // 5) Merge into config and save
  const updated = {
    ...cfg,
    scoreDisplayList,
    scoreDisplayListEnabled,
    scoreDisplayListDelay,
    scoreDisplaySidebar,
    scoreDisplaySidebarEnabled,
    scoreDisplaySidebarDelay,
    scoreDisplayBelowName,
    scoreDisplayBelowNameEnabled,
    scoreDisplayBelowNameDelay
  };
  saveAdminConfig(updated);

  player.sendMessage("§aScore display settings saved.");
}


//---------------------------------------------------------------------------

//--------------------------Score Display Loops------------------------------

let listIndex = 0;
let sidebarIndex = 0;
let belowNameIndex = 0;
let listCounter = 0;
let sidebarCounter = 0;
let belowNameCounter = 0;

// Helper: create/update the “<id>_display” objective and copy scores
function updateDisplayObjective(overworld, raw) {
  const idNoColor = raw.replace(/§./g, "").toLowerCase();
  const dispObj = `${idNoColor}_display`;
  const colorCodes = (raw.match(/§./g) || []).join("");
  const displayName = colorCodes +
    idNoColor.charAt(0).toUpperCase() +
    idNoColor.slice(1);

  // Remove & re-add the “_display” objective with the correct name
  overworld.runCommand(`scoreboard objectives remove ${dispObj}`);
  overworld.runCommand(`scoreboard objectives add ${dispObj} dummy "${displayName}"`);
  // Copy every player's real "<idNoColor>" score into "<idNoColor>_display"
  overworld.runCommand(`execute as @a run scoreboard players operation @s ${dispObj} = @s ${idNoColor}`);
}

// This runs once every second (20 ticks)
system.runInterval(() => {
  const cfg = loadAdminConfig() || defaultAdminConfig;
  const overworld = world.getDimension("overworld");
  updateAllRatios();
    const anyEnabled =
    cfg.scoreDisplayListEnabled ||
    cfg.scoreDisplaySidebarEnabled ||
    cfg.scoreDisplayBelowNameEnabled;
  if (!anyEnabled) return;

  // ─── LIST SLOT ROTATION ───────────────────────────────────────────────────
  if (cfg.scoreDisplayListEnabled === true) {
    const listArr = Array.isArray(cfg.scoreDisplayList) ? cfg.scoreDisplayList : [];
    if (listArr.length > 0) {
      listCounter += 1;
      if (listCounter >= (cfg.scoreDisplayListDelay || 15)) {
        const raw = listArr[listIndex % listArr.length];
        // Update the corresponding “_display” objective only now
        updateDisplayObjective(overworld, raw);
        const idNoColor = raw.replace(/§./g, "").toLowerCase();
        overworld.runCommand(`scoreboard objectives setdisplay list "${idNoColor}_display"`);

        listIndex = (listIndex + 1) % listArr.length;
        listCounter = 0;
      }
    }
  }

  // ─── SIDEBAR SLOT ROTATION ─────────────────────────────────────────────────
  if (cfg.scoreDisplaySidebarEnabled === true) {
    const sideArr = Array.isArray(cfg.scoreDisplaySidebar) ? cfg.scoreDisplaySidebar : [];
    if (sideArr.length > 0) {
      sidebarCounter += 1;
      if (sidebarCounter >= (cfg.scoreDisplaySidebarDelay || 15)) {
        const raw = sideArr[sidebarIndex % sideArr.length];
        updateDisplayObjective(overworld, raw);
        const idNoColor = raw.replace(/§./g, "").toLowerCase();
        overworld.runCommand(`scoreboard objectives setdisplay sidebar "${idNoColor}_display"`);

        sidebarIndex = (sidebarIndex + 1) % sideArr.length;
        sidebarCounter = 0;
      }
    }
  }

  // ─── BELOW-NAME SLOT ROTATION ──────────────────────────────────────────────
  if (cfg.scoreDisplayBelowNameEnabled === true) {
    const belowArr = Array.isArray(cfg.scoreDisplayBelowName) ? cfg.scoreDisplayBelowName : [];
    if (belowArr.length > 0) {
      belowNameCounter += 1;
      //Happy Crafting!!!
      if (belowNameCounter >= (cfg.scoreDisplayBelowNameDelay || 15)) {
        const raw = belowArr[belowNameIndex % belowArr.length];
        updateDisplayObjective(overworld, raw);
        const idNoColor = raw.replace(/§./g, "").toLowerCase();
        overworld.runCommand(`scoreboard objectives setdisplay belowname "${idNoColor}_display"`);

        belowNameIndex = (belowNameIndex + 1) % belowArr.length;
        belowNameCounter = 0;
      }
    }
  }

}, 20);
