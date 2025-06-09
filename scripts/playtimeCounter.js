import { world, system } from "@minecraft/server";
import { ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { adminMainMenu,
    parseRangeInput,
    createScoreboardIfNotExists,
    showSettingsMenu,
    randomInRange,
    checkScoreFilter,
    getScoreSafe,
    showSingleActionBar,
    applyDeltaSafely,
  manageAllCountersMenu } from "./main";
import { addLog } from "./logManager";



// Prefix for playtime dynamic properties
const PLAYTIME_PREFIX = "playtimeCounter:";

// Default configuration for playtime counters
export const defaultPlaytimeConfig = {
  enabled: true,
  // filter on player tags (include/exclude syntax with !)
  playerTagFilter: [],
  // filter on player scores: objective name and range
  playerScoreFilter: { objective: "none", min: 1, max: 1 },
  // filter on player position: x/y/z ranges or exclusions
  playerLocation: {
    x: { min: -100, max: 100 },
    y: { min: -100, max: 100 },
    z: { min: -100, max: 100 },
  },
  secondsObjectiveName: "",
  secondsDisplayName: "",
  secondsDisplayEnabled: false,
  minutesObjectiveName: "",
  minutesDisplayName: "",
  minutesDisplayEnabled: true,
  hoursObjectiveName: "",
  hoursDisplayName: "",
  hoursDisplayEnabled: true,
  daysObjectiveName: "",
  daysDisplayName: "",
  daysDisplayEnabled: true,
  logToMenu: false,
  logToConsole: false,
  sendPlayersMessages: true,
  sendPlayersFailureMessages: false,
  incrementScore: {
    amount: { min: 1, max: 1 },
    mode: "add",
    allowNegative: false,
  },
  actionBarEnabled: true,
  actionBarFormatCode: "r",
  actionBarLabel: "Time",
  playtimeLimit: 0, // 0 means no limit
  playerCommand: "",
  resetOnLogout: false,
  dimensionFilter: ["overworld", "nether", "the_end"],
  type: "playtime"
};

// In-memory store for playtime counters
export let playtimeCounters = {};

export function savePlaytimeCounter(counterName, config) {
  try {
    world.setDynamicProperty(PLAYTIME_PREFIX + counterName, JSON.stringify(config));
    playtimeCounters[counterName] = config;
  } catch (e) {
    console.error(`[Save] Failed to save Playtime Counter '${counterName}':`, e);
  }
}

export function loadPlaytimeCounters() {
  try {
    for (const key of world.getDynamicPropertyIds()) {
      if (!key.startsWith(PLAYTIME_PREFIX)) continue;
      const name = key.slice(PLAYTIME_PREFIX.length);
      const raw = world.getDynamicProperty(key);
      try {
        const parsed = JSON.parse(raw);
        playtimeCounters[name] = { ...defaultPlaytimeConfig, ...parsed };
      } catch {}
    }
  } catch (e) {
    console.error("[Load] Playtime Counters failed:", e);
  }
}

export function deletePlaytimeCounter(counterName) {
  try {
    world.setDynamicProperty(PLAYTIME_PREFIX + counterName, undefined);
    delete playtimeCounters[counterName];
  } catch (e) {
    console.error(`[Delete] Failed to delete Playtime Counter '${counterName}':`, e);
  }
}

// Helper utilities
const sanitizeList = (raw) =>
  raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const filterNone = (list) => list.filter((e) => e.toLowerCase() !== "none");
const fmtRange = (r) => (r.min === r.max ? `${r.min}` : `${r.min}..${r.max}`);


//--------------------Playtime Counter Management---------------------------
export function showConfigurePlaytimeCounterForm(player, name) {
  // 1) load and merge defaults
  loadPlaytimeCounters();
  const raw    = playtimeCounters[name] || {};
  const config = { ...defaultPlaytimeConfig, ...raw };

  // 2) prepare initial values for the form
  const positionEnabled = !!config.playerLocation;
  const initial = {
    enabled:                    config.enabled,
    playerTags:                 config.playerTagFilter.join(", "),
    playerScoreObj:             config.playerScoreFilter.objective,
    playerScoreRange:           `${config.playerScoreFilter.min}..${config.playerScoreFilter.max}`,
    positionEnabled,
    positionRange:              positionEnabled
                                ? `${fmtRange(config.playerLocation.x)},${fmtRange(config.playerLocation.y)},${fmtRange(config.playerLocation.z)}`
                                : "",
    secondsObjectiveName:       config.secondsObjectiveName,
    secondsDisplayName:         config.secondsDisplayName,
    secondsDisplayEnabled:      config.secondsDisplayEnabled,
    minutesObjectiveName:       config.minutesObjectiveName,
    minutesDisplayName:         config.minutesDisplayName,
    minutesDisplayEnabled:      config.minutesDisplayEnabled,
    hoursObjectiveName:         config.hoursObjectiveName,
    hoursDisplayName:           config.hoursDisplayName,
    hoursDisplayEnabled:        config.hoursDisplayEnabled,
    daysObjectiveName:          config.daysObjectiveName,
    daysDisplayName:            config.daysDisplayName,
    daysDisplayEnabled:         config.daysDisplayEnabled,
    logToMenu:                  config.logToMenu,
    logToConsole:               config.logToConsole,
    sendPlayersMessages:        config.sendPlayersMessages,
    sendPlayersFailureMessages: config.sendPlayersFailureMessages,
    incrementAmount:            config.incrementScore.amount.min === config.incrementScore.amount.max
                                  ? `${config.incrementScore.amount.min}`
                                  : `${config.incrementScore.amount.min}..${config.incrementScore.amount.max}`,
    scoreMode:                  config.incrementScore.mode === "remove" ? 1 : 0,
    allowNegative:              config.incrementScore.allowNegative,
    actionBarEnabled:           config.actionBarEnabled,
    actionBarFormatCode:        config.actionBarFormatCode,
    actionBarLabel:             config.actionBarLabel || "",
    playtimeLimit:              config.playtimeLimit.toString(),
    playerCommand:              config.playerCommand || "",
    resetOnLogout:              config.resetOnLogout
  };

  // 3) build the form, with “Reset On Logout” right under “Execute Command as Player”
  const form = new ModalFormData()
    .title(`Playtime Counter: ${name}`)
    .toggle("Counter Enabled",               initial.enabled)
    .textField("Player Tag Filters",         "e.g. !noTrack",           initial.playerTags)
    .textField("Player Score Objective",     "e.g. playtime",           initial.playerScoreObj)
    .textField("Player Score Range",         "e.g. 1..10",              initial.playerScoreRange)
    .toggle("Position Filter Enabled",       initial.positionEnabled)
    .textField(
      "Position Ranges (x..x,y..y,z..z)", 
      "e.g. -5..5,60..70,-100..100", 
      initial.positionRange
    )
    .textField("Seconds Objective Name",      "e.g. seconds_played",     initial.secondsObjectiveName)
    .textField("Seconds Display Name",        "e.g. Seconds Played",     initial.secondsDisplayName)
    .toggle("Show Seconds Score",             initial.secondsDisplayEnabled)
    .textField("Minutes Objective Name",      "e.g. minutes_played",     initial.minutesObjectiveName)
    .textField("Minutes Display Name",        "e.g. Minutes Played",     initial.minutesDisplayName)
    .toggle("Show Minutes Score",             initial.minutesDisplayEnabled)
    .textField("Hours Objective Name",        "e.g. hours_played",       initial.hoursObjectiveName)
    .textField("Hours Display Name",          "e.g. Hours Played",       initial.hoursDisplayName)
    .toggle("Show Hours Score",               initial.hoursDisplayEnabled)
    .textField("Days Objective Name",         "e.g. days_played",        initial.daysObjectiveName)
    .textField("Days Display Name",           "e.g. Days Played",        initial.daysDisplayName)
    .toggle("Show Days Score",                initial.daysDisplayEnabled)
    .textField("Increment Amount",            "e.g. 1 or 1..5",          initial.incrementAmount)
    .dropdown("Score Mode", ["Add Score","Remove Score"], initial.scoreMode)
    .toggle("Allow Negative Numbers",         initial.allowNegative)
    .toggle("Action Bar Enabled",             initial.actionBarEnabled)
    .textField("Action Bar Format Code",      "a–u or 0–9",              initial.actionBarFormatCode)
    .textField("Action Bar Label",            "e.g. Playtime:",          initial.actionBarLabel)
    .textField("Playtime Limit (seconds)",    "0 for no limit",          initial.playtimeLimit)
    .textField("Execute Command as Player",   "e.g. /say Hello",         initial.playerCommand)
    .toggle("Reset On Logout",                initial.resetOnLogout)        // <-- moved here
    .toggle("Log To Menu",                    initial.logToMenu)
    .toggle("Debug Log To Console",           initial.logToConsole)
    .toggle("Send Players Messages",          initial.sendPlayersMessages)
    .toggle("Send Players Debug Messages",    initial.sendPlayersFailureMessages);

  form.show(player).then(resp => {
    if (resp.canceled) return;
    const [
      enRaw,                      //  0
      tagsRaw,                    //  1
      scoreObjRaw,                //  2
      scoreRangeRaw,              //  3
      posFiltRaw,                 //  4
      posRangeRaw,                //  5
      secObjRaw,                  //  6
      secDispRaw,                 //  7
      secEnRaw,                   //  8
      minObjRaw,                  //  9
      minDispRaw,                 // 10
      minEnRaw,                   // 11
      hrObjRaw,                   // 12
      hrDispRaw,                  // 13
      hrEnRaw,                    // 14
      daysObjRaw,                 // 15
      daysDispRaw,                // 16
      daysEnRaw,                  // 17
      amtRaw,                     // 18
      modeIdx,                    // 19
      negRaw,                     // 20
      abEnRaw,                    // 21
      abCodeRaw,                  // 22
      abLabelRaw,                 // 23
      limitRaw,                   // 24
      cmdRaw,                     // 25
      resetRaw,                   // 26 (moved here)
      logMenuRaw,                 // 27
      logConsoleRaw,              // 28
      sendMsgRaw,                 // 29
      sendFailRaw                 // 30
    ] = resp.formValues;

    // 4) parse back into typed values
    const enabled               = Boolean(enRaw);
    const playerTagFilter       = tagsRaw.trim() ? filterNone(sanitizeList(tagsRaw)) : config.playerTagFilter;
    const playerScoreObj        = scoreObjRaw.trim() ? scoreObjRaw.trim() : config.playerScoreFilter.objective;
    const scrRange              = scoreRangeRaw.trim()
                                ? parseRangeInput(scoreRangeRaw.trim())
                                : { min: config.playerScoreFilter.min, max: config.playerScoreFilter.max };

    const positionEnabled       = Boolean(posFiltRaw);
    let playerLocation          = null;
    if (positionEnabled && posRangeRaw.trim()) {
      const [rx, ry, rz] = posRangeRaw.split(",").map(s => s.trim());
      playerLocation = {
        x: parseRangeInput(rx),
        y: parseRangeInput(ry),
        z: parseRangeInput(rz),
      };
    }

    const secondsObjectiveName    = secObjRaw.trim() || config.secondsObjectiveName;
    const secondsDisplayName      = secDispRaw.trim() || config.secondsDisplayName;
    const secondsDisplayEnabled   = Boolean(secEnRaw);

    const minutesObjectiveName    = minObjRaw.trim() || config.minutesObjectiveName;
    const minutesDisplayName      = minDispRaw.trim() || config.minutesDisplayName;
    const minutesDisplayEnabled   = Boolean(minEnRaw);

    const hoursObjectiveName      = hrObjRaw.trim() || config.hoursObjectiveName;
    const hoursDisplayName        = hrDispRaw.trim() || config.hoursDisplayName;
    const hoursDisplayEnabled     = Boolean(hrEnRaw);

    const daysObjectiveName       = daysObjRaw.trim() || config.daysObjectiveName;
    const daysDisplayName         = daysDispRaw.trim() || config.daysDisplayName;
    const daysDisplayEnabled      = Boolean(daysEnRaw);

    const incrementAmt            = amtRaw.trim() ? parseRangeInput(amtRaw.trim()) : config.incrementScore.amount;
    const mode                    = modeIdx === 1 ? "remove" : "add";
    const allowNegative           = Boolean(negRaw);
    const actionBarEnabled        = Boolean(abEnRaw);
    const actionBarFormatCode     = /^[a-u0-9]$/.test(abCodeRaw.trim())
                                  ? abCodeRaw.trim()
                                  : defaultPlaytimeConfig.actionBarFormatCode;
    const actionBarLabel          = abLabelRaw.trim() || "";

    let playtimeLimit             = parseInt(limitRaw.trim());
    if (isNaN(playtimeLimit) || playtimeLimit < 0) playtimeLimit = 0;

    const playerCommand           = cmdRaw.trim() || config.playerCommand;
    const resetOnLogout           = Boolean(resetRaw);           // parse the moved toggle
    const logToMenu               = Boolean(logMenuRaw);
    const logToConsole            = Boolean(logConsoleRaw);
    const sendPlayersMessages     = Boolean(sendMsgRaw);
    const sendPlayersFailureMessages = Boolean(sendFailRaw);

    // 5) build new config
    const configToSave = {
      ...config,
      enabled,
      playerTagFilter,
      playerScoreFilter: { objective: playerScoreObj, min: scrRange.min, max: scrRange.max },
      playerLocation,
      secondsObjectiveName,
      secondsDisplayName,
      secondsDisplayEnabled,
      minutesObjectiveName,
      minutesDisplayName,
      minutesDisplayEnabled,
      hoursObjectiveName,
      hoursDisplayName,
      hoursDisplayEnabled,
      daysObjectiveName,
      daysDisplayName,
      daysDisplayEnabled,
      incrementScore: { amount: incrementAmt, mode, allowNegative },
      actionBarEnabled,
      actionBarFormatCode,
      actionBarLabel,
      playtimeLimit,
      playerCommand,
      resetOnLogout,                  // include in saved config
      logToMenu,
      logToConsole,
      sendPlayersMessages,
      sendPlayersFailureMessages
    };

    // 6) confirmation dialog
    const df   = v => Array.isArray(v) ? v.join(", ") : v;
    const inc  = configToSave.incrementScore.amount;
    const incTxt = `${inc.min}${inc.min !== inc.max ? `..${inc.max}` : ""}`;

    new MessageFormData()
      .title("Confirm Playtime Counter")
      .body(
        `Name: ${name}\n` +
        `Enabled: ${configToSave.enabled}\n` +
        `Player Tags: ${df(configToSave.playerTagFilter)}\n` +
        `Player Score Obj: ${configToSave.playerScoreFilter.objective}\n` +
        `Player Score Range: ${incTxt}\n` +
        `Position Filter: ${Boolean(configToSave.playerLocation)}\n` +
        `Position Range: ${
          configToSave.playerLocation
            ? `${fmtRange(configToSave.playerLocation.x)},${fmtRange(configToSave.playerLocation.y)},${fmtRange(configToSave.playerLocation.z)}`
            : "(none)"
        }\n` +
        `Seconds Obj: ${configToSave.secondsObjectiveName}\n` +
        `Show Seconds: ${configToSave.secondsDisplayEnabled}\n` +
        `Minutes Obj: ${configToSave.minutesObjectiveName}\n` +
        `Show Minutes: ${configToSave.minutesDisplayEnabled}\n` +
        `Hours Obj: ${configToSave.hoursObjectiveName}\n` +
        `Show Hours: ${configToSave.hoursDisplayEnabled}\n` +
        `Days Obj: ${configToSave.daysObjectiveName}\n` +
        `Show Days: ${configToSave.daysDisplayEnabled}\n` +
        `Increment: ${incTxt} (${configToSave.incrementScore.mode})\n` +
        `Allow Negative: ${configToSave.incrementScore.allowNegative}\n` +
        `Action Bar Enabled: ${configToSave.actionBarEnabled}\n` +
        `Format Code: ${configToSave.actionBarFormatCode}\n` +
        `Label: ${configToSave.actionBarLabel || "(none)"}\n` +
        `Playtime Limit: ${configToSave.playtimeLimit}\n` +
        `Execute Command: ${configToSave.playerCommand || "None"}\n` +
        `Reset On Logout: ${configToSave.resetOnLogout}\n` +   // show moved toggle here
        `Log To Menu: ${configToSave.logToMenu}\n` +
        `Debug Log To Console: ${configToSave.logToConsole}\n` +
        `Send Players Messages: ${configToSave.sendPlayersMessages}\n` +
        `Send Players Debug Messages: ${configToSave.sendPlayersFailureMessages}`
      )
      .button1("Confirm")
      .button2("Edit")
      .show(player)
      .then(r => {
        if (r.canceled || r.selection === 1) {
          showConfigurePlaytimeCounterForm(player, name);
        } else {
          savePlaytimeCounter(name, configToSave);
          player.sendMessage(`Playtime Counter '${name}' saved.`);
          addLog(`§a[Add/Edit]§r ${player.nameTag} updated playtime counter ${name}`);
          manageAllCountersMenu(player);
        }
      });
  });
}



//--------------------Playtime Counter Logic--------------------------------

// Every second (20 ticks), update playtime for each player, applying filters
/**
 * Helper to derive seconds, minutes, hours, and days from a “seconds” scoreboard.
 * Returns an object: { seconds, minutes, hours, days }.
 */
function getDerivedPlaytime(player, config) {
  const result = { seconds: 0, minutes: 0, hours: 0, days: 0 };
  if (!config.secondsDisplayEnabled || !config.secondsObjectiveName) return result;

  const secObj = createScoreboardIfNotExists(
    config.secondsObjectiveName,
    config.secondsDisplayName || config.secondsObjectiveName
  );
  const secVal = getScoreSafe(player.nameTag, secObj.id) || 0;
  result.seconds = secVal;

  if (config.minutesDisplayEnabled) {
    result.minutes = Math.floor(secVal / 60);
  } else {
    result.minutes = 0;
  }

  if (config.hoursDisplayEnabled) {
    result.hours = Math.floor(secVal / 3600);
  } else {
    result.hours = 0;
  }

  if (config.daysDisplayEnabled) {
    result.days = Math.floor(secVal / 86400);
  } else {
    result.days = 0;
  }

  return result;
}

world.afterEvents.playerSpawn.subscribe(() => {
  // Ensure playtime counters are loaded at startup
  loadPlaytimeCounters();
});

system.runInterval(() => {
  loadPlaytimeCounters();

  for (const player of world.getPlayers()) {
    for (const [name, config] of Object.entries(playtimeCounters)) {
      // — Enabled?
      if (!config.enabled) {
        if (config.sendPlayersFailureMessages) {
          player.sendMessage(`§3[Playtime-Debug:${name}] §cCounter is disabled – skipping.`);
        }
        continue;
      }

      // — Player Tag filter
      if (Array.isArray(config.playerTagFilter) && config.playerTagFilter.length) {
        const tags = player.getTags();
        const inc = config.playerTagFilter.filter(t => !t.startsWith("!"));
        const exc = config.playerTagFilter
          .filter(t => t.startsWith("!"))
          .map(t => t.slice(1));
        if (exc.some(t => tags.includes(t))) {
          if (config.sendPlayersFailureMessages) {
            player.sendMessage(
              `§3[Playtime-Debug:${name}] §cTagFilter FAIL §rYou have excluded tag [${exc}].`
            );
          }
          continue;
        }
        if (inc.length && !inc.some(t => tags.includes(t))) {
          if (config.sendPlayersFailureMessages) {
            player.sendMessage(
              `§3[Playtime-Debug:${name}] §cTagFilter FAIL §rMissing required tag [${inc}].`
            );
          }
          continue;
        }
      }

      // — Player Score filter
      if (
        !checkScoreFilter(
          player,
          config.playerScoreFilter,
          "playtimeScoreFilter",
          config.logToConsole,
          config.sendPlayersFailureMessages
        )
      ) {
        continue;
      }

      // — Position filter
      if (config.playerLocation) {
        const checkAxis = (coord, { min, max, exclude }) =>
          exclude ? !(coord >= exclude.min && coord <= exclude.max) : coord >= min && coord <= max;
        const loc = config.playerLocation;
        const px = player.location.x;
        const py = player.location.y;
        const pz = player.location.z;
        if (
          !checkAxis(px, loc.x) ||
          !checkAxis(py, loc.y) ||
          !checkAxis(pz, loc.z)
        ) {
          if (config.sendPlayersFailureMessages) {
            player.sendMessage(
              `§3[Playtime-Debug:${name}] §cPositionFilter FAIL §rYou are at (${px.toFixed(1)},${py.toFixed(1)},${pz.toFixed(1)}) outside allowed (${loc.x.min}..${loc.x.max}, ${loc.y.min}..${loc.y.max}, ${loc.z.min}..${loc.z.max}).`
            );
          }
          continue;
        }
      }

      // — Derive current playtime values (read existing scores)
      //   secondsVal is stored in secondsObjectiveName; minutesVal, hoursVal, daysVal similarly
      const derived = getDerivedPlaytime(player, config);
      let secVal = derived.seconds;
      let minVal = config.minutesDisplayEnabled && config.minutesObjectiveName
        ? getScoreSafe(player.nameTag,
            createScoreboardIfNotExists(
              config.minutesObjectiveName,
              config.minutesDisplayName || config.minutesObjectiveName
            ).id
          ) || 0
        : 0;
      let hrVal  = config.hoursDisplayEnabled && config.hoursObjectiveName
        ? getScoreSafe(player.nameTag,
            createScoreboardIfNotExists(
              config.hoursObjectiveName,
              config.hoursDisplayName || config.hoursObjectiveName
            ).id
          ) || 0
        : 0;
      let dayVal = config.daysDisplayEnabled && config.daysObjectiveName
        ? getScoreSafe(player.nameTag,
            createScoreboardIfNotExists(
              config.daysObjectiveName,
              config.daysDisplayName || config.daysObjectiveName
            ).id
          ) || 0
        : 0;

      // — Check or create “limit reached” scoreboard for this counter
      const limitObjId = `playtimeLimit_${name}`;
      const limitObj = createScoreboardIfNotExists(limitObjId, `LimitReached_${name}`);
      const limitScore = getScoreSafe(player.nameTag, limitObj.id) || 0;

      // — If already marked “limit reached,” skip everything
      if (limitScore >= 1) {
        continue;
      }

      // — Now check playtime limit (0 = no limit)
      if (config.playtimeLimit > 0 && secVal >= config.playtimeLimit) {
        // Mark “limit reached” by setting score to 1
        limitObj.setScore(player.nameTag, 1);

        // Run custom command once
        if (config.playerCommand?.trim()) {
          player.runCommand(config.playerCommand.replace("{player}", player.nameTag));
        }

        // Send chat message once
        if (config.sendPlayersMessages) {
          player.sendMessage(`§a[Playtime:${name}] Limit of ${config.playtimeLimit}s reached.`);
        }

        // Log to menu once
        if (config.logToMenu) {
          addLog(`§b[Playtime:${name}] ${player.nameTag} hit limit of ${config.playtimeLimit}s`);
        }

        // Log to console once
        if (config.logToConsole) {
          console.log(`[Playtime:${name}] ${player.nameTag} hit limit of ${config.playtimeLimit}s`);
        }
        continue;
      }

      // — At this point, limit not reached, so proceed with cascading increment logic

      // 1) Increase seconds by increment amount
      secVal += config.incrementScore.amount.min;

      // 2) If minutes toggled, roll seconds into minutes
      let carryToMin = 0;
      if (config.minutesDisplayEnabled && config.minutesObjectiveName) {
        carryToMin = Math.floor(secVal / 60);
        secVal = secVal % 60;
      }

      // 3) If hours toggled:
      //    - If minutes toggled: roll new minutes (minVal + carryToMin) into hours
      //    - Otherwise: roll seconds directly into hours
      let carryToHour = 0;
      let newMin = minVal + carryToMin;
      if (config.hoursDisplayEnabled && config.hoursObjectiveName) {
        if (config.minutesDisplayEnabled && config.minutesObjectiveName) {
          carryToHour = Math.floor(newMin / 60);
          newMin = newMin % 60;
        } else {
          carryToHour = Math.floor(secVal / 3600);
          secVal = secVal % 3600;
          // newMin stays as minVal since minutes not toggled
          newMin = minVal;
        }
      }

      // 4) If days toggled:
      //    - If hours toggled: roll new hours (hrVal + carryToHour) into days
      //    - Otherwise: roll previous parts as needed
      let carryToDay = 0;
      let newHr = hrVal + carryToHour;
      if (config.daysDisplayEnabled && config.daysObjectiveName) {
        if (config.hoursDisplayEnabled && config.hoursObjectiveName) {
          carryToDay = Math.floor(newHr / 24);
          newHr = newHr % 24;
        } else {
          // hours not toggled, but days toggled: roll seconds or minutes into days?
          // We assume if hours not toggled, we roll using minutes or seconds:
          if (config.minutesDisplayEnabled && config.minutesObjectiveName) {
            // roll minutes (newMin) into days: each day = 1440 minutes
            carryToDay = Math.floor(newMin / 1440);
            newMin = newMin % 1440;
            newHr = hrVal; // unchanged
          } else {
            // only seconds toggled (or no lower toggles), roll seconds into days
            carryToDay = Math.floor(secVal / 86400);
            secVal = secVal % 86400;
            newHr = hrVal; 
            newMin = minVal;
          }
        }
      }

      // 5) Compute final day score
      const newDay = dayVal + carryToDay;

      // 6) Write back to scoreboards if toggled
      if (config.secondsDisplayEnabled && config.secondsObjectiveName) {
        const secObj = createScoreboardIfNotExists(
          config.secondsObjectiveName,
          config.secondsDisplayName || config.secondsObjectiveName
        );
        secObj.setScore(player.nameTag, secVal);
      }

      if (config.minutesDisplayEnabled && config.minutesObjectiveName) {
        const minObj = createScoreboardIfNotExists(
          config.minutesObjectiveName,
          config.minutesDisplayName || config.minutesObjectiveName
        );
        minObj.setScore(player.nameTag, newMin);
      }

      if (config.hoursDisplayEnabled && config.hoursObjectiveName) {
        const hrObj = createScoreboardIfNotExists(
          config.hoursObjectiveName,
          config.hoursDisplayName || config.hoursObjectiveName
        );
        hrObj.setScore(player.nameTag, newHr);
      }

      if (config.daysDisplayEnabled && config.daysObjectiveName) {
        const dayObj = createScoreboardIfNotExists(
          config.daysObjectiveName,
          config.daysDisplayName || config.daysObjectiveName
        );
        dayObj.setScore(player.nameTag, newDay);
      }

      // — Action bar display if configured
    if (config.actionBarEnabled && config.actionBarFormatCode) {
  const parts = [];
  if (config.daysDisplayEnabled && config.daysObjectiveName) {
    parts.push(`${newDay}d`);
  }
  if (config.hoursDisplayEnabled && config.hoursObjectiveName) {
    parts.push(`${newHr}h`);
  }
  if (config.minutesDisplayEnabled && config.minutesObjectiveName) {
    parts.push(`${newMin}m`);
  }
  if (config.secondsDisplayEnabled && config.secondsObjectiveName) {
    parts.push(`${secVal}s`);
  }
  if (parts.length) {
    const rawText = parts.join(" ");
    // build prefix color/format code
    const prefix = config.actionBarFormatCode.length === 1
      ? `§${config.actionBarFormatCode}`
      : config.actionBarFormatCode;
    // include label if provided
    const label = config.actionBarLabel?.trim() ? config.actionBarLabel.trim() + " " : "";
    const raw = JSON.stringify({
      rawtext: [{ text: prefix + label + rawText }]
    });
    player.runCommandAsync(`/titleraw @s actionbar ${raw}`);
  }
}


      // — Log to console (increment event)
      if (config.logToConsole) {
        console.log(`[Playtime:${name}] ${player.nameTag} incremented`);
      }
    }
  }
}, 20);
