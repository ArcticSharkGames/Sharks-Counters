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
import { basicCounterConfigs } from "./defaultCounters";

const DISTANCE_PREFIX = "distanceCounter:";

export const defaultDistanceConfig = {
  enabled: true,
  playerTagFilter: [],
  playerScoreFilter: { objective: "none", min: 1, max: 1 },
  playerLocation: {
    x: { min: -100, max: 100 },
    y: { min: -100, max: 100 },
    z: { min: -100, max: 100 },
  },
  xEnabled: true,
  yEnabled: true,
  zEnabled: true,
  objectiveName: "",
  displayName: "",
  displayFormat: "",
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
  actionBarLabel: "Distance",
  distanceLimit: 0, // 0 means no limit
  playerCommand: "",
  dimensionFilter: ["overworld", "nether", "the_end"],
  type: "distance",
};

export let distanceCounters = {};

export function saveDistanceCounter(counterName, config) {
  try {
    world.setDynamicProperty(DISTANCE_PREFIX + counterName, JSON.stringify(config));
    distanceCounters[counterName] = config;
  } catch (e) {
    console.error(`[Save] Failed to save Distance Counter '${counterName}':`, e);
  }
}

export function loadDistanceCounters() {
  try {
    for (const key of world.getDynamicPropertyIds()) {
      if (!key.startsWith(DISTANCE_PREFIX)) continue;
      const name = key.slice(DISTANCE_PREFIX.length);
      const raw = world.getDynamicProperty(key);
      try {
        const parsed = JSON.parse(raw);
        distanceCounters[name] = { ...defaultDistanceConfig, ...parsed };
      } catch {}
    }
  } catch (e) {
    console.error("[Load] Distance Counters failed:", e);
  }
}

export function deleteDistanceCounter(counterName) {
  try {
    world.setDynamicProperty(DISTANCE_PREFIX + counterName, undefined);
    delete distanceCounters[counterName];
  } catch (e) {
    console.error(`[Delete] Failed to delete Distance Counter '${counterName}':`, e);
  }
}


const sanitizeList = (raw) =>
  raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const filterNone = (list) => list.filter((e) => e.toLowerCase() !== "none");
const fmtRange = (r) => (r.min === r.max ? `${r.min}` : `${r.min}..${r.max}`);



//------------------------------Distance Counter Menu------------------------------

export function showConfigureDistanceCounterForm(player, name) {
  // 1) load and merge defaults
  loadDistanceCounters();
  const raw    = distanceCounters[name] || {};
  const config = { ...defaultDistanceConfig, ...raw };

  // 2) prepare initial values for the form
  const positionEnabled = config.playerLocation != null;
  const initial = {
    enabled:                    config.enabled,
    playerTags:                 config.playerTagFilter.join(", "),
    playerScoreObj:             config.playerScoreFilter.objective,
    playerScoreRange:           `${config.playerScoreFilter.min}..${config.playerScoreFilter.max}`,
    positionEnabled,
    positionRange:              positionEnabled
                                ? `${fmtRange(config.playerLocation.x)},${fmtRange(config.playerLocation.y)},${fmtRange(config.playerLocation.z)}`
                                : "",
    xEnabled:                   config.xEnabled,
    yEnabled:                   config.yEnabled,
    zEnabled:                   config.zEnabled,
    objectiveName:              config.objectiveName,
    displayName:                config.displayName,
    displayFormatIdx:           (() => {
                                  const opts = ["blocks","hundreds","thousands","ten thousand","hundred thousand","million"];
                                  const idx = opts.indexOf(config.displayFormat);
                                  return idx < 0 ? 0 : idx;
                                })(),
    incrementAmount:            config.incrementScore.amount.min === config.incrementScore.amount.max
                                    ? `${config.incrementScore.amount.min}`
                                    : `${config.incrementScore.amount.min}..${config.incrementScore.amount.max}`,
    scoreMode:                  config.incrementScore.mode === "remove" ? 1 : 0,
    allowNegative:              config.incrementScore.allowNegative,
    actionBarEnabled:           config.actionBarEnabled,
    actionBarFormatCode:        config.actionBarFormatCode,
    actionBarLabel:             config.actionBarLabel || "",
    distanceLimit:              config.distanceLimit.toString(),
    playerCommand:              config.playerCommand || "",
    logToMenu:                  config.logToMenu,
    logToConsole:               config.logToConsole,
    sendPlayersMessages:        config.sendPlayersMessages,
    sendPlayersFailureMessages: config.sendPlayersFailureMessages
  };

  // 3) build the form
  const form = new ModalFormData()
    .title(`Distance Counter: ${name}`)
    .toggle("Counter Enabled",               initial.enabled)
    .textField("Player Required Tag Filters",    "e.g. !noTrack",           initial.playerTags)
    .textField("Player Required Score Objective", "e.g. distance_obj",       initial.playerScoreObj)
    .textField("Player Required Score Range",     "e.g. 1..100",             initial.playerScoreRange)
    .toggle("Position Filter Enabled",       initial.positionEnabled)
    .textField(
      "Position Ranges (x..x,y..y,z..z)",
      "e.g. -100..100,50..70,-200..200",
      initial.positionRange
    )
    .toggle("X Axis Enabled",                initial.xEnabled)
    .toggle("Y Axis Enabled",                initial.yEnabled)
    .toggle("Z Axis Enabled",                initial.zEnabled)
    .textField("Objective Name",             "e.g. distance_counter",   initial.objectiveName)
    .textField("Display Name",               "e.g. Distance Traveled",  initial.displayName)
    .dropdown(
      "Display Format",
      ["blocks","hundreds","thousands","million"],
      initial.displayFormatIdx
    )
    .textField("Increment Amount",           "e.g. 1 or 1..5",          initial.incrementAmount)
    .dropdown("Score Mode",                  ["Add Score","Remove Score"], initial.scoreMode)
    .toggle("Allow Negative Numbers",        initial.allowNegative)
    .toggle("Action Bar Enabled",            initial.actionBarEnabled)
    .textField("Action Bar Format Code",     "a–u or 0–9",               initial.actionBarFormatCode)
    .textField("Action Bar Label",           "e.g. Distance:",           initial.actionBarLabel)
    .textField("Distance Limit",             "0 for no limit",          initial.distanceLimit)
    .textField("Execute Command as Player",  "e.g. /say You moved",      initial.playerCommand)
    .toggle("Log To Menu",                   initial.logToMenu)
    .toggle("Debug Log To Console",          initial.logToConsole)
    .toggle("Send Players Messages",         initial.sendPlayersMessages)
    .toggle("Send Players Debug Messages",   initial.sendPlayersFailureMessages);

  form.show(player).then(resp => {
    if (resp.canceled) return;
    const [
      enRaw,
      tagsRaw,
      scoreObjRaw,
      scoreRangeRaw,
      posFiltRaw,
      posRangeRaw,
      xEnRaw,
      yEnRaw,
      zEnRaw,
      objNameRaw,
      dispNameRaw,
      fmtIdxRaw,
      amtRaw,
      modeIdx,
      negRaw,
      abEnRaw,
      abCodeRaw,
      abLabelRaw,
      limitRaw,
      cmdRaw,
      logMenuRaw,
      logConsoleRaw,
      sendMsgRaw,
      sendFailRaw
    ] = resp.formValues;

    // 4) parse back into typed values
    const enabled               = Boolean(enRaw);
    const playerTagFilter       = tagsRaw.trim()
                                ? filterNone(sanitizeList(tagsRaw))
                                : config.playerTagFilter;
    const playerScoreObj        = scoreObjRaw.trim()
                                ? scoreObjRaw.trim()
                                : config.playerScoreFilter.objective;
    const scrRange              = scoreRangeRaw.trim()
                                ? parseRangeInput(scoreRangeRaw.trim())
                                : { min: config.playerScoreFilter.min, max: config.playerScoreFilter.max };

    const positionEnabledNew    = Boolean(posFiltRaw);
    let playerLocation          = null;
    if (positionEnabledNew && posRangeRaw.trim()) {
      const [rx, ry, rz] = posRangeRaw.split(",").map(s => s.trim());
      playerLocation = {
        x: parseRangeInput(rx),
        y: parseRangeInput(ry),
        z: parseRangeInput(rz),
      };
    }

    const xEnabled              = Boolean(xEnRaw);
    const yEnabled              = Boolean(yEnRaw);
    const zEnabled              = Boolean(zEnRaw);

    const objectiveName         = objNameRaw.trim() || config.objectiveName;
    const displayName           = dispNameRaw.trim() || config.displayName;
    const displayFormatOptions  = ["blocks","hundreds","thousands","million"];
    const displayFormat         = displayFormatOptions[fmtIdxRaw] || displayFormatOptions[0];

    const incrementAmt          = amtRaw.trim()
                                ? parseRangeInput(amtRaw.trim())
                                : config.incrementScore.amount;
    const mode                  = modeIdx === 1 ? "remove" : "add";
    const allowNegative         = Boolean(negRaw);

    const actionBarEnabled      = Boolean(abEnRaw);
    const actionBarFormatCode   = /^[a-u0-9]$/.test(abCodeRaw.trim())
                                ? abCodeRaw.trim()
                                : defaultDistanceConfig.actionBarFormatCode;
    const actionBarLabel        = abLabelRaw.trim() || "";

    let distanceLimit           = parseFloat(limitRaw.trim());
    if (isNaN(distanceLimit) || distanceLimit < 0) distanceLimit = 0;

    const playerCommand         = cmdRaw.trim() || config.playerCommand;
    const logToMenu             = Boolean(logMenuRaw);
    const logToConsole          = Boolean(logConsoleRaw);
    const sendPlayersMessages   = Boolean(sendMsgRaw);
    const sendPlayersFailureMessages = Boolean(sendFailRaw);

    // 5) build new config
    const configToSave = {
      ...config,
      enabled,
      playerTagFilter,
      playerScoreFilter: { objective: playerScoreObj, min: scrRange.min, max: scrRange.max },
      playerLocation,
      xEnabled,
      yEnabled,
      zEnabled,
      objectiveName,
      displayName,
      displayFormat,
      incrementScore: { amount: incrementAmt, mode, allowNegative },
      actionBarEnabled,
      actionBarFormatCode,
      actionBarLabel,
      distanceLimit,
      playerCommand,
      logToMenu,
      logToConsole,
      sendPlayersMessages,
      sendPlayersFailureMessages
    };

    // Build a separate “score range” string for confirmation
    const playerScoreMin = configToSave.playerScoreFilter.min;
    const playerScoreMax = configToSave.playerScoreFilter.max;
    const scoreRangeTxt  = `${playerScoreMin}..${playerScoreMax}`;

    // 6) confirmation dialog
    const dfRange = v => Array.isArray(v) ? v.join(", ") : v;
    const inc     = configToSave.incrementScore.amount;
    const incTxt  = `${inc.min}${inc.min !== inc.max ? `..${inc.max}` : ""}`;
    const posTxt  = configToSave.playerLocation
                  ? `${fmtRange(configToSave.playerLocation.x)},${fmtRange(configToSave.playerLocation.y)},${fmtRange(configToSave.playerLocation.z)}`
                  : "(none)";

    new MessageFormData()
      .title("Confirm Distance Counter")
      .body(
        `Name: ${name}\n` +
        `Enabled: ${configToSave.enabled}\n` +
        `Player Tags: ${dfRange(configToSave.playerTagFilter)}\n` +
        `Player Score Obj: ${configToSave.playerScoreFilter.objective}\n` +
        `Player Score Range: ${scoreRangeTxt}\n` +
        `Position Filter: ${Boolean(configToSave.playerLocation)}\n` +
        `Position Range: ${posTxt}\n` +
        `X Enabled: ${configToSave.xEnabled}\n` +
        `Y Enabled: ${configToSave.yEnabled}\n` +
        `Z Enabled: ${configToSave.zEnabled}\n` +
        `Objective Name: ${configToSave.objectiveName}\n` +
        `Display Name: ${configToSave.displayName}\n` +
        `Display Format: ${configToSave.displayFormat}\n` +
        `Increment: ${incTxt} (${configToSave.incrementScore.mode})\n` +
        `Allow Negative: ${configToSave.incrementScore.allowNegative}\n` +
        `Action Bar Enabled: ${configToSave.actionBarEnabled}\n` +
        `Format Code: ${configToSave.actionBarFormatCode}\n` +
        `Label: ${configToSave.actionBarLabel || "(none)"}\n` +
        `Distance Limit: ${configToSave.distanceLimit}\n` +
        `Player Command: ${configToSave.playerCommand || "None"}\n` +
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
          showConfigureDistanceCounterForm(player, name);
        } else {
          saveDistanceCounter(name, configToSave);
          player.sendMessage(`Distance Counter '${name}' saved.`);
          addLog(`§a[Add/Edit]§r ${player.nameTag} updated distance counter ${name}`);
          manageAllCountersMenu(player);
        }
      });
  });
}


//---------------------------------------------------------------------------------


//------------------------------Distance Counter Logic------------------------------

const lastPos = new Map();
const counterLastPos = {}; // outside of runInterval, at top of file

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    const name = player.nameTag;
    const { x, y, z } = player.location;


    // ─── DEFAULT “distanceTraveled” COUNTER ─────────────────────────────────
    if (basicCounterConfigs.distanceTraveled) {
      if (lastPos.has(name)) {
        const prev = lastPos.get(name);
        const dx = x - prev.x,
              dy = y - prev.y,
              dz = z - prev.z;
        // floor to whole‐block distance
        const dist = Math.floor(Math.sqrt(dx * dx + dy * dy + dz * dz));

        const distObj   = createScoreboardIfNotExists( "distance_traveled", "Distance Traveled");
        const distObjGlobal = createScoreboardIfNotExists("total_distance", "Total Distance")
        const priorDist = getScoreSafe(name, distObj.id) || 0;
        distObj.setScore(name, priorDist + dist);
        distObjGlobal.setScore("total_distance", getScoreSafe("total_distance", distObjGlobal.id) + dist);

        if (
          basicCounterConfigs.distanceTraveledActionBar &&
          !basicCounterConfigs.globalActionBar
        ) {
          const fmt    = basicCounterConfigs.distanceTraveledActionBarFormat || "";
          const prefix = fmt.length === 1
            ? `§${fmt}`
            : fmt.startsWith("§")
              ? fmt
              : "";
          const text = `${prefix}Dist: ${priorDist + dist} blocks`;
          player.runCommandAsync(
            `/titleraw @s actionbar ${JSON.stringify({ rawtext:[{ text }] })}`
          );
        }
      }
      lastPos.set(name, { x, y, z });
    }

    // ─── DEFAULT “coordinateScore” COUNTER ─────────────────────────────────
    if (basicCounterConfigs.coordinateScore) {
      const rx = Math.round(x);
      const ry = Math.round(y);
      const rz = Math.round(z);

      const objX = createScoreboardIfNotExists("coord_x", "X Coordinate");
      const objY = createScoreboardIfNotExists("coord_y", "Y Coordinate");
      const objZ = createScoreboardIfNotExists("coord_z", "Z Coordinate");

      objX.setScore(name, rx);
      objY.setScore(name, ry);
      objZ.setScore(name, rz);

      if (
        basicCounterConfigs.coordinateScoreActionBar &&
        !basicCounterConfigs.globalActionBar
      ) {
        const fmt    = basicCounterConfigs.coordinateScoreActionBarFormat || "";
        const prefix = fmt.length === 1
          ? `§${fmt}`
          : fmt.startsWith("§")
            ? fmt
            : "";
        const text = `${prefix}X: ${rx} Y: ${ry} Z: ${rz}`;
        player.runCommandAsync(
          `/titleraw @s actionbar ${JSON.stringify({ rawtext:[{ text }] })}`
        );
      }
    }

  // ─── CUSTOM “distanceCounter” LOGIC ─────────────────────────────────────
if (distanceCounters && Object.keys(distanceCounters).length) {
      for (const [counterName, config] of Object.entries(distanceCounters)) {
        if (!config.enabled) continue;

        // 1) Ensure a Map exists for this counterName
        if (!counterLastPos[counterName]) {
          counterLastPos[counterName] = new Map();
        }
        const lastMap = counterLastPos[counterName];

        // 2) Initialize this player’s last position for this counter if missing
        if (!lastMap.has(name)) {
          lastMap.set(name, { x, y, z, rem: 0 });
          continue;
        }

        // 3) Retrieve stored entry: previous X/Y/Z and fractional remainder
        const entry = lastMap.get(name);
        const prevX = entry.x;
        const prevY = entry.y;
        const prevZ = entry.z;
        let remainder = entry.rem;

        // 4) Compute full‐world deltas since last tick
        const dxFull = x - prevX;
        const dyFull = y - prevY;
        const dzFull = z - prevZ;

        // 5) Apply axis toggles
        const dx = config.xEnabled ? dxFull : 0;
        const dy = config.yEnabled ? dyFull : 0;
        const dz = config.zEnabled ? dzFull : 0;

        // 6) Calculate raw “moved” along enabled axes + carry over fractional remainder
        const rawMoved = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const totalMoved = remainder + rawMoved;
        const movedBlocks = Math.floor(totalMoved);
        remainder = totalMoved - movedBlocks;

        // If there isn’t at least one whole block on the enabled axes, update and skip
        if (movedBlocks <= 0) {
          lastMap.set(name, { x, y, z, rem: remainder });
          continue;
        }

        // 7) PLAYER TAG FILTER
        if (Array.isArray(config.playerTagFilter) && config.playerTagFilter.length) {
          const tags = player.getTags();
          let passesTag = false;
          for (const tagFilter of config.playerTagFilter) {
            if (tagFilter.startsWith("!") && !tags.includes(tagFilter.slice(1))) {
              passesTag = true;
            }
            if (!tagFilter.startsWith("!") && tags.includes(tagFilter)) {
              passesTag = true;
            }
          }
          if (!passesTag) {
            if (config.logToConsole) {
              console.log(
                `[DistanceCounter:${counterName}] TagFilter-§cFail§r Required: (${config.playerTagFilter.join(", ")}) ${player.nameTag} Actual: (${tags.join(", ")})`
              );
            }
            
            if (config.sendPlayersFailureMessages) {
              player.sendMessage(`[Distance-Debug: ${counterName}] TagFilter-§cFail§r Required: (${config.playerTagFilter.join(", ")}) ${player.nameTag} Actual: (${tags.join(", ")})`);
            }
            lastMap.set(name, { x, y, z, rem: remainder });
            continue;
          }
        }

// 8) PLAYER SCORE FILTER (WITH OBJECTIVE DEBUG)
if (
  config.playerScoreFilter.objective &&
  config.playerScoreFilter.objective !== "none"
) {
  const objName = config.playerScoreFilter.objective;

  // ─── Debug: print exactly which objective string we’re about to check ───
  if (config.logToConsole) {
    console.log(
      `[Distance-Debug:${counterName}] Checking player score on objective: '${objName}'`
    );
  }

  // a) ensure the objective exists (or create it if missing)
  const obj = createScoreboardIfNotExists(objName, objName);

  // b) lookup the player’s score (may be undefined)
  const raw = getScoreSafe(player, objName);

  if (raw === undefined) {
    if (config.logToConsole) {
      console.log(
        `[Distance-Debug:${counterName}] ${name} has NO stored score in '${objName}'. Skipping.`
      );
    }
    if (config.sendPlayersFailureMessages) {
      player.sendMessage(
        `[Distance-Debug: ${counterName}] §cFAIL§r No score found in objective '${objName}'.`
      );
    }
    lastMap.set(name, { x, y, z, rem: remainder });
    continue;
  }

  const currentScore = raw;
  const minVal       = config.playerScoreFilter.min;
  const maxVal       = config.playerScoreFilter.max;

  // ─── debug exact values ───
  if (config.logToConsole) {
    console.log(
      `[Distance-Debug: ${counterName}] ${name} - currentScore=${currentScore}, required=[${minVal}..${maxVal}]`
    );
  }

  if (currentScore < minVal || currentScore > maxVal) {
    if (config.logToConsole) {
      console.log(
        `[Distance-Debug:${counterName}] ${name} §cFAIL§r (score ${currentScore} not in [${minVal}..${maxVal}]).`
      );
    }
    if (config.sendPlayersFailureMessages) {
      player.sendMessage(
        `[Distance-Debug:${counterName}] Your score ${currentScore} is outside [${minVal}..${maxVal}].`
      );
    }
    lastMap.set(name, { x, y, z, rem: remainder });
    continue;
  }
}


        // 9) PLAYER LOCATION FILTER
const posCfg = config.playerLocation;
if (posCfg) {
  // Round off for debugging
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rz = Math.round(z);

  if (
    x < posCfg.x.min ||
    x > posCfg.x.max ||
    y < posCfg.y.min ||
    y > posCfg.y.max ||
    z < posCfg.z.min ||
    z > posCfg.z.max
  ) {
    if (config.logToConsole) {
      console.log(
        `[Distance-Debug: ${counterName}] Location §cFAIL§r actual: (${rx}, ${ry}, ${rz}) ` +
        `required: (${posCfg.x.min}..${posCfg.x.max}, ${posCfg.y.min}..${posCfg.y.max}, ${posCfg.z.min}..${posCfg.z.max})`
      );
    }
    if (config.sendPlayersFailureMessages) {
      player.sendMessage(
        `[Distance-Debug: ${counterName}] Location §cFAIL§r actual: (${rx}, ${ry}, ${rz}) ` +
        `required: (${posCfg.x.min}..${posCfg.x.max}, ${posCfg.y.min}..${posCfg.y.max}, ${posCfg.z.min}..${posCfg.z.max})`
      );
    }
    lastMap.set(name, { x, y, z, rem: remainder });
    continue;
  }
}


        // 10) DISTANCE LIMIT CHECK
        if (config.distanceLimit > 0) {
          const obj = createScoreboardIfNotExists(
            counterName,
            config.displayName || counterName
          );
          const prevScore = getScoreSafe(name, obj.id) || 0;
          if (prevScore + movedBlocks > config.distanceLimit) {
            if (config.logToConsole) {
              console.log(
                `[DistanceCounter:${counterName}] ${name} skipped (distance limit reached).`
              );
            }
            if (config.logToMenu) {
              addLog(
                `[Distance-Counter:${counterName}] ${player.name} reached the counter limit of ${config.distanceLimit}.`
              );
            }
            if (config.sendPlayersMessages) {
              player.sendMessage(`§a[${counterName}] Distance limit of ${config.distanceLimit} reached.`);
            }
            if (config.sendPlayersFailureMessages) {
              player.sendMessage(`§a[${counterName}] Distance limit of ${config.distanceLimit} reached.`);
            }
            lastMap.set(name, { x, y, z, rem: remainder });
            continue;
          }
        }

        // 11) WRITE TO SCOREBOARD via applyDeltaSafely
        const objective = createScoreboardIfNotExists(
          counterName,
          config.displayName || counterName
        );
        // Temporarily override increment amount so that delta = movedBlocks
        const originalAmount = config.incrementScore.amount;
        config.incrementScore.amount = { min: movedBlocks, max: movedBlocks };
        applyDeltaSafely(objective, name, config.incrementScore);
        config.incrementScore.amount = originalAmount;

        // 12) OPTIONAL LOGGING / ACTION BAR / PLAYER MESSAGES
        if (config.logToConsole) {
          console.log(
            `[DistanceCounter:${counterName}] ${name} moved ${movedBlocks} blocks`
          );
        }
const score = getScoreSafe(name, objective.id) || 0;
      if (config.actionBarEnabled) {
  
  let shouldShow  = false;
  let displayText = "";
  const label = config.actionBarLabel ? config.actionBarLabel + " " : "";

  switch (config.displayFormat) {
    case "blocks":
      shouldShow = true;
      displayText = `${label}${score} blocks`;
      break;

    case "hundreds":
      if (score % 100 === 0) {
        shouldShow = true;
        displayText = `${label}${score} blocks`;
      }
      break;

    case "thousands":
      // Always show “k” (even if < 1000, it will show “0.0 k”)
      shouldShow = true;
      displayText = `${label}${(score / 1000).toFixed(1)}k blocks`;
      break;

    case "million":
      // Only switch to “m” once you’re at 1 000 000 or more:
      if (score >= 1_000_000) {
        shouldShow = true;
        displayText = `${label}${(score / 1_000_000).toFixed(1)}m blocks`;
      }
      break;

    default:
      shouldShow = true;
      displayText = `${label}${score} blocks`;
      break;
  }

  if (shouldShow) {
    const fmt = config.actionBarFormatCode || "";
    const prefix =
      fmt.length === 1
        ? `§${fmt}`
        : fmt.startsWith("§")
        ? fmt
        : "";
    const raw = JSON.stringify({ rawtext: [{ text: prefix + displayText }] });
    player.runCommandAsync(`/titleraw @s actionbar ${raw}`);
  }
}




        if (config.sendPlayersMessages) {
          player.sendMessage(`You traveled ${movedBlocks} blocks - Now at ${score} blocks.`);
        }

        // 13) UPDATE this counter’s lastPos/remainder for next tick
        lastMap.set(name, { x, y, z, rem: remainder });
      }
    }

}
}, 10);
