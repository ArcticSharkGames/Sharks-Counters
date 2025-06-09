
import { world } from "@minecraft/server";
import { ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { addLog, loadLogConfigs } from "./logManager";

import { adminMainMenu,
    parseRangeInput,
    createScoreboardIfNotExists,
    showSettingsMenu,
    randomInRange,
    checkScoreFilter,
    getScoreSafe,
    showSingleActionBar,
    showPvPActionBar,
    applyDeltaSafely,
    manageAllCountersMenu,
    lastDeathPositions } from "./main";

///--------------- PVP KILLS COUNTER MEMORY AND CONFIGS ----------------
const PVP_KILLS_PREFIX = "pvpKillCounter:";

export const defaultPvPKillCounterConfig = {
  enabled: true,
  actionBarEnabled: true,
  actionBarFormatCode: "r",
  logToConsole: false,
  logToMenu: false,
  sendPlayersMessages: true,
  sendPlayersFailureMessages: false,
  objectiveName: "kills",
  displayName: "Kills",
  killerScoreEnabled: true,
  incrementScore: {
    amount: {
      min: 1,
      max: 1
    },
    mode: "add",
    allowNegative: false,
  },
  deadEntity: ["player"],
  itemType: [],
  killerTagFilter: [],
  deathTagFilter: [],
  killerScoreFilter: {
    objective: "none",
    min: 1,
    max: 1
  },
  deathScoreFilter: {
    objective: "none",
    min: 1,
    max: 1
  },
  onlyPlayerKill: true,
  excludeTrident: false,
  displayType: ["none"],
  victimScore: {
    victimScoreObjective: ["deaths"],
    victimScoreDisplayName: ["Deaths"],
    victimScoreEnabled: false,
    victimScoreIncriment: "add",
    victimScoreAllowNegative: false,
    victimScoreAmount: {
      min: 1,
      max: 1
    }
  },
   killLocation: { 
    x: { min: -100, max: 100 },
    y: { min: -100, max: 100 },
    z: { min: -100, max: 100 },
    },
    killLocationEnabled: false,
    killerCommand: "",
    victimCommand: "",
    sendDeathCoords: false,
    teleportVictim: false,
    dimensionFilter: ["overworld", "nether", "the_end"]
};

export let pvpKillCounters = {};

export function savePvPKillCounter(counterName, config) {
  try {
    const raw = JSON.stringify(config);
    world.setDynamicProperty(PVP_KILLS_PREFIX + counterName, raw);
    pvpKillCounters[counterName] = config;
  } catch (e) {
    console.error(`[Save] Failed to save PvP Kill Counter '${counterName}':`, e);
  }
}
///LOAD DATA

export function loadPvPKillCounters() {
  try {
    const allKeys = world.getDynamicPropertyIds();
    for (const key of allKeys) {
      if (key.startsWith(PVP_KILLS_PREFIX)) {
        const counterName = key.slice(PVP_KILLS_PREFIX.length);
        const raw = world.getDynamicProperty(key);
        try {
          const parsed = JSON.parse(raw);

          const defaultLoc = defaultPvPKillCounterConfig.killLocation;
          const parsedLoc = parsed.killLocation || {};
          const killLocation = {
                x: {
                      min: parsedLoc.x?.min  ?? defaultLoc.x.min,
                      max: parsedLoc.x?.max  ?? defaultLoc.x.max,
                   },
                y: {
                      min: parsedLoc.y?.min  ?? defaultLoc.y.min,
                      max: parsedLoc.y?.max  ?? defaultLoc.y.max,
                    },
                z: {
                      min: parsedLoc.z?.min  ?? defaultLoc.z.min,
                      max: parsedLoc.z?.max  ?? defaultLoc.z.max,
                    },
                     };
          const killLocationEnabled =
                parsed.killLocationEnabled
                ?? defaultPvPKillCounterConfig.killLocationEnabled;

          // ── victimScore block normalization ────────────────────────
          let victimScore = {
            ...defaultPvPKillCounterConfig.victimScore,
            ...parsed.victimScore,
          };
          const rawAmount = parsed.victimScore?.victimScoreAmount;
          if (typeof rawAmount === "object" && rawAmount !== null) {
            victimScore.victimScoreAmount = {
              min: rawAmount.min ?? 1,
              max: rawAmount.max ?? 1,
            };
          } else {
            const fallback = Number.isFinite(rawAmount) ? rawAmount : 1;
            victimScore.victimScoreAmount = { min: fallback, max: fallback };
          }
          if (!Array.isArray(victimScore.victimScoreDisplayName)) {
            const rawName = parsed.victimScore?.victimScoreDisplayName;
            victimScore.victimScoreDisplayName = rawName ? [String(rawName)] : ["Deaths"];
          }
          victimScore.victimScoreAllowNegative =
            parsed.victimScore?.victimScoreAllowNegative ?? false;

          // ── incrementScore.allowNegative normalization ─────────────
          const incrementScore = {
            ...defaultPvPKillCounterConfig.incrementScore,
            ...parsed.incrementScore,
            allowNegative: parsed.incrementScore?.allowNegative ?? false,
          };
          const enabled = parsed.enabled ?? defaultPvPKillCounterConfig.enabled
          const killerScoreEnabled = parsed.killerScoreEnabled ?? defaultPvPKillCounterConfig.killerScoreEnabled;
          const actionBarEnabled = parsed.actionBarEnabled ?? defaultPvPKillCounterConfig.actionBarEnabled;
          const logToConsole = parsed.logToConsole ?? defaultPvPKillCounterConfig.logToConsole;
          const logToMenu = parsed.logToMenu ?? defaultPvPKillCounterConfig.logToMenu;
          const sendPlayersMessages =
                parsed.sendPlayersMessages ?? defaultPvPKillCounterConfig.sendPlayersMessages;
          const sendPlayersFailureMessages =
                parsed.sendPlayersFailureMessages ??
                defaultPvPKillCounterConfig.sendPlayersFailureMessages;
          const actionBarFormatCode =
                parsed.actionBarFormatCode ?? defaultPvPKillCounterConfig.actionBarFormatCode;
          const itemType = Array.isArray(parsed.itemType)
                    ? parsed.itemType
                    : defaultPvPKillCounterConfig.itemType;
          const killerTagFilter = Array.isArray(parsed.killerTagFilter)
                    ? parsed.killerTagFilter
                    : defaultPvPKillCounterConfig.killerTagFilter;
          const deathTagFilter = Array.isArray(parsed.deathTagFilter)
                    ? parsed.deathTagFilter
                    : defaultPvPKillCounterConfig.deathTagFilter;
          const killerCommand = parsed.killerCommand ?? defaultPvPKillCounterConfig.killerCommand;
          const victimCommand = parsed.victimCommand ?? defaultPvPKillCounterConfig.victimCommand;
          const sendDeathCoords = parsed.sendDeathCoords ?? defaultPvPKillCounterConfig.sendDeathCoords;
          const teleportVictim = parsed.teleportVictim ?? defaultPvPKillCounterConfig.teleportVictim;
          const dimensionFilter = Array.isArray(parsed.dimensionFilter)
                            ? parsed.dimensionFilter
                            : defaultPvPKillCounterConfig.dimensionFilter;

          pvpKillCounters[counterName] = {
            ...defaultPvPKillCounterConfig,
            ...parsed,
            killLocationEnabled,
            killLocation,
            enabled,
            killerScoreEnabled,
            incrementScore,
            killerScoreFilter: {
              ...defaultPvPKillCounterConfig.killerScoreFilter,
              ...parsed.killerScoreFilter,
            },
            killerTagFilter,
            deathScoreFilter: {
              ...defaultPvPKillCounterConfig.deathScoreFilter,
              ...parsed.deathScoreFilter,
            },
            deathTagFilter,
            victimScore,
            itemType,
            actionBarEnabled,
            logToConsole,
            logToMenu,
            sendPlayersMessages,
            sendPlayersFailureMessages,
            actionBarFormatCode,
            killerCommand,
            victimCommand,
            sendDeathCoords,
            teleportVictim,
            dimensionFilter,
            type: "pvpkill"   
          };
        } catch {
          console.warn(
            `[Load] Failed to parse PvP Kill Counter config for '${counterName}'`
          );
        }
      }
    }
  } catch (e) {
    console.error("[Load] Failed to load PvP Kill counters:", e);
  }
}


//------------------------------------------------------------------------------


//-------- DELETE PVP COUNTER MENU--------------------
export function deletePvPKillCounter(counterName) {
  try {
    world.setDynamicProperty(PVP_KILLS_PREFIX + counterName, undefined);
    delete pvpKillCounters[counterName];
  } catch (e) {
    console.error(`[Delete] Failed to delete PvP Kill Counter '${counterName}':`, e);
  }
}

///-------- Show PVP Counter Config Menu-----------------
export function showConfigurePvPKillCounterForm(player, name) {
  const rawConfig = pvpKillCounters[name] || {};
  const config = {
    ...defaultPvPKillCounterConfig,
    ...rawConfig,
    incrementScore: {
      ...defaultPvPKillCounterConfig.incrementScore,
      ...rawConfig.incrementScore,
    },
    killerScoreFilter: {
      ...defaultPvPKillCounterConfig.killerScoreFilter,
      ...rawConfig.killerScoreFilter,
    },
    deathScoreFilter: {
      ...defaultPvPKillCounterConfig.deathScoreFilter,
      ...rawConfig.deathScoreFilter,
    },
    victimScore: {
      ...defaultPvPKillCounterConfig.victimScore,
      ...rawConfig.victimScore,
    },
  };

  // Allow ranges and exclusions: 1..10, ..5, 1.., !3
  const sanitizeList = (raw, allowSpaces = false) =>
    raw
      ?.split(',')
      .map(s => s.trim())
      .map(s => {
        const isNeg = !allowSpaces && s.startsWith('!');
        const core = isNeg ? s.slice(1) : s;
        const cleaned = allowSpaces ? core : core.replace(/[^a-zA-Z0-9_:]/g, '');
        return isNeg ? `!${cleaned}` : cleaned;
      })
      .filter(Boolean) || [];
  const filterNone = list => list.filter(e => e.toLowerCase() !== 'none');
  const formatRange = r =>
    r.exclude
      ? `!${r.exclude.min ?? ''}${r.exclude.min != null && r.exclude.max != null ? '..' : ''}${r.exclude.max ?? ''}`
      : `${r.min ?? ''}${r.min != null && r.max != null ? '..' : ''}${r.max ?? ''}`;

  const initial = {
    objectiveName: Array.isArray(config.objectiveName)
      ? config.objectiveName.join(', ')
      : config.objectiveName || '',
    displayName: Array.isArray(config.displayName)
      ? config.displayName.join(', ')
      : config.displayName || '',
    incrementAmount: formatRange(config.incrementScore.amount),
    removeMode: config.incrementScore.mode === 'remove',
    allowNegative: Boolean(config.incrementScore.allowNegative),
    killerScoreEnabled: Boolean(config.killerScoreEnabled),
    actionBarEnabled: Boolean(config.actionBarEnabled),
    actionBarFormatCode: String(config.actionBarFormatCode ?? "r"),
    killerTags: Array.isArray(config.killerTagFilter)
      ? config.killerTagFilter.join(', ')
      : '',
    killerScoreObj: Array.isArray(config.killerScoreFilter.objective)
      ? config.killerScoreFilter.objective.join(', ')
      : '',
    killerScoreRange: formatRange(config.killerScoreFilter),
    itemType: Array.isArray(config.itemType)
      ? config.itemType.join(", ")
      : "",
    deathTags: Array.isArray(config.deathTagFilter)
      ? config.deathTagFilter.join(', ')
      : '',
    deathScoreObj: Array.isArray(config.deathScoreFilter.objective)
      ? config.deathScoreFilter.objective.join(', ')
      : '',
    deathScoreRange: formatRange(config.deathScoreFilter),
    victimScoreObj: Array.isArray(config.victimScore.victimScoreObjective)
      ? config.victimScore.victimScoreObjective.join(', ')
      : '',
    victimScoreDisplay: Array.isArray(config.victimScore.victimScoreDisplayName)
      ? config.victimScore.victimScoreDisplayName.join(', ')
      : '',
    victimScoreRange: formatRange(config.victimScore.victimScoreAmount),
    victimScoreEnabled: Boolean(config.victimScore.victimScoreEnabled),
    victimAddMode: config.victimScore.victimScoreIncriment === 'add',
    victimAllowNegative: Boolean(config.victimScore.victimScoreAllowNegative),
    killLocationEnabled: Boolean(config.killLocationEnabled),
    killLocation:
    `${config.killLocation.x.min}..${config.killLocation.x.max},` +
    `${config.killLocation.y.min}..${config.killLocation.y.max},` +
    `${config.killLocation.z.min}..${config.killLocation.z.max}`,
    killerCommand: String(config.killerCommand ?? ""),
    victimCommand: String(config.victimCommand ?? ""),
    logToConsole: config.logToConsole,
    logToMenu: config.logToMenu,
    sendPlayersMessages: config.sendPlayersMessages,
    sendPlayersFailureMessages: config.sendPlayersFailureMessages,
    sendDeathCoords: Boolean(config.sendDeathCoords),
    teleportVictim: Boolean(config.teleportVictim),
  };

  const form = new ModalFormData()
    .title(`Configure PvP Kill Counter: ${name}`)
    .toggle('Counter Enabled', config.enabled)            //1
    .toggle("Action Bar Enabled", initial.actionBarEnabled)  //2
    .textField("Action Bar Format Code", "a–u or 0–9", initial.actionBarFormatCode) //3
    .toggle("Killer Score Enabled", initial.killerScoreEnabled)
    .textField('Killer Score Objective Name(s)', 'pvpKills', initial.objectiveName) //4
    .textField('Killer Display Name(s)', 'PvP Kills', initial.displayName) //5
    .textField('Killer Increment Score Amount', 'e.g. 1, 1..10, ..10, !5', initial.incrementAmount) //6
    .dropdown('Killer Score Mode', ['Add Score', 'Remove Score'], initial.removeMode ? 1 : 0 )
    .toggle('Allow Negative Numbers (Killer)', initial.allowNegative) //9
    .textField('Execute Command as Killer (e.g /give @s diamond 1 0)', '', initial.killerCommand)
    .textField('Killer Required Tags', 'e.g. member,!noPvP', initial.killerTags) //10
    .textField('Killer Required Score Objective(s)', 'e.g. teamScore', initial.killerScoreObj) //11
    .textField('Killer Required Score Range', 'e.g. 1, 1..10, !3, ..5', initial.killerScoreRange) //12
    .textField('Killer Item Type Filter', 'minecraft:diamond_axe,!minecraft:netherite_axe', initial.itemType) //13
    .textField('Victim Required Tags', 'e.g. boss,!invulnerable', initial.deathTags)
    .textField('Victim Required Score Objective(s)', 'e.g. deathCount', initial.deathScoreObj)
    .textField('Victim Required Score Range', 'e.g. 0, ..0, !1', initial.deathScoreRange)
    .textField('Victim Score Objective(s)', 'e.g. deaths,pvpDeaths', initial.victimScoreObj)
    .textField('Victim Score Display Name(s)', 'e.g. Deaths,PvP Deaths', initial.victimScoreDisplay)
    .textField('Victim Score Amount', 'e.g. 1, 1..5, ..3, !2', initial.victimScoreRange)
    .toggle('Enable Victim Score', initial.victimScoreEnabled)
    .dropdown('Victim Score Mode', ['Add Victim Score', 'Remove Victim Score'], initial.victimAddMode ? 0 : 1 )
    .toggle('Allow Negative Numbers (Victim)', initial.victimAllowNegative)
    .textField('Execute Command as Victim (e.g /clear @s diamond 0 1)', '', initial.victimCommand)
    .toggle("Kill Location Enabled", initial.killLocationEnabled)
    .textField("Kill Location (x, y, z) or a range (x..x, y..y, z..z)", "e.g. -100..100,-100..100,-100..100", initial.killLocation)
    .toggle('Debug Log To Console', initial.logToConsole)
    .toggle('Log To Menu', initial.logToMenu)
    .toggle('Send Players Messages', initial.sendPlayersMessages)
    .toggle('Send Killer Player Debug Messages', initial.sendPlayersFailureMessages)
    .toggle('Send Victim Last Death Coords', initial.sendDeathCoords)
    .toggle('Teleport Victim To Last Death Coords', initial.teleportVictim);

  form.show(player).then(response => {
    if (response.canceled) return;
    const [
      enabledRaw, //1
      actionBarEnabledRaw, //2
      actionBarFormatCodeRaw, //3
      killerScoreEnabledRaw, //4
      objectiveNameRaw, //5
      displayNameRaw, //6
      incrementRaw, //7
      killerModeIndex, //8
      allowNegKiller, //9
      killerCommandRaw,
      killerTagsRaw, //10
      killerScoreObjRaw, //11
      killerScoreRangeRaw, //12
      itemTypeRaw, //13
      deathTagsRaw,
      deathScoreObjRaw,
      deathScoreRangeRaw,
      victimScoreObjRaw,
      victimScoreDisplayRaw,
      victimScoreRangeRaw,
      victimScoreEnabledToggle,
      victimModeIndex,
      victimAllowNeg,
      victimCommandRaw,
      killLocationEnabledRaw,
      killLocationRaw,
      logToggle,
      logMenuToggle,
      sendMsgToggle,
      sendMsgFailureToggle,
      sendDeathCoordsToggle,
      teleportVictimToggle
    ] = response.formValues;
    

    const enabled = Boolean(enabledRaw); //1

    const actionBarEnabled = Boolean(actionBarEnabledRaw); //2
    
    const rawCode = String(actionBarFormatCodeRaw).trim();
    const actionBarFormatCode = /^[a-u0-9]$/.test(rawCode) //3
          ? rawCode
          : defaultPvPKillCounterConfig.actionBarFormatCode;
    const killerScoreEnabled = Boolean(killerScoreEnabledRaw); //4
    const objectiveNameArr = objectiveNameRaw.trim() //5
      ? filterNone(sanitizeList(objectiveNameRaw))
      : defaultPvPKillCounterConfig.objectiveName;

    const displayNameArr = displayNameRaw.trim()  //6
      ? sanitizeList(displayNameRaw, true)
      : defaultPvPKillCounterConfig.displayName;

    const incrementAmount = incrementRaw.trim() //7
      ? parseRangeInput(incrementRaw.trim())
      : defaultPvPKillCounterConfig.incrementScore.amount;
    const modeStr = killerModeIndex === 1 ? 'remove' : 'add'; //8
    const allowNeg = Boolean(allowNegKiller); //9
    
    const killerTagFilter = killerTagsRaw.trim() //10
      ? filterNone(sanitizeList(killerTagsRaw))
      : defaultPvPKillCounterConfig.killerTagFilter;

    const killerScoreParsed = killerScoreRangeRaw.trim() //11
      ? parseRangeInput(killerScoreRangeRaw.trim())
      : defaultPvPKillCounterConfig.killerScoreFilter;
    const killerScoreFilter = {
      objective: killerScoreObjRaw.trim()
        ? filterNone(sanitizeList(killerScoreObjRaw))
        : defaultPvPKillCounterConfig.killerScoreFilter.objective,
      min: killerScoreParsed.min,
      max: killerScoreParsed.max,
      exclude: killerScoreParsed.exclude, //12
    };
    const itemType = itemTypeRaw.trim() //13
      ? filterNone(sanitizeList(itemTypeRaw))
      : defaultPvPKillCounterConfig.itemType;
      
    const deathTagFilter = deathTagsRaw.trim()
      ? filterNone(sanitizeList(deathTagsRaw))
      : defaultPvPKillCounterConfig.deathTagFilter;
    const deathScoreParsed = deathScoreRangeRaw.trim()
      ? parseRangeInput(deathScoreRangeRaw.trim())
      : defaultPvPKillCounterConfig.deathScoreFilter;
    const deathScoreFilter = {
      objective: deathScoreObjRaw.trim()
        ? filterNone(sanitizeList(deathScoreObjRaw))
        : defaultPvPKillCounterConfig.deathScoreFilter.objective,
      min: deathScoreParsed.min,
      max: deathScoreParsed.max,
      exclude: deathScoreParsed.exclude,
    };

    const victimScoreObjectiveArr = victimScoreObjRaw.trim()
      ? filterNone(sanitizeList(victimScoreObjRaw))
      : defaultPvPKillCounterConfig.victimScore.victimScoreObjective;
    const victimScoreDisplayArr = victimScoreDisplayRaw.trim()
      ? sanitizeList(victimScoreDisplayRaw, true)
      : victimScoreObjectiveArr.map(o => o.charAt(0).toUpperCase() + o.slice(1));
    const victimScoreParsed = victimScoreRangeRaw.trim()
      ? parseRangeInput(victimScoreRangeRaw.trim())
      : defaultPvPKillCounterConfig.victimScore.victimScoreAmount;
    const victimScoreAmount = { min: victimScoreParsed.min, max: victimScoreParsed.max, exclude: victimScoreParsed.exclude };
    const victimScoreEnabled = Boolean(victimScoreEnabledToggle);
    const victimModeStr = victimModeIndex === 1 ? 'remove' : 'add';
    const victimAllowNegative = Boolean(victimAllowNeg);

const killLocationEnabled = Boolean(killLocationEnabledRaw);
          const [xRaw = "", yRaw = "", zRaw = ""] =
          String(killLocationRaw).split(/\s*,\s*/);
    
          // parseRangeInput for each (falls back to defaults if empty)
          const locX = xRaw.trim()
          ? parseRangeInput(xRaw.trim())
          : defaultPvPKillCounterConfig.killLocation.x;
          const locY = yRaw.trim()
          ? parseRangeInput(yRaw.trim())
           : defaultPvPKillCounterConfig.killLocation.y;
          const locZ = zRaw.trim()
          ? parseRangeInput(zRaw.trim())
          : defaultPvPKillCounterConfig.killLocation.z;
    const killLocation = { x: locX, y: locY, z: locZ };

    const killerCommand = String(killerCommandRaw).trim();
    const victimCommand = String(victimCommandRaw).trim();


    const logToConsole = Boolean(logToggle);
    const logToMenu = Boolean(logMenuToggle);
    const sendPlayersMessages = Boolean(sendMsgToggle);
    const sendPlayersFailureMessages = Boolean(sendMsgFailureToggle);
    const sendDeathCoords = Boolean(sendDeathCoordsToggle);
    const teleportVictim = Boolean(teleportVictimToggle);

    const configToSave = {
      enabled, //1
      actionBarEnabled, //2
      actionBarFormatCode, //3
      killerScoreEnabled,
      objectiveName: objectiveNameArr, //4
      displayName: displayNameArr, //5 
      incrementScore: { amount: incrementAmount, mode: modeStr, allowNegative: allowNeg }, //6 //7 //8 //9
      killerCommand, 
      killerTagFilter, //10
      killerScoreFilter, //11 /12
      itemType, //13
      deathTagFilter,
      deathScoreFilter,
      victimScore: {
        victimScoreEnabled,
        victimScoreIncriment: victimModeStr,
        victimAllowNegative,
        victimScoreAmount,
        victimScoreObjective: victimScoreObjectiveArr,
        victimScoreDisplayName: victimScoreDisplayArr,
      },
      victimCommand, 
      killLocationEnabled,
      killLocation,
      logToConsole,
      logToMenu,
      sendPlayersMessages,
      sendPlayersFailureMessages,
      sendDeathCoords,
      teleportVictim,
      dimensionFilter: config.dimensionFilter || defaultPvPKillCounterConfig.dimensionFilter,
      type: "pvpkill"
    };

    // Confirmation dialog
    const df = v => (Array.isArray(v) && v.length ? v.join(', ') : 'None');
    const showRange = r => formatRange(r);
    const fmt = formatRange
    const confirm = new MessageFormData()
      .title('Confirm PvP Kill Counter Setup')
      .body(
        `Name: ${name}\n` +
          `Counter Enabled: ${configToSave.enabled}\n` + //1
          `Action Bar Enabled: ${configToSave.actionBarEnabled}\n` + //2
          `Action Bar Format Code: ${configToSave.actionBarFormatCode}\n` + //3
          `Killer Score Enabled: ${configToSave.killerScoreEnabled}\n` + //4
          `Objective(s): ${df(configToSave.objectiveName)}\n` + //5
          `Display Name(s): ${df(configToSave.displayName)}\n` + //6
          `Increment: ${showRange(configToSave.incrementScore.amount)} (${configToSave.incrementScore.mode})\n` + //7 //8 //9
          `Killer Command: ${killerCommand || "None"}\n` +
          `Killer Tags: ${df(configToSave.killerTagFilter)}\n` + //10
          `Killer Score Obj: ${df(configToSave.killerScoreFilter.objective)} [${showRange(configToSave.killerScoreFilter)}]\n` + //11 //12
          `Item Type Filter: ${df(configToSave.itemType)}\n` + //13
          `Death Tags: ${df(configToSave.deathTagFilter)}\n` +
          `Death Score Obj: ${df(configToSave.deathScoreFilter.objective)} [${showRange(configToSave.deathScoreFilter)}]\n` +
          `PvP Score Obj: ${df(configToSave.victimScore.victimScoreObjective)}\n` +
          `PvP Score Display: ${df(configToSave.victimScore.victimScoreDisplayName)}\n` +
          `PvP Score: ${configToSave.victimScore.victimScoreEnabled ? showRange(configToSave.victimScore.victimScoreAmount) + ` (${configToSave.victimScore.victimScoreIncriment})` : 'Disabled'}\n` +
          `Victim Command: ${victimCommand || "None"}\n` +
          `Kill Location Enabled: ${configToSave.killLocationEnabled}\n` +
          `Kill Location: ${fmt(configToSave.killLocation.x)}, ${fmt(configToSave.killLocation.y)}, ${fmt(configToSave.killLocation.z)}\n` +
          `Log To Console: ${configToSave.logToConsole}\n` +
          `Log To Menu: ${configToSave.logToMenu}\n` +
          `Send Players Messages: ${configToSave.sendPlayersMessages}\n` +
          `Send Killer Player Debug Messages: ${configToSave.sendPlayersFailureMessages}\n`  +
          `Send Victim Death Coords: ${configToSave.sendDeathCoords}\n` +
          `Teleport Victim To Death Coords: ${configToSave.teleportVictim}\n`
      )
      .button1('Confirm')
      .button2('Edit');

    confirm.show(player).then(result => {
      if (result.canceled || result.selection === 1) {
        showConfigurePvPKillCounterForm(player, name);
        return;
      }
      savePvPKillCounter(name, configToSave);
      player.sendMessage(`PvP Kill Counter '${name}' saved.`);
      addLog(`§a[Add/Edit]§r ${player.name} Managed A PVP Counter named ${name}`);
      manageAllCountersMenu(player);
    });
  });
}


//---------------------------------------------------------------------------------------

//---------PVP Counter Logic------------

 

// ───  PvP entityDie handler ─────────────────────────────────────────

world.afterEvents.entityDie.subscribe(event => {
  const { deadEntity, damageSource } = event;
  const killer = damageSource?.damagingEntity;
  if (!deadEntity || !killer) return;
  if (deadEntity.typeId !== "minecraft:player" || killer.typeId !== "minecraft:player") return;


//Idividual Counter Logic
  for (const [name, config] of Object.entries(pvpKillCounters)) {
    if (!config?.enabled) {
    if (config.sendPlayersFailureMessages) {
      killer.sendMessage(`§6[PvP-Debug]§r[${name}] Is Set To Disabled - §cStop Processing`)
    } continue; }
  

    const log = (...args) => { if (config.logToConsole) console.warn(...args); };
    
    log(`[PvP Debug][${name}] Start`);

    const objIds = Array.isArray(config.objectiveName)
      ? config.objectiveName
      : [config.objectiveName];
    const dispNames = Array.isArray(config.displayName)
      ? config.displayName
      : [config.displayName];
    
    let killerDelta = 0;
    let victimDelta = 0;

  let pos
   if (typeof deadEntity.location === "object") {
            pos = deadEntity.location;
          } else {
          const posComp = deadEntity.getComponent("minecraft:position");
          pos = posComp?.location;
          }
        const { x, y, z } = pos;

    if (config.sendPlayersFailureMessages) {
      killer.sendMessage(`§6[PvP-Debug]§r[${name}] Starting Processing`)

      const flagStatuses = {
    "action bar toggle": config.actionBarEnabled,
    "allow negative numbers": config.incrementScore.allowNegative,
    "victim score enabled": config.victimScore.victimScoreEnabled,
    "send players messages": config.sendPlayersMessages,
    "send dead players debug messages": config.sendPlayersFailureMessages,
    "log to menu": config.logToMenu,
    "log to console": config.logToConsole,
    "send victim death coords": config.sendDeathCoords,
    "teleport victim to death coords": config.teleportVictim
  };

  const lines = Object.entries(flagStatuses)
    .map(
      ([label, enabled]) =>
        `${label} - ${enabled ? "enabled" : "disabled"}`
    );

  killer.sendMessage(lines.join("\n"));}
  
  
// ── DIMENSION FILTER ──
    // pull the dimension off the deadEntity, not the event
    const dimId = deadEntity.dimension.id.replace("minecraft:", "");
    if (
      Array.isArray(config.dimensionFilter) &&
      config.dimensionFilter.length > 0 &&
      !config.dimensionFilter.includes(dimId)
    ) {
      if (config.sendPlayersFailureMessages) {
        killer.sendMessage(
          `[Death-Debug§r:${name}] DimensionFilter §cFAIL§r ${deadEntity.name} died in ${dimId}, which is disabled`
        );
      }
      // log and skip to next counter
      log(`[DeathCounter:${name}] skipped in ${dimId}`);  
      continue;
    }

   // —— Tag filters —— (unchanged) …
    const rawK = Array.isArray(config.killerTagFilter)
      ? config.killerTagFilter
      : sanitizeList((config.killerTagFilter||[]).join(','), /* allowSpaces=*/ false);
    const includeK = rawK.filter(t => !t.startsWith('!'));
    const excludeK = rawK.filter(t => t.startsWith('!')).map(t => t.slice(1));
    const killerTags = killer.getTags();
    if (config.sendPlayersFailureMessages) {
      killer.sendMessage(`[PvP Debug][${name}] killer tag filter [Included Tags:${includeK}] [Excluded Tags:${excludeK}] [Actual Tags:${killerTags}]`)
    }
    if (excludeK.some(tag => killer.hasTag(tag))) {
    if (config.sendPlayersFailureMessages) {
      killer.sendMessage(`[PvP Debug][${name}] killer tag excluded: ${excludeK} - §cFAIL§r`)
    } 
      log(`[PvP Debug][${name}] killer tag excluded: ${excludeK} - FAIL`);
      continue;
    }
    if (includeK.length && !includeK.every(tag => killer.hasTag(tag))) {

    if (config.sendPlayersFailureMessages) {
      killer.sendMessage(`[PvP Debug][${name}] killer tag missing one of: ${includeK} - §cFAIL§r`)
    } 
    
      log(`[PvP Debug][${name}] killer tag missing one of: ${includeK}- FAIL`);
      continue;
    }

    
    log(`[PvP Debug][${name}] killer tag filter [Included Tags:${includeK}] [Excluded Tags:${excludeK}] [Actual Tags:${killerTags}]`)

    const rawD = Array.isArray(config.deathTagFilter)
      ? config.deathTagFilter
      : sanitizeList((config.deathTagFilter||[]).join(','), /* allowSpaces=*/ false);
    const victimTags = deadEntity.getTags();
    const includeD = rawD.filter(t => !t.startsWith('!'));
    const excludeD = rawD.filter(t => t.startsWith('!')).map(t => t.slice(1));
    if (config.sendPlayersFailureMessages) {
      killer.sendMessage(`[PvP Debug][${name}] victim tag filter [Included Tags:${includeD}] [Excluded Tags:${excludeD}] [Actual Tags:${victimTags}]`)
    }
    if (excludeD.some(tag => deadEntity.hasTag(tag))) {
    
     if (config.sendPlayersFailureMessages) {
      killer.sendMessage(`[PvP Debug][${name}] victim tag excluded: ${excludeD}- §cFAIL`)
    }

      log(`[PvP Debug][${name}] victim tag excluded: ${excludeD}- FAIL`);
      continue;
    }
   

    if (includeD.length && !includeD.every(tag => deadEntity.hasTag(tag))) {
    

      if (config.sendPlayersFailureMessages) {
      killer.sendMessage(`[PvP Debug][${name}] victim tag missing one of: ${includeD}- §cFAIL`)
    }

      log(`[PvP Debug][${name}] victim tag missing one of: ${includeD}- FAIL`);
      continue;
    }
    
    
    log(`[PvP Debug][${name}] victim tag filter [Included Tags:${includeD}] [Excluded Tags:${excludeD}] [Actual Tags:${victimTags}]`)

  // —— REQUIRED ITEM FILTER (uses config.itemType) —— 
  const rawItems = Array.isArray(config.itemType) ? config.itemType : [];
  if (rawItems.length > 0) {
    // 1) grab their inventory & selected slot
    const invComp      = killer.getComponent("inventory");
    const selectedSlot = typeof killer.selectedSlotIndex === "number"
      ? killer.selectedSlotIndex
      : 0;
    const selectedItem = invComp?.container.getItem(selectedSlot);
    const itemId       = selectedItem?.typeId;

    // 2) if filter is set but hand is empty → skip
    if (!itemId) {
    log(
          `[Kill-Debug:${name}] failed: item filter set but no item held - FAIL`
        );
      if (config.sendPlayersFailureMessages) {
        killer.sendMessage(
          `[Kill-Debug:${name}] failed: item filter set but no item held - §cFAIL`
        );
      }
      continue;
    }

    // 3) split include vs exclude
    const includeItems = rawItems.filter(i => !i.startsWith("!"));
    const excludeItems = rawItems
      .filter(i => i.startsWith("!"))
      .map(i => i.slice(1));

    // 4) exclude‐list check
    if (excludeItems.includes(itemId)) {
      log(
          `[Kill-Debug:${name}] failed: held item excluded (${itemId})- FAIL`
        );
      if (config.sendPlayersFailureMessages) {
        killer.sendMessage(
          `[Kill-Debug:${name}] failed: held item excluded (${itemId})- §cFAIL`
        );
      
      }
      continue;
    }
    // 5) include‐list check (only if includes exist)
    if (includeItems.length > 0 && !includeItems.includes(itemId)) {
      log(
          `[Kill-Debug:${name}] failed: held item not in include list (${itemId})- FAIL`
        );
      if (config.sendPlayersFailureMessages) {
        killer.sendMessage(
          `[Kill-Debug:${name}] failed: held item not in include list (${itemId})- §cFAIL`
        );
      }
      continue;
    }
  log(`[Kill-Debug:${name}] [Included Items:${includeItems}] [Excluded Items:${excludeItems}] [Actual Item: ${itemId}]`)
    if (config.sendPlayersFailureMessages) {
      killer.sendMessage(`[Kill-Debug:${name}] [Included Items:${includeItems}] [Excluded Items:${excludeItems}] [Actual Item: ${itemId}]`)
    }  
  }
    


    // —— Score filters ——
    // make sure the PvP filter objectives exist *before* calling checkScoreFilter
    const kObjId = `PvP_KillerScore:${name}`;
    createScoreboardIfNotExists(kObjId, kObjId);
    if (!checkScoreFilter(
      killer,
      config.killerScoreFilter,
      kObjId,
      config.logToConsole,
      config.sendPlayersFailureMessages
    )) {
    if (config.sendPlayersFailureMessages) {
      killer.sendMessage(`[PvP Debug][${name}] killer score filter- §cFAIL`);
    }


      log(`[PvP Debug][${name}] killer required score filter- FAIL`);
      continue;
    }

    const dObjId = `PvP_DeathScore:${name}`;
    createScoreboardIfNotExists(dObjId, dObjId);
    if (!checkScoreFilter(
      deadEntity,
      config.deathScoreFilter,
      dObjId,
      config.logToConsole,
      config.sendPlayersFailureMessages,
      killer
    )) {
     if (config.sendPlayersFailureMessages) {
      killer.sendMessage(`[PvP Debug][${name}] victim required score filter- §cFAIL`);
    } 
      log(`[PvP Debug][${name}] death score filter FAIL`);
      continue;
    }

//Kill location filter

if (config.killLocationEnabled) {
  // 2) bail out if no position
  if (!pos) {
    if (config.sendPlayersFailureMessages) {
      deadEntity.sendMessage(
        `[Death-Debug:${name}] no position data on ${deadEntity.typeId}`
      );
    }
    continue; // skip this death
  }

  const { x, y, z } = pos;
  const locCfg = config.killLocation; // { x:{…}, y:{…}, z:{…} }

  // 3) helper to test one axis
  const checkAxis = (coord, cfg) => {
    const { min, max, exclude } = cfg;
    if (exclude) {
      // exclusion: fail if coord is inside exclude range
      return !(coord >= exclude.min && coord <= exclude.max);
    } else {
      // inclusion: fail if coord is outside [min..max]
      return coord >= min && coord <= max;
    }
  };

  const passX = checkAxis(x, locCfg.x);
  const passY = checkAxis(y, locCfg.y);
  const passZ = checkAxis(z, locCfg.z);

  // 4) helper to format a range string
  const fmtRangeStr = cfg =>
    cfg.exclude
      ? `!${cfg.exclude.min ?? ""}${cfg.exclude.min != null && cfg.exclude.max != null ? ".." : ""}${cfg.exclude.max ?? ""}`
      : (cfg.min === cfg.max
          ? `${cfg.min}`
          : `${cfg.min}..${cfg.max}`);

  // build “allowed” summary
  const allowed = [
    fmtRangeStr(locCfg.x),
    fmtRangeStr(locCfg.y),
    fmtRangeStr(locCfg.z),
  ].join(", ");

  // 5) skip if any axis fails
  if (!passX || !passY || !passZ) {
    if (config.sendPlayersFailureMessages) {
      killer.sendMessage(
        `[PvP-Debug:${name}] PvPKill Location FAIL at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}); allowed [${allowed}]`
      );
    }
    log(`[PvP-Debug:${name}] PvPKill Location FAIL at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}); allowed [${allowed}]`);
    continue; // don’t count this death
  }

  // 6) optional “pass” debug
  if (config.sendPlayersFailureMessages) {
    killer.sendMessage(
      `[PvP-Debug:${name}] PvPKill Location PASS at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}); allowed [${allowed}]`
    );
    
  }
  log (`[Pvp-Debug:${name}] PvPKill Location PASS at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}); allowed [${allowed}]`);
}



//------------------ALL FILTERS PASS-----------------------





// ——— Run killerCommand if it’s set ———
if (config.killerCommand?.trim()) {
  // replace placeholders if you want:
  const cmd = config.killerCommand
    .replace('{killer}', killer.name)
    .replace('{victim}', deadEntity.name);
  killer.runCommand(cmd);
}

// ——— Run victimCommand if it’s set ———
if (config.victimCommand?.trim()) {
  const cmd = config.victimCommand
    .replace('{killer}', killer.name)
    .replace('{victim}', deadEntity.name);
  deadEntity.runCommand(cmd)
}




    // —— Killer increment —— 

    if (config.killerScoreEnabled) {
     let objIds = Array.isArray(config.objectiveName)
     ? config.objectiveName
     : [config.objectiveName];
   let dispNames = Array.isArray(config.displayName)
    ? config.displayName
     : [config.displayName];

    // accumulate killer’s total delta
    
    for (let i = 0; i < objIds.length; i++) {
      const objId = objIds[i];
      const disp  = dispNames[i] || objId;
      createScoreboardIfNotExists(objId, disp);
      const objective = world.scoreboard.getObjective(objId);
      if (!objective) continue;

      const before = objective.getScore(killer);
      applyDeltaSafely(objective, killer, {
        amount:        config.incrementScore.amount,
        mode:          config.incrementScore.mode,
        allowNegative: config.incrementScore.allowNegative
      }, config.sendPlayersFailureMessages, killer);

      const after = objective.getScore(killer);

      killerDelta += (after - before);
      const verb = config.incrementScore.mode === "add" ? "added" : "removed";
      log(`[PvP Debug][${name}] [Applied Score] Killer: ${killer.name}'s ${objId} = ${before} and ${killerDelta} was ${verb}. Finial Score = ${after}`)

      if (config.sendPlayersFailureMessages) {
      killer.sendMessage(`[PvP Debug][${name}] [Applied Score] Killer: ${killer.name}'s ${objId} = ${before} and ${killerDelta} was ${verb}. Finial Score = ${after}`)
    }
    }
  }
  
  if (!config.killerScoreEnabled && config.sendPlayersFailureMessages) {
    killer.sendMessage (`[Pvp Debug] Killer Score Incriment Is Toggled False - No Score`)
  } 
    

    // —— Victim increment —— 
    let vIds = [], vNames = [];
    if (config.victimScore?.victimScoreEnabled) {
      const {
        victimScoreObjective,
        victimScoreDisplayName,
        victimScoreIncriment,
        victimScoreAllowNegative,
        victimScoreAmount
      } = config.victimScore;

      vIds   = Array.isArray(victimScoreObjective)        ? victimScoreObjective        : [victimScoreObjective];
      vNames = Array.isArray(victimScoreDisplayName)      ? victimScoreDisplayName      : [victimScoreDisplayName || victimScoreObjective];

      for (let i = 0; i < vIds.length; i++) {
        const id = vIds[i];
        const d  = vNames[i] || id;
        createScoreboardIfNotExists(id, d);
        const vObj = world.scoreboard.getObjective(id);
        if (!vObj) continue;

        const beforeV = vObj.getScore(deadEntity);
        applyDeltaSafely(vObj, deadEntity, {
          amount:        victimScoreAmount,
          mode:          victimScoreIncriment,
          allowNegative: victimScoreAllowNegative
        });
        const afterV = vObj.getScore(deadEntity);
        victimDelta += (afterV - beforeV);
        const verbV = config.victimScore.victimScoreIncriment === "add" ? "added" : "removed";

        log(`[PvP Debug][${name}] [Applied Score] Victim: ${deadEntity.name}'s ${id} = ${beforeV} and ${victimDelta} was ${verbV}. Finial Score = ${afterV}`);
        if (config.sendPlayersFailureMessages) {
      killer.sendMessage(`[PvP Debug][${name}] [Applied Score] Victim: ${deadEntity.name}'s ${id} = ${beforeV} and ${victimDelta} was ${verbV}. Finial Score = ${afterV}`);
    }
      }
    }

    if (!config.victimScore?.victimScoreEnabled && config.sendPlayersFailureMessages) {
    killer.sendMessage (`[Pvp Debug] Victim Score Incriment Is Toggled False - No Score`)
  }
    
log(
  `PvP ActionBar → killerDelta=${killerDelta}, ` +
  `victimDelta=${victimDelta}, ` +
  `vIds=${JSON.stringify(vIds)}, vNames=${JSON.stringify(vNames)}`
);

if (config.sendPlayersFailureMessages) {
  killer.sendMessage(
  `§aFull Pass§r killer: ${killer.name}, victim=${deadEntity.name}`
   );
    }

//Individual Counter Log Toggle
if (config.logToMenu) {
  // killer’s primary objective name
  const killerObjId = Array.isArray(config.objectiveName)
    ? config.objectiveName[0]
    : config.objectiveName;
  const finalK = getScoreSafe(killer, killerObjId);

  // victim’s primary objective name (if enabled)
  let finalV;
  if (config.victimScore?.victimScoreEnabled) {
    const victimObjId = Array.isArray(config.victimScore.victimScoreObjective)
      ? config.victimScore.victimScoreObjective[0]
      : config.victimScore.victimScoreObjective;
    finalV = getScoreSafe(deadEntity, victimObjId);
  }
  addLog(`§6[PVPCounter: ${name}]§r ${killer.name} killed ${deadEntity.name} at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) and Killer Score = ${finalK}  Victim Score = ${finalV}`);
}

if (config.sendDeathCoords) {
  

  deadEntity.sendMessage(`§c§lLast Death Position:§r (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`)
}



if (config.teleportVictim) {
 
  lastDeathPositions.set(deadEntity.name, {
    x: pos.x,
    y: pos.y,
    z: pos.z
  });
}

// —— Action bar —───────────────────────────────────────────────────────────
if (config.actionBarEnabled) {
 if (config.actionBarEnabled && config.victimScore?.victimScoreEnabled) {
  const killerMode = config.incrementScore.mode;
  const victimMode = config.victimScore.victimScoreIncriment;

  showPvPActionBar(
    killer,
    objIds,
    dispNames,
    killerDelta,
    killerMode,

    deadEntity,
    vIds,
    vNames,
    victimDelta,
    victimMode,

    config.actionBarFormatCode
  );
} else {
    // only killer
    showSingleActionBar(
      killer,
      objIds,                         // killer objective IDs
      dispNames,                      // killer display names
      killerDelta,                    // killer delta
      config.incrementScore.mode,     // killer mode
      config.actionBarFormatCode      // format code
    );
  }
}




  }
  
//---------------------Global PVP Log Toggle--------------------------------
  const { logPvP } = loadLogConfigs();
  if (logPvP) {
    const victimName = deadEntity.nameTag || deadEntity.typeId;
    addLog(`§6[PVP-LOG]§r ${killer.name} killed ${victimName}`);
  }
//---------------------------------------------------------------------
});

