// logManager.js - persistent log storage and UI

import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";


export {
    addLog,
    showLogMenu,
   showLogTypeMenu,
    loadLogLimit,
    saveLogConfigs,
    loadLogConfigs
  };

const LOGS_PREFIX = "sharkCounters:logs";
const LIMIT_PREFIX = "sharkCounters:logLimit";
const CONFIGS_PREFIX = "sharkCounters:logConfigs";
const DEFAULT_LOG_LIMIT = 200;

// Default log config keys and values
const defaultLogConfigs = {
  logPvP: false,
  logPlayerJoin: true,
  logPlayerLeave: true,
};

// Load saved logs array
function loadLogs() {
  try {
    const raw = world.getDynamicProperty(LOGS_PREFIX);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Save logs array persistently
function saveLogs(logs) {
  const MAX_BYTES = 32767;

  // Helper: get UTF-8 byte length of a string
  function getByteLength(str) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str).length;
    }
    // Fallback for no TextEncoder: approximate UTF-8 length
    let s = str.length;
    for (let i = str.length - 1; i >= 0; i--) {
      const code = str.charCodeAt(i);
      if (code > 0x7f && code <= 0x7ff) s++;
      else if (code > 0x7ff && code <= 0xffff) s += 2;
      // skip low surrogate in a pair
      if (code >= 0xdc00 && code <= 0xdfff) i--;
    }
    return s;
  }

  try {
    let raw = JSON.stringify(logs);
    let size = getByteLength(raw);

    // Trim oldest entries until under byte limit
    while (size > MAX_BYTES && logs.length > 0) {
      logs.shift();
      raw = JSON.stringify(logs);
      size = getByteLength(raw);
    }

    world.setDynamicProperty(LOGS_PREFIX, raw);
  } catch (e) {
    console.error("Failed to save logs:", e);
  }
}

// Load log limit
function loadLogLimit() {
  try {
    const raw = world.getDynamicProperty(LIMIT_PREFIX);
    const num = parseInt(raw);
    return Number.isFinite(num) && num > 0 ? num : DEFAULT_LOG_LIMIT;
  } catch {
    return DEFAULT_LOG_LIMIT;
  }
}

// Save log limit persistently
function saveLogLimit(limit) {
  world.setDynamicProperty(LIMIT_PREFIX, String(limit));
}
//-----------------LOAD AND SAVE LOG CONFIGS----------------
function loadLogConfigs() {
    let parsed = {};
    try {
      const raw = world.getDynamicProperty(CONFIGS_PREFIX);
      if (typeof raw === "string") {
        parsed = JSON.parse(raw);
      }
    } catch (e) {
      console.error("[LogConfigs] failed to parse saved config:", e);
    }
    // Merge parsed on top of defaults so anything missing stays at its default value
    return { ...defaultLogConfigs, ...parsed };
  }
  
  function saveLogConfigs(configs) {
    try {
      world.setDynamicProperty(CONFIGS_PREFIX, JSON.stringify(configs));
    } catch (e) {
      console.error("[LogConfigs] failed to save config:", e);
    }
  }

///------------FORMAT HELPERS----------------
function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }
  
function formatTimestamp(date = new Date()) {
  const Y = date.getUTCFullYear();
  const M = String(date.getUTCMonth() + 1).padStart(2, "0");
  const D = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const m = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${Y}-${M}-${D} ${h}:${m}:${s} UTC`;
}



// Append a log entry with timestamp, trim to limit
function addLog(message) {
  const logs = loadLogs();
  const timestamp = formatTimestamp();
  logs.push({ ts: timestamp, msg: message });
  const limit = loadLogLimit();
  if (logs.length > limit) {
    logs.splice(0, logs.length - limit);
  }
  saveLogs(logs);
}


//------------------- UI: show main log menu-------------------
function showLogMenu(player) {
  const logs = loadLogs();
  const limit = loadLogLimit();
  new ActionFormData()
    .title("Log Manager")
    .body(
      `Stored logs: ${logs.length}\n` +
      `Log limit: ${limit}`
    )
    .button("View Logs")         // 0
    .button("Clear Logs")        // 1
    .button("Set Limit")         // 2
    .button("Settings")          // 3
    .button("Cancel")            // 4
    .show(player)
    .then(resp => {
      if (resp.canceled) return;
      switch (resp.selection) {
        case 0:
          showLogTypeMenu(player);
          break;
        case 1:
          showClearLogsMenu(player);
          break;
        case 2:
          showSetLogLimit(player);
          break;
        case 3:
          showLogSettings(player);
          break;
        default:
          break;
      }
    });
}

/**
 * Show top-level menu of log types, then display only that type’s entries.
 */
function showLogTypeMenu(player) {
    new ActionFormData()
      .title("Select Log Type")
      .body("Choose which logs to view:")
      .button("Join / Leave Logs")       
      .button("PvP Logs")                
      .button("Kill Logs")
      .button("Death Logs")
      .button("Block Logs")
      .button("Container Logs")
      .button("Reward Logs")
      .button("ALL Logs")              
      .button("Back")                    
      .show(player)
      .then(resp => {
        if (resp.canceled) return;
        switch (resp.selection) {
          case 0:
            showViewLogsByType(player, "joinLeave");
            break;
          case 1:
            showViewLogsByType(player, "pvp");
            break;
          case 2:
            showViewLogsByType(player, "kills");
            break;
          case 3:
            showViewLogsByType(player, "deaths");
              break;
          case 4:
            showViewLogsByType(player, "blocks");
              break;    
          case 5:
            showViewLogsByType(player, "container");
                break;
          case 6: 
          showViewLogsByType(player, "reward")
                break;
          case 7:
            showViewLogs(player, "logs");
                break;
        
          default:
            showLogMenu(player);
        }
      });
  }
  
  /**
   * Filter and display logs by the given type.
   * @param {Player} player
   * @param {"joinLeave"|"pvp"|"kills"|"logs"} type
   */
  /**
 * Filter and display logs by the given type.
 * @param {Player} player
 * @param {"joinLeave"|"pvp"|"kills"} type
 */
function showViewLogsByType(player, type) {
    const logs = loadLogs();
    // Strip Minecraft color codes (§x) and lowercase for simple matching
    const clean = msg => msg.replace(/§./g, "").toLowerCase();
  
    const filtered = logs.filter(entry => {
      const text = clean(entry.msg);
      switch (type) {
        case "joinLeave":
          return text.startsWith("player joined:") || text.startsWith("player left:");
        case "pvp":
          return text.includes("[pvp-log]") || text.includes("[pvpcounter:");
        case "kills":
          return text.includes("[killcounter:");
        case "deaths":
            return text.includes("[deathcounter:");
        case "blocks":
            return text.includes("[blockcounter:");
        case "container":
            return text.includes("[container-log:") || text.includes("[container");
        case "reward":
           return text.includes("[reward");
        default:
          return false;
      }
    });
  
    const bodyText = filtered.length
      ? filtered.map((e, i) => `${i + 1}. [${e.ts}] ${e.msg}`).join("\n")
      : "(no logs of this type)\nLogs Can Be Toggled ON/OFF in Log settings or per Counter.";
  
    new ActionFormData()
      .title(
        type === "joinLeave" ? "Join/Leave Logs" :
        type === "pvp"      ? "PvP Logs" :
        type === "kills"     ? "Kill Counter Logs" :
        type === "deaths"    ? "Death Counter Logs" :
        type === "blocks"    ? "Block Counter Logs" :
        type === "container" ? "Container Logs" :
        type === "reward"    ? "Reward Logs":
                              "Logs"

      )
      .body(bodyText)
      .button("Back")
      .show(player)
      .then(resp => {
        if (!resp.canceled) showLogTypeMenu(player);
      });
  }
  


// UI: view stored logs 

function showViewLogs(player) {
    const logs = loadLogs();
    const text = logs
      .map((e, i) => `${i + 1}. [${e.ts}] ${e.msg}`)
      .join("\n");
  
    new ActionFormData()
      .title("Stored Logs")
      .body(text || "(no logs stored)")
      .button("Back")
      .show(player)
      .then(resp => {
        if (!resp.canceled) showLogMenu(player);
      });
  }
  

// UI: set new log limit
function showSetLogLimit(player) {
  const current = loadLogLimit();
  new ModalFormData()
    .title("Set Log Limit (Recommended 200 or less)")
    .textField("Max number of logs to keep\n(logs are auto removed starting with oldest date)\n§lReccomended§r: §2200 or less", String(current))
    .show(player)
    .then(resp => {
      if (resp.canceled) return;
      const input = resp.formValues[0].trim();
      const num = parseInt(input);
      if (Number.isFinite(num) && num > 0) {
        saveLogLimit(num);
        player.sendMessage(`Log limit set to ${num}.`);
      } else {
        player.sendMessage("Invalid number; limit unchanged.");
      }
    });
}

// UI: log settings toggles
function showLogSettings(player) {
  const configs = loadLogConfigs();
  const form = new ModalFormData().title("Log Settings");
  // add a toggle for each config key
  Object.entries(configs).forEach(([key, val]) => {
    form.toggle(key, val);
  });
  form.show(player).then(resp => {
    if (resp.canceled) return;
    const values = resp.formValues;
    const newConfigs = {};
    const keys = Object.keys(configs);
    keys.forEach((key, i) => {
      newConfigs[key] = Boolean(values[i]);
    });
    saveLogConfigs(newConfigs);
    player.sendMessage("Log settings updated.");
  });
}


//-------------------Clear logs-------------------

/**
 * Clears logs of the given type (or all logs), and returns how many were removed.
 * @param {"joinLeave"|"pvp"|"kills"|"all"} type
 * @returns {number} number of entries cleared
 */
function clearLogsByType(type) {
  const logs = loadLogs();
  const clean = msg => msg.replace(/§./g, "").toLowerCase();
  let remaining;

  if (type === "all") {
    remaining = [];
  } else {
    remaining = logs.filter(entry => {
      const text = clean(entry.msg);
      switch (type) {
        case "joinLeave":
          return !(text.startsWith("player joined") || text.startsWith("player left"));
        case "pvp":
          return !text.includes("[pvpcounter") && !text.includes("[pvp-log]");
        case "kills":
          return !text.includes("[killcounter");
        case "deaths":
          return !text.includes("[deathcounter");
        case "blocks":
          return !text.includes("[blockcounter");
        case "container":
          return !text.includes("[container");
        case "reward":
           return !text.includes("[reward:");
        default:
          return true;
      }
    });
  }

  saveLogs(remaining);
  return logs.length - remaining.length;
}

  
  /**
   * Shows a menu to clear Join/Leave, PvP, Kill Counter, or All logs.
   */
  function showClearLogsMenu(player) {
  new ActionFormData()
    .title("Clear Logs")
    .body("Which logs would you like to clear?")
    .button("Join / Leave Logs")    // 0
    .button("PvP Logs")             // 1
    .button("Kill Counter Logs")    // 2
    .button("Death Counter Logs")   // 3
    .button("Block Logs")           // 4
    .button("Container Logs")       //5
    .button("Reward Logs")         // 6
    .button("All Logs")            // 7
    .button("Back")                 // 8
    .show(player)
    .then(resp => {
      if (resp.canceled) return;
      // “Back” → return to main logs menu
      if (resp.selection === 8) return showLogMenu(player);

      // Map selection → clearLogsByType key & user-friendly label
      const types = [
        { key: "joinLeave", label: "join/leave logs" },
        { key: "pvp",       label: "PvP logs" },
        { key: "kills",     label: "kill-counter logs" },
        { key: "deaths",    label: "death-counter logs" },
        { key: "blocks",    label: "block logs" },
        { key: "container", label: "container logs" },
        { key: "reward",    label: "reward logs"    },
        { key: "all",       label: "all logs" }
      ];
      const { key, label } = types[resp.selection];

      // Confirmation dialog
      new MessageFormData()
        .title("Confirm Clear")
        .body(`Are you sure you want to clear ${label}?`)
        .button1("Yes, clear")
        .button2("No, cancel")
        .show(player)
        .then(choice => {
          if (choice.canceled || choice.selection === 1) {
            // Cancel → back to clear-logs menu
            return showClearLogsMenu(player);
          }
          // Confirm → clear & report
          const count = clearLogsByType(key);
          const msg =
            key === "all"
              ? `Cleared all logs (${count} entries).`
              : `Cleared ${count} ${label}.`;
          player.sendMessage(msg);
        });
    });
}

  

//------------------PLayer join/leave events for log--------------------------
world.afterEvents.playerJoin.subscribe(event => {
    const { logPlayerJoin } = loadLogConfigs();
    if (!logPlayerJoin) return;
  
    // event.player may be undefined in some API versions,
    // so fall back to event.playerName or a placeholder.
    const name =
      event.player?.name
        ?? event.playerName
        ?? "UnknownPlayer";
  
    addLog(`Player joined: ${name}`);
  });
  
  //
  // Player Leave
  //
  world.afterEvents.playerLeave.subscribe(event => {
    const { logPlayerLeave } = loadLogConfigs();
    if (!logPlayerLeave) return;
  
    // Again, try .player.name first, then .playerName
    const name =
      event.player?.name
        ?? event.playerName
        ?? "UnknownPlayer";
  
    addLog(`Player left: ${name}`);
  });