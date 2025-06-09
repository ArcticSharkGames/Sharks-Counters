import { world } from "@minecraft/server";
import { ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { addLog } from "./logManager";
import { adminMainMenu,
    parseRangeInput,
    createScoreboardIfNotExists,
    showSettingsMenu,
    randomInRange,
    checkScoreFilter,
    getScoreSafe,
    showSingleActionBar,
    applyDeltaSafely,
    lastExploderBy,
    manageAllCountersMenu,
    lastDeathPositions } from "./main";


///--------------- GENERAL DEATHS COUNTER MEMORY AND CONFIGS ----------------
const DEATHS_PREFIX = "deathsCounter:";

export const defaultDeathCounterConfig = {
  enabled: true,
  actionBarEnabled: true,
  actionBarFormatCode: "r",
  objectiveName: [],
  displayName: [],
  logToMenu: false,
  logToConsole: false,
  sendPlayersMessages: true,
  sendPlayersFailureMessages: false,
  incrementScore: {
    amount: { min: 1, max: 1 },
    mode: "add",
    allowNegative: false,
  },
  deadEntity: [],
  killerTagFilter: [],
  killerTypeFilter:[],
  killerFamilyFilter:[],
  killerScoreFilter: { objective: "none", min: 1, max: 1 },
  itemType:[],
  deathTagFilter: [],
  deathScoreFilter: { objective: "none", min: 1, max: 1 },
  onlyPlayerKill: false,
  killLocation: { 
    x: { min: -100, max: 100 },
    y: { min: -100, max: 100 },
    z: { min: -100, max: 100 },
  },
  killLocationEnabled: false,
  victimCommand: "",
  sendDeathCoords: false,
  teleportVictim: false,
  causeFilter: [],
  dimensionFilter: ["overworld", "nether", "the_end"],
  displayType: ["none"],
};

export let deathCounters = {};

/**
 * Save a single death-counter config to a dynamic property
 */
export function saveDeathCounter(counterName, config) {
  try {
    const raw = JSON.stringify(config);
    world.setDynamicProperty(DEATHS_PREFIX + counterName, raw);
    deathCounters[counterName] = config;
  } catch (e) {
    console.error(`[Save] Failed to save Death Counter '${counterName}':`, e);
  }
}

/**
 * Load all death-counter configs from dynamic properties into memory
 */
export function loadDeathCounters() {
  try {
    const allKeys = world.getDynamicPropertyIds();
    for (const key of allKeys) {
      if (!key.startsWith(DEATHS_PREFIX)) continue;
      const counterName = key.slice(DEATHS_PREFIX.length);
      const raw = world.getDynamicProperty(key);
      try {

        const parsed = JSON.parse(raw);
        const defaultLoc = defaultDeathCounterConfig.killLocation;
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
            ?? defaultDeathCounterConfig.killLocationEnabled;

        const incrementScore = {
          ...defaultDeathCounterConfig.incrementScore,
          ...parsed.incrementScore,
          allowNegative:
            parsed.incrementScore?.allowNegative ??
            defaultDeathCounterConfig.incrementScore.allowNegative,
        };

        const killerScoreFilter = {
          ...defaultDeathCounterConfig.killerScoreFilter,
          ...parsed.killerScoreFilter,
        };
        const killerTypeFilter = Array.isArray(parsed.killerTypeFilter)
          ? parsed.killerTypeFilter
          : defaultDeathCounterConfig.killerTypeFilter;
        const killerFamilyFilter = Array.isArray(parsed.killerFamilyFilter)
          ? parsed.killerFamilyFilter
          : defaultDeathCounterConfig.killerFamilyFilter;
        const killerTagFilter = Array.isArray(parsed.killerTagFilter)
                  ? parsed.killerTagFilter
                  : defaultDeathCounterConfig.killerTagFilter;

        const deathScoreFilter = {
          ...defaultDeathCounterConfig.deathScoreFilter,
          ...parsed.deathScoreFilter,
        };

        const itemType = Array.isArray(parsed.itemType)
                  ? parsed.itemType
                  : defaultDeathCounterConfig.itemType;

        const actionBarEnabled =
          parsed.actionBarEnabled ??
          defaultDeathCounterConfig.actionBarEnabled;
        const logToMenu =
          parsed.logToMenu ?? defaultDeathCounterConfig.logToMenu;
        const logToConsole =
          parsed.logToConsole ?? defaultDeathCounterConfig.logToConsole;
        const sendPlayersMessages =
          parsed.sendPlayersMessages ??
          defaultDeathCounterConfig.sendPlayersMessages;
        const sendPlayersFailureMessages =
          parsed.sendPlayersFailureMessages ??
          defaultDeathCounterConfig.sendPlayersFailureMessages;
        const actionBarFormatCode =
          parsed.actionBarFormatCode ?? defaultDeathCounterConfig.actionBarFormatCode;
        const victimCommand = parsed.victimCommand ?? defaultDeathCounterConfig.victimCommand;
        const sendDeathCoords = parsed.sendDeathCoords ?? defaultDeathCounterConfig.sendDeathCoords;
        const teleportVictim = parsed.teleportVictim ?? defaultDeathCounterConfig.teleportVictim;
        const causeFilter = Array.isArray(parsed.causeFilter)
          ? parsed.causeFilter
          : defaultDeathCounterConfig.causeFilter;
        const dimensionFilter = Array.isArray(parsed.dimensionFilter)
                  ? parsed.dimensionFilter
                  : defaultDeathCounterConfig.dimensionFilter;

        deathCounters[counterName] = {
          ...defaultDeathCounterConfig,
          ...parsed,
          killLocationEnabled,
          killLocation,
          incrementScore,
          killerScoreFilter,
          killerFamilyFilter,
          killerTagFilter,
          killerTypeFilter,
          deathScoreFilter,
          itemType,
          actionBarEnabled,
          logToMenu,
          logToConsole,
          sendPlayersMessages,
          sendPlayersFailureMessages,
          actionBarFormatCode,
          victimCommand,
          sendDeathCoords,
          teleportVictim,
          causeFilter,
          dimensionFilter,
          type: "death"
          
        };
      } catch {
        console.warn(
          `[Load] Failed to parse Death Counter config for '${counterName}'`
        );
      }
    }
  } catch (e) {
    console.error("[Load] Failed to load Death counters:", e);
  }
}

/**
 * Delete a death-counter both from dynamic properties and memory
 */
export function deleteDeathCounter(counterName) {
  try {
    world.setDynamicProperty(DEATHS_PREFIX + counterName, undefined);
    delete deathCounters[counterName];
  } catch (e) {
    console.error(
      `[Delete] Failed to delete Death Counter '${counterName}':`,
      e
    );
  }
}

//---------------Show Death Cause Form--------------------------

export function showConfigureDeathCauseFilterForm(player, name) {
  loadDeathCounters();
  // get existing filters or default
  const rawConfig     = deathCounters[name] || {};
  const existing      = Array.isArray(rawConfig.causeFilter)
                        ? rawConfig.causeFilter
                        : defaultDeathCounterConfig.causeFilter;

  // full list of EntityDamageCause values in 1.19.0
  const allCauses = [
    "anvil","blockExplosion","campfire","charging","contact",
    "drowning","entityAttack","entityExplosion","fall","fallingBlock",
    "fire","fireTick","fireworks","flyIntoWall","freezing","lava",
    "lightning","maceSmash","magic","magma","none","override","piston",
    "projectile","ramAttack","selfDestruct","sonicBoom","soulCampfire",
    "stalactite","stalagmite","starve","suffocation","temperature",
    "thorns","void","wither"
  ];

  // prepare ModalFormData with one toggle per cause
  const form = new ModalFormData()
    .title(`Filter Death Causes: ${name}`);

  // determine initial toggle state for each cause
  allCauses.forEach(cause => {
    const initial = !existing.includes("!" + cause);
    form.toggle(cause, initial);
  });

  form.show(player).then(response => {
    // Cancel → back to main menu
    if (response.canceled) {
      manageAllCountersMenu(player);
      return;
    }

    // Build new causeFilter array
    const newFilter = [];
    response.formValues.forEach((checked, idx) => {
      const cause = allCauses[idx];
      newFilter.push( checked ? cause : `!${cause}` );
    });

    // Persist it
    deathCounters[name].causeFilter = newFilter;
    // assume you have a save function like saveDeathCounters():
    saveDeathCounter(name, deathCounters[name]);

    // Re-open the regular configure form
    showConfigureDeathCounterForm(player, name);
  });
}




///-------------Show Add/edit Kill Counter Form------------------

export function showConfigureDeathCounterForm(player, name) {
    loadDeathCounters();
    const rawConfig    = deathCounters[name] || {};
    const filterArr    = Array.isArray(rawConfig.causeFilter)
                    ? rawConfig.causeFilter
                    : defaultDeathCounterConfig.causeFilter;
    const includedCauses = filterArr.filter(c => !c.startsWith("!"));
    const existingCauses = Array.isArray(rawConfig.causeFilter)
    ? rawConfig.causeFilter
    : defaultDeathCounterConfig.causeFilter;
    const config = {
      ...defaultDeathCounterConfig,
      ...rawConfig,
      incrementScore: {
        ...defaultDeathCounterConfig.incrementScore,
        ...rawConfig.incrementScore,
      },
      killerScoreFilter: {
        ...defaultDeathCounterConfig.killerScoreFilter,
        ...rawConfig.killerScoreFilter,
      },
      deathScoreFilter: {
        ...defaultDeathCounterConfig.deathScoreFilter,
        ...rawConfig.deathScoreFilter,
      },
    };
  
    // allow “!” exclusions and range syntax
    const sanitizeList = (raw, allowSpaces = false) =>
      raw
        ?.split(",")
        .map(s => s.trim())
        .map(s => {
          const isNeg = !allowSpaces && s.startsWith("!");
          const core = isNeg ? s.slice(1) : s;
          const cleaned = allowSpaces ? core : core.replace(/[^a-zA-Z0-9_:!]/g, "");
          return isNeg ? `!${cleaned}` : cleaned;
        })
        .filter(Boolean) || [];
    const filterNone = list => list.filter(e => e.toLowerCase() !== "none");
    const formatRange = r =>
      r.exclude
        ? `!${r.exclude.min ?? ""}${r.exclude.min != null && r.exclude.max != null ? ".." : ""}${r.exclude.max ?? ""}`
        : `${r.min ?? ""}${r.min != null && r.max != null ? ".." : ""}${r.max ?? ""}`;
  
    const initial = {
      objectiveName: Array.isArray(config.objectiveName)
        ? config.objectiveName.join(", ")
        : config.objectiveName || "",
      displayName: Array.isArray(config.displayName)
        ? config.displayName.join(", ")
        : config.displayName || "",
      incrementAmount:
        config.incrementScore.amount.min === config.incrementScore.amount.max
          ? String(config.incrementScore.amount.min)
          : `${config.incrementScore.amount.min}..${config.incrementScore.amount.max}`,
      removeMode: config.incrementScore.mode === "remove",
      allowNegative: Boolean(config.incrementScore.allowNegative),
      victimTags: Array.isArray(config.deathTagFilter)
        ? config.deathTagFilter.join(", ")
        : "",
      victimScoreObj: Array.isArray(config.deathScoreFilter.objective)
        ? config.deathScoreFilter.objective.join(", ")
        : "",
      victimScoreRange: formatRange(config.deathScoreFilter),
      onlyPlayerKill: Boolean(config.onlyPlayerKill),
      killerScoreObj: Array.isArray(config.killerScoreFilter.objective)
        ? config.killerScoreFilter.objective.join(", ")
        : "",
      killerScoreRange: formatRange(config.killerScoreFilter),

      killerTagFilter: Array.isArray(config.killerTagFilter)
        ? config.killerTagFilter.join(", ")
        : "",
      killerFamilyFilter: Array.isArray(config.killerFamilyFilter)
        ? config.killerFamilyFilter.join(", ")
        : "",
      killerTypeFilter: Array.isArray(config.killerTypeFilter)
        ? config.killerTypeFilter.join(", ")
        : "",
      itemType: Array.isArray(config.itemType)
      ? config.itemType.join(", ")
      : "",
      killLocationEnabled: Boolean(config.killLocationEnabled),
      killLocation:
      `${config.killLocation.x.min}..${config.killLocation.x.max},` +
      `${config.killLocation.y.min}..${config.killLocation.y.max},` +
      `${config.killLocation.z.min}..${config.killLocation.z.max}`,
      victimCommand: String(config.victimCommand ?? ""),
      logToConsole: config.logToConsole,
      sendPlayersMessages: config.sendPlayersMessages,
      sendPlayersFailureMessages: config.sendPlayersFailureMessages,
      logToMenu: config.logToMenu,
      actionBarEnabled: Boolean(config.actionBarEnabled),
      actionBarFormatCode: String(config.actionBarFormatCode ?? "r"),
      sendDeathCoords: Boolean(config.sendDeathCoords),
      teleportVictim: Boolean(config.teleportVictim),
    };
 
//------------------------ Menu With No Killer Filters (entityAttack is disabled)-------------------

if (!includedCauses.includes("entityAttack")) {

    const form = new ModalFormData()
      .title(`Configure Death Counter: ${name}`)
      .toggle("Counter Enabled", config.enabled)
      .toggle("Action Bar Enabled", initial.actionBarEnabled)
      .textField("Action Bar Format Code", "a–u or 0–9", initial.actionBarFormatCode)
      .textField("Victim Score Objective(s)", "e.g. red_team", initial.objectiveName)
      .textField("Victim Score Display Name(s)","e.g. Deaths", initial.displayName)
      .textField("Victim Score Increment Amount", "(e.g. 1 or 1..5)", initial.incrementAmount)
      .dropdown("Victim Score Mode", ["Add Score", "Remove Score"], initial.removeMode ? 1 : 0)
      .toggle("Allow Negative Numbers", initial.allowNegative)
      .textField('Execute Command as Victim (e.g /clear @s diamond 0 1)', '', initial.victimCommand)
      .textField("Victim Required Tags","e.g. boss,!protected",initial.victimTags)
      .textField("Victim Required Score Objective(s)", "e.g. red_team", initial.victimScoreObj)
      .textField("Victim Required Score Range", "e.g. 1, 1..10, !1, 1.., ..10", initial.victimScoreRange)
      .toggle("Death Location Enabled", initial.killLocationEnabled)
      .textField("Death Location (x, y, z) or a range (x..x, y..y, z..z)", "e.g. -100..100,-100..100,-100..100", initial.killLocation)
      .toggle("Debug Log To Console", initial.logToConsole)
      .toggle("Send Players Messages", initial.sendPlayersMessages)
      .toggle("Send Players Debug Messages", initial.sendPlayersFailureMessages)
      .toggle("Log To Menu\n(not recommended in most cases)", initial.logToMenu)
      .toggle('Send Victim Last Death Coords', initial.sendDeathCoords)
      .toggle('Teleport Victim To Last Death Coords', initial.teleportVictim);
  
    form.show(player).then(response => {
      if (response.canceled) return;
  
      const [
        enabled,
        actionBarEnabled,
        actionBarFormatCodeRaw,
        objectiveRaw,
        displayRaw,
        incrementRaw,
        scoreModeIndex,
        allowNegRaw,
        victimCommandRaw,
        victimTagsRaw,
        victimScoreObjRaw,
        victimScoreRangeRaw,
        killLocationEnabledRaw,
        killLocationRaw,
        logRaw,
        sendMsgRaw,
        sendMsgFailureRaw,
        menuLogRaw,
        sendDeathCoordsToggle,
        teleportVictimToggle
      ] = response.formValues;
  

      const rawCode = String(actionBarFormatCodeRaw).trim();
      const actionBarFormatCode = /^[a-u0-9]$/.test(rawCode)
            ? rawCode
            : defaultDeathCounterConfig.actionBarFormatCode;
      const objectiveArr =
        objectiveRaw.trim()
          ? filterNone(sanitizeList(objectiveRaw))
          : defaultDeathCounterConfig.objectiveName;
      const displayArr =
        displayRaw.trim()
          ? sanitizeList(displayRaw, true)
          : defaultDeathCounterConfig.displayName;
      const incrementAmt =
        incrementRaw.trim()
          ? parseRangeInput(incrementRaw.trim())
          : defaultDeathCounterConfig.incrementScore.amount;
      const mode = scoreModeIndex === 1 ? "remove" : "add";
      const allowNeg = Boolean(allowNegRaw);
      const victimCommand = String(victimCommandRaw).trim();
      const deathTags =
        victimTagsRaw.trim()
          ? sanitizeList(victimTagsRaw)
          : defaultDeathCounterConfig.deathTagFilter;
      const victimObjs =
        victimScoreObjRaw.trim()
          ? filterNone(sanitizeList(victimScoreObjRaw))
          : defaultDeathCounterConfig.deathScoreFilter.objective;
      const victimScore = parseRangeInput(victimScoreRangeRaw);
      const deathFilter = {
        objective: victimObjs,
        min: victimScore.min,
        max: victimScore.max,
        exclude: victimScore.exclude,
      };
      const killLocationEnabled = Boolean(killLocationEnabledRaw);
      const [xRaw = "", yRaw = "", zRaw = ""] =
      String(killLocationRaw).split(/\s*,\s*/);

      // parseRangeInput for each (falls back to defaults if empty)
      const locX = xRaw.trim()
      ? parseRangeInput(xRaw.trim())
      : defaultDeathCounterConfig.killLocation.x;
      const locY = yRaw.trim()
      ? parseRangeInput(yRaw.trim())
       : defaultDeathCounterConfig.killLocation.y;
      const locZ = zRaw.trim()
      ? parseRangeInput(zRaw.trim())
      : defaultDeathCounterConfig.killLocation.z;
      const killLocation = { x: locX, y: locY, z: locZ };

      const logToConsole = Boolean(logRaw);
      const sendPlayers = Boolean(sendMsgRaw);
      const sendPlayersFailure = Boolean(sendMsgFailureRaw);
      const logToMenu = Boolean(menuLogRaw);
      const sendDeathCoords = Boolean(sendDeathCoordsToggle);
      const teleportVictim = Boolean(teleportVictimToggle);
  
      const configToSave = {
        enabled,
        actionBarEnabled,
        actionBarFormatCode,
        objectiveName: objectiveArr,
        displayName: displayArr,
        incrementScore: { amount: incrementAmt, mode, allowNegative: allowNeg },
        victimCommand,
        killerTagFilter: defaultDeathCounterConfig.killerTagFilter,
        killerScoreFilter: defaultDeathCounterConfig.killerScoreFilter,
        deathTagFilter: deathTags,
        deathScoreFilter: deathFilter,
        victimEntityType: defaultDeathCounterConfig.victimEntityType,
        victimEntityFamily: defaultDeathCounterConfig.victimEntityFamily,
        killLocationEnabled,
        killLocation,
        logToConsole,
        sendPlayersMessages: sendPlayers,
        sendPlayersFailureMessages: sendPlayersFailure,
        logToMenu,
        sendDeathCoords,
        teleportVictim,
        causeFilter: existingCauses,
        dimensionFilter: config.dimensionFilter || defaultDeathCounterConfig.dimensionFilter,
        type: "death",
      };
  
      // confirmation
      const df = v =>
        Array.isArray(v) && v.length ? v.join(", ") : "None";
      const inc = configToSave.incrementScore.amount;
      const incDisplay = inc.min === inc.max ? `${inc.min}` : `${inc.min}..${inc.max}`;
      const fmt = formatRange
      const confirm = new MessageFormData()
        .title("Confirm Death Counter Setup")
        .body(
          `Name: ${name}\n` +
            `Counter Enabled: ${configToSave.enabled}\n` +
            `Action Bar Enabled: ${configToSave.actionBarEnabled}\n` +
            `Action Bar Format Code: ${configToSave.actionBarFormatCode}\n` +
            `Victim Score Objective(s): ${df(configToSave.objectiveName)}\n` +
            `Victim Score Display Name(s): ${df(configToSave.displayName)}\n` +
            `Victim Score Increment: ${incDisplay} (${configToSave.incrementScore.mode})\n` +
            `Add Score: ${mode !== "remove"}\n` +
            `Remove Score: ${mode === "remove"}\n` +
            `Allow Negative Numbers: ${configToSave.incrementScore.allowNegative}\n` +
            `Victim Command: ${victimCommand || "None"}\n` +
            `Victim Required Tags: ${df(configToSave.deathTagFilter)}\n` +
            `Victim Required Score Obj: ${df(configToSave.deathScoreFilter.objective)}\n` +
            `Victim Required Score Range: ${formatRange(configToSave.deathScoreFilter)}\n` +
            `Death Location Enabled: ${configToSave.killLocationEnabled}\n` +
            `Death Location: ${fmt(configToSave.killLocation.x)}, ${fmt(configToSave.killLocation.y)}, ${fmt(configToSave.killLocation.z)}\n` +
            `Debug Log To Console: ${configToSave.logToConsole}\n` +
            `Send Players Messages: ${configToSave.sendPlayersMessages}\n` +
            `Send Players Debug Messages: ${configToSave.sendPlayersFailureMessages}\n` +
            `Log To Menu: ${configToSave.logToMenu}` +
            `Send Victim Death Coords: ${configToSave.sendDeathCoords}\n` +
            `Teleport Victim To Death Coords: ${configToSave.teleportVictim}\n`
        )
        .button1("Confirm")
        .button2("Edit");
  
      confirm.show(player).then(result => {
        if (result.canceled || result.selection === 1) {
          showConfigureDeathCounterForm(player, name);
          return;
        }
        saveDeathCounter(name, configToSave);
        player.sendMessage(`Death Counter '${name}' saved.`);
        addLog(
          `§a[Add/Edit]§r ${player.name} Managed A Death Counter named ${name}`
        
        );
        manageAllCountersMenu(player);
      });
    });
  }


  //---------------------- FULL MENU -----------------------------------------------
  else {
    const form = new ModalFormData()
      .title(`Configure Death Counter: ${name}`)
      .toggle("Counter Enabled", config.enabled)
      .toggle("Action Bar Enabled", initial.actionBarEnabled)
      .textField("Action Bar Format Code", "a–u or 0–9", initial.actionBarFormatCode)
      .textField("Victim Score Objective(s)", "e.g. red_team", initial.objectiveName)
      .textField("Victim Score Display Name(s)","e.g. Deaths", initial.displayName)
      .textField("Victim Score Increment Amount", "(e.g. 1 or 1..5)", initial.incrementAmount)
      .dropdown("Victim Score Mode", ["Add Score", "Remove Score"], initial.removeMode ? 1 : 0)
      .toggle("Allow Negative Numbers", initial.allowNegative)
      .textField('Execute Command as Victim (e.g /clear @s diamond 0 1)', '', initial.victimCommand)
      .textField("Victim Required Tags","e.g. boss,!protected",initial.victimTags)
      .textField("Victim Required Score Objective(s)", "e.g. red_team", initial.victimScoreObj)
      .textField("Victim Required Score Range", "e.g. 1, 1..10, !1, 1.., ..10", initial.victimScoreRange)
      .toggle("Require Killer To Be Player", initial.onlyPlayerKill)
      .textField("Killer Entity Family","e.g. monster,!undead", initial.killerFamilyFilter)
      .textField("Killer Entity Type", "minecraft:creeper,!minecraft:zombie", initial.killerTypeFilter)
      .textField("Killer Required Tags", "deathsEnabled,!noMonsters", initial.killerTagFilter)
      .textField("Killer Required Score Objectives","e.g. blue_team", initial.killerScoreObj)
      .textField("Killer Required Score Range", "e.g. 1, 1..10, !1, 1.., ..10", initial.killerScoreRange )
      .textField("Item Type Filter", "e.g. minecraft:diamond_axe,!minecraft:netherite_axe", initial.itemType)
      .toggle("Death Location Enabled", initial.killLocationEnabled)
      .textField("Death Location (x, y, z) or a range (x..x, y..y, z..z)", "e.g. -100..100,-100..100,-100..100", initial.killLocation)
      .toggle("Debug Log To Console", initial.logToConsole)
      .toggle("Send Players Messages", initial.sendPlayersMessages)
      .toggle("Send Players Debug Messages", initial.sendPlayersFailureMessages)
      .toggle("Log To Menu\n(not recommended in most cases)", initial.logToMenu)
      .toggle('Send Victim Last Death Coords', initial.sendDeathCoords)
      .toggle('Teleport Victim To Last Death Coords', initial.teleportVictim);
  
    form.show(player).then(response => {
      if (response.canceled) return;
  
      const [
        enabled,
        actionBarEnabled,
        actionBarFormatCodeRaw,
        objectiveRaw,
        displayRaw,
        incrementRaw,
        scoreModeIndex,
        allowNegRaw,
        victimCommandRaw,
        victimTagsRaw,
        victimScoreObjRaw,
        victimScoreRangeRaw,
        onlyPlayerKillRaw,
        killerFamilyFilterRaw,
        killerTypeFilterRaw,
        killerTagFilterRaw,
        KillerScoreObjRaw,
        killerScoreRangeRaw,
        itemTypeRaw,
        killLocationEnabledRaw,
        killLocationRaw,
        logRaw,
        sendMsgRaw,
        sendMsgFailureRaw,
        menuLogRaw,
        sendDeathCoordsToggle,
        teleportVictimToggle
      ] = response.formValues;
  

      const rawCode = String(actionBarFormatCodeRaw).trim();
      const actionBarFormatCode = /^[a-u0-9]$/.test(rawCode)
            ? rawCode
            : defaultDeathCounterConfig.actionBarFormatCode;
      const objectiveArr =
        objectiveRaw.trim()
          ? filterNone(sanitizeList(objectiveRaw))
          : defaultDeathCounterConfig.objectiveName;
      const displayArr =
        displayRaw.trim()
          ? sanitizeList(displayRaw, true)
          : defaultDeathCounterConfig.displayName;
      const incrementAmt =
        incrementRaw.trim()
          ? parseRangeInput(incrementRaw.trim())
          : defaultDeathCounterConfig.incrementScore.amount;
      const mode = scoreModeIndex === 1 ? "remove" : "add";
      const allowNeg = Boolean(allowNegRaw);
      const victimCommand = String(victimCommandRaw).trim();
      const deathTags =
        victimTagsRaw.trim()
          ? sanitizeList(victimTagsRaw)
          : defaultDeathCounterConfig.deathTagFilter;
      const victimObjs =
        victimScoreObjRaw.trim()
          ? filterNone(sanitizeList(victimScoreObjRaw))
          : defaultDeathCounterConfig.deathScoreFilter.objective;
      const victimScore = parseRangeInput(victimScoreRangeRaw);
      const deathFilter = {
        objective: victimObjs,
        min: victimScore.min,
        max: victimScore.max,
        exclude: victimScore.exclude,
      };
      const onlyPlayer = Boolean(onlyPlayerKillRaw);
      const killerFamilyFilter =
        killerFamilyFilterRaw.trim()
          ? sanitizeList(killerFamilyFilterRaw)
          : defaultDeathCounterConfig.killerFamilyFilter;
      const killerTypeFilter =
        killerTypeFilterRaw.trim()
          ? sanitizeList(killerTypeFilterRaw)
          : defaultDeathCounterConfig.killerTypeFilter;
      const killerTagFilter =
        killerTagFilterRaw.trim()
          ? sanitizeList(killerTagFilterRaw)
          : defaultDeathCounterConfig.killerTagFilter;
      const killerScoreObj =
        KillerScoreObjRaw.trim()
          ? sanitizeList(KillerScoreObjRaw)
          : defaultDeathCounterConfig.KillerScoreObjRaw;
      const killerScoreRange =
        killerScoreRangeRaw.trim()
          ? sanitizeList(killerScoreRangeRaw)
          : defaultDeathCounterConfig.killerScoreRangeRaw;
    
      const itemTypeArr = itemTypeRaw.trim()
            ? filterNone(sanitizeList(itemTypeRaw))
            : defaultDeathCounterConfig.itemType;
      const killLocationEnabled = Boolean(killLocationEnabledRaw);
      const [xRaw = "", yRaw = "", zRaw = ""] =
      String(killLocationRaw).split(/\s*,\s*/);

      // parseRangeInput for each (falls back to defaults if empty)
      const locX = xRaw.trim()
      ? parseRangeInput(xRaw.trim())
      : defaultDeathCounterConfig.killLocation.x;
      const locY = yRaw.trim()
      ? parseRangeInput(yRaw.trim())
       : defaultDeathCounterConfig.killLocation.y;
      const locZ = zRaw.trim()
      ? parseRangeInput(zRaw.trim())
      : defaultDeathCounterConfig.killLocation.z;
      const killLocation = { x: locX, y: locY, z: locZ };

      const logToConsole = Boolean(logRaw);
      const sendPlayers = Boolean(sendMsgRaw);
      const sendPlayersFailure = Boolean(sendMsgFailureRaw);
      const logToMenu = Boolean(menuLogRaw);
      const sendDeathCoords = Boolean(sendDeathCoordsToggle);
      const teleportVictim = Boolean(teleportVictimToggle);
  
      const configToSave = {
        enabled,
        actionBarEnabled,
        actionBarFormatCode,
        objectiveName: objectiveArr,
        displayName: displayArr,
        incrementScore: { amount: incrementAmt, mode, allowNegative: allowNeg },
        victimCommand,
        killerTagFilter: defaultDeathCounterConfig.killerTagFilter,
        killerScoreFilter: defaultDeathCounterConfig.killerScoreFilter,
        deathTagFilter: deathTags,
        deathScoreFilter: deathFilter,
        victimEntityType: defaultDeathCounterConfig.victimEntityType,
        victimEntityFamily: defaultDeathCounterConfig.victimEntityFamily,
        onlyPlayerKill: onlyPlayer,
        killerFamilyFilter,
        killerTypeFilter,
        killerTagFilter,
        killerScoreObj,
        killerScoreRange,
        itemType: itemTypeArr,
        killLocationEnabled,
        killLocation,
        logToConsole,
        sendPlayersMessages: sendPlayers,
        sendPlayersFailureMessages: sendPlayersFailure,
        logToMenu,
        sendDeathCoords,
        teleportVictim,
        causeFilter: existingCauses,
        dimensionFilter: config.dimensionFilter || defaultDeathCounterConfig.dimensionFilter,
        type: "death",
      };
  
      // confirmation
      const df = v =>
        Array.isArray(v) && v.length ? v.join(", ") : "None";
      const inc = configToSave.incrementScore.amount;
      const incDisplay = inc.min === inc.max ? `${inc.min}` : `${inc.min}..${inc.max}`;
      const fmt = formatRange
      const confirm = new MessageFormData()
        .title("Confirm Death Counter Setup")
        .body(
          `Name: ${name}\n` +
            `Counter Enabled: ${configToSave.enabled}\n` +
            `Action Bar Enabled: ${configToSave.actionBarEnabled}\n` +
            `Action Bar Format Code: ${configToSave.actionBarFormatCode}\n` +
            `Victim Score Objective(s): ${df(configToSave.objectiveName)}\n` +
            `Victim Score Display Name(s): ${df(configToSave.displayName)}\n` +
            `Victim Score Increment: ${incDisplay} (${configToSave.incrementScore.mode})\n` +
            `Add Score: ${mode !== "remove"}\n` +
            `Remove Score: ${mode === "remove"}\n` +
            `Allow Negative Numbers: ${configToSave.incrementScore.allowNegative}\n` +
            `Victim Command: ${victimCommand || "None"}\n` +
            `Victim Required Tags: ${df(configToSave.deathTagFilter)}\n` +
            `Victim Required Score Obj: ${df(configToSave.deathScoreFilter.objective)}\n` +
            `Victim Required Score Range: ${formatRange(configToSave.deathScoreFilter)}\n` +
            `Require Killer To Be Player: ${configToSave.onlyPlayerKill}\n` +
            `Killer Entity Family: ${configToSave.killerFamilyFilter}\n` +
            `Killer Entity Type: ${configToSave.killerTypeFilter}\n` +
            `Killer Required Tags: ${configToSave.killerTagFilter}\n` +
            `Killer Required Score Objectives: ${configToSave.killerScoreObj}\n` +
            `Killer Required Score Range: ${configToSave.killerScoreRange}\n` +
            `Item Type Filter: ${df(configToSave.itemType)}\n` +
            `Death Location Enabled: ${configToSave.killLocationEnabled}\n` +
            `Death Location: ${fmt(configToSave.killLocation.x)}, ${fmt(configToSave.killLocation.y)}, ${fmt(configToSave.killLocation.z)}\n` +
            `Debug Log To Console: ${configToSave.logToConsole}\n` +
            `Send Players Messages: ${configToSave.sendPlayersMessages}\n` +
            `Send Players Debug Messages: ${configToSave.sendPlayersFailureMessages}\n` +
            `Log To Menu: ${configToSave.logToMenu}` +
            `Send Victim Death Coords: ${configToSave.sendDeathCoords}\n` +
            `Teleport Victim To Death Coords: ${configToSave.teleportVictim}\n`
        )
        .button1("Confirm")
        .button2("Edit");
  
      confirm.show(player).then(result => {
        if (result.canceled || result.selection === 1) {
          showConfigureDeathCounterForm(player, name);
          return;
        }
        saveDeathCounter(name, configToSave);
        player.sendMessage(`Death Counter '${name}' saved.`);
        addLog(
          `§a[Add/Edit]§r ${player.name} Managed A Death Counter named ${name}`
        
        );
        manageAllCountersMenu(player);
      });
    });

  }
}
  

//------------------------------------------------------------------------------------

//------------------- Death Counter Logic -------------------

world.afterEvents.entityDie.subscribe(event => {
  const { deadEntity, damageSource } = event;
  let killer =
  damageSource?.damagingEntity ||
  lastExploderBy.get(deadEntity);
 const cause = damageSource?.cause ?? "unknown";
 if (!deadEntity || deadEntity.typeId !== "minecraft:player") return;


  // loop through all death counters
  for (const [name, config] of Object.entries(deathCounters)) {

    //Check If enabled
    let pos;
          if (typeof deadEntity.location === "object") {
            pos = deadEntity.location;
          } else {
          const posComp = deadEntity.getComponent("minecraft:position");
          pos = posComp?.location;
          }
        const { x, y, z } = pos;
    
        if (!config?.enabled) {
     
    if (config.sendPlayersFailureMessages) {
      deadEntity.sendMessage(`§4[Deaths-Debug]§r[${name}] is toggled to disabled - §cStop Processing`)
      
    } continue; }


    
   if (config.sendPlayersFailureMessages) {
    if (killer && killer.typeId === "minecraft:player") {
      killer.sendMessage(`§4[Deaths-Debug]§r[${name}] Warning Further Death-Debug Message Logs Are Sent ONLY to Dead Player`)}
  const flagStatuses = {
    "action bar toggle": config.actionBarEnabled,
    "allow negative numbers": config.incrementScore.allowNegative,
    "require only player kill": config.onlyPlayerKill,
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

  deadEntity.sendMessage(lines.join("\n"));
}


    

    const log = (...args) => {
      if (config.logToConsole) console.log(...args);
    };
    

    if (config.sendPlayersFailureMessages) {
      deadEntity.sendMessage(`§4[Deaths-Debug]§r[${name}] is toggled to enabled - §aStart Processing`)
      if (killer && killer.typeId === "minecraft:player") {
      killer.sendMessage(`§4[Deaths-Debug]§r[${name}] §ais toggled to enabled§r - §cWarning§r Further Debug Message Logs Are Sent ONLY to Dead Player`)}
    }
      log(`[DeathLog][${name}] → Start processing`);

// ── DIMENSION FILTER ──
    // pull the dimension off the deadEntity, not the event
    const dimId = deadEntity.dimension.id.replace("minecraft:", "");
    if (
      Array.isArray(config.dimensionFilter) &&
      config.dimensionFilter.length > 0 &&
      !config.dimensionFilter.includes(dimId)
    ) {
      if (config.sendPlayersFailureMessages) {
        deadEntity.sendMessage(
          `[Death-Debug§r:${name}] DimensionFilter §cFAIL§r you died in ${dimId}, which is disabled`
        );
      }
      // log and skip to next counter
      log(`[DeathCounter:${name}] skipped in ${dimId}`);  
      continue;
    }

//------------------Death Cause Filter ----------------

 const causeFilters = Array.isArray(config.causeFilter) ? config.causeFilter : [];
    // separate excludes ("!lava" → "lava") from includes
    const excludes = causeFilters
      .filter(c => c.startsWith("!"))
      .map(c => c.slice(1));
    const includes = causeFilters.filter(c => !c.startsWith("!"));

    // 1) if it’s in the exclude list, skip
    if (excludes.includes(cause)) {
        if (config.sendPlayersFailureMessages) {
          deadEntity.sendMessage(`[Death-Debug][${name}] CauseFilter §cFAIL§r '${cause}' is excluded`);
        }

      log(`[DeathLog][${name}] skipping '${cause}' (explicitly excluded)`);
      continue;
    }

    // 2) if there *is* an include list, and this cause isn’t in it, skip
    if (includes.length > 0 && !includes.includes(cause)) {
      if (config.sendPlayersFailureMessages) {
          deadEntity.sendMessage(`[Death-Debug][${name}] §cFAIL§r '${cause}' is not in include list`);
        }
      log(`[DeathLog][${name}] skipping '${cause}' (not in include list)`);
      continue;
    }

    if (config.sendPlayersFailureMessages) {
          deadEntity.sendMessage(`[Death-Debug][${name}] CauseFilter [Includes: ${includes}] [Excludes: ${excludes}] [Actual: ${cause}]`);
        }
//-------------------------------------------------------------------------

    // onlyPlayerKill: if true, require killer to be a player
    if (config.onlyPlayerKill && killer?.typeId !== "minecraft:player") {

      if (config.sendPlayersFailureMessages) {
      deadEntity.sendMessage(`[Deaths-Debug]§r[${name}] "Require Killer To Be A Player" is toggled to enabled & killer was ${killer.typeId} - fail`)
    }
      log(`[DeathLog][${name}] onlyPlayerKill is true but killer isn't player, skip`);
      continue;
    }

    // —— Killer Tag filters ——
    if (killer && typeof killer.getTags === "function") {
    const rawK = Array.isArray(config.killerTagFilter)
      ? config.killerTagFilter
      : sanitizeList((config.killerTagFilter||[]).join(','), /* allowSpaces=*/ false);
    const includeK = rawK.filter(t => !t.startsWith('!'));
    const excludeK = rawK.filter(t => t.startsWith('!')).map(t => t.slice(1));
    const killerTags = killer.getTags();
    if (config.sendPlayersFailureMessages) {
      deadEntity.sendMessage(`[Deaths Debug][${name}] KillerTagFilter [Included Tags:${includeK}] [Excluded Tags:${excludeK}] [Actual Tags:${killerTags}]`)
    }
    if (excludeK.some(tag => killer.hasTag(tag))) {
    if (config.sendPlayersFailureMessages) {
      deadEntity.sendMessage(`[Deaths Debug][${name}] killerTagFilter excluded: ${excludeK} - §cFAIL§r`)
    } 
      log(`[Deaths Debug][${name}] KillerTagFilter excluded: ${excludeK} - FAIL`);
      continue;
    }
    if (includeK.length && !includeK.every(tag => killer.hasTag(tag))) {

    if (config.sendPlayersFailureMessages) {
      deadEntity.sendMessage(`[Deaths Debug][${name}] KillerTagFilter missing one of: ${includeK} - §cFAIL§r`)
      continue;
    } 
    
      log(`[Deaths Debug][${name}] KillerTagFilter missing one of: ${includeK}- FAIL`);
      continue;
    }

    
    log(`[Deaths Debug][${name}] KillerTagFilter [Included Tags:${includeK}] [Excluded Tags:${excludeK}] [Actual Tags:${killerTags}]`)

    lastExploderBy.delete(deadEntity);
  }


  // — Killer Entity Type Filter —
if (killer){
const rawTypes = Array.isArray(config.killerTypeFilter)
? config.killerTypeFilter
: [];
const excludedTypes = rawTypes
.filter(t => t.startsWith("!"))
.map(t => t.slice(1));
const includedTypes = rawTypes.filter(t => !t.startsWith("!"));


// 1) Exclusion pass: if any excluded type matches, skip
if (killer && excludedTypes.length > 0) {
const isExcluded = excludedTypes.includes(killer.typeId);
log(
  `[DeathLog][${name}] KillerTypeFilter - excluded=[${excludedTypes.join(",")}], ` +
  `killer=${killer.typeId}, excludeHit=${isExcluded}`
);

if (config.sendPlayersFailureMessages) {
  deadEntity.sendMessage(`[Death-Debug[${name}] killerTypeFilter - excluded=[${excludedTypes.join(",")}] killer=${killer.typeId}, excludeHit=${isExcluded}`);
}
  if (isExcluded) continue;
}

// 2) Inclusion pass: if you have no includes, auto-pass; otherwise require a match
let typePassed;
if (killer && includedTypes.length === 0) {
typePassed = true;
log(`[KillLog][${name}] KillerTypeFilter - no includes configured, pass`);
} else { if (killer) {
typePassed = includedTypes.includes(killer.typeId);
log(
  `[KillLog][${name}] KillerTypeFilter - includes=[${includedTypes.join(",")}], ` +
  `killer=${killer.typeId || "none" }, pass=${typePassed}`
);
}}
if (config.sendPlayersFailureMessages && killer) {
  deadEntity.sendMessage (`[Kill-Debug][${name}] KillerTypeFilter - includes=[${includedTypes.join(",")}], killer=${killer.typeId}, pass=${typePassed}`)
}
if (config.sendPlayersFailureMessages && !killer) {
  deadEntity.sendMessage (`[Kill-Debug][${name}] KillerTypeFilter - includes=[${includedTypes.join(",")}], killer= none, pass=${typePassed}`)
}
if (!typePassed) continue;
}

//----------- Killer family filter------------------
if(killer){
    
    let familyPassed = false;
const rawFams = Array.isArray(config.killerFamilyFilter)
  ? config.killerFamilyFilter
  : [config.killerFamilyFilter];

// split out excluded vs included
const excludedFams = rawFams
  .filter(f => f.startsWith("!"))
  .map(f => f.slice(1));
const includedFams = rawFams.filter(f => !f.startsWith("!"));

const famComp = killer.getComponent("minecraft:type_family");
const engineFams = famComp
  ? (Array.isArray(famComp.getTypeFamilies)
      ? famComp.getTypeFamilies()
      : famComp.family ?? famComp.families ?? [])
  : [];

// 1) exclusion check
if (excludedFams.length > 0) {
  // if any excluded family matches, fail immediately
  const hit = excludedFams.some(ex => 
    typeof famComp?.hasTypeFamily === "function"
      ? famComp.hasTypeFamily(ex)
      : engineFams.includes(ex)
  );
  log(
    `[DeathLog][${name}] KillerFamilyFilter - excluded=[${excludedFams.join(",")}], ` +
    `engine=[${engineFams.join(",")}], excludeHit=${hit}`
  );
  if (config.sendPlayersFailureMessages) {
    deadEntity.sendMessage(`[Death-Debug][${name}] KillerFamilyFilter - excluded=[${excludedFams.join(",")}], engine=[${engineFams.join(",")}], excludeHit=${hit}`)
  }
  if (hit) continue;  // skip this counter
}

// 2) inclusion check
if (includedFams.length === 0) {
  familyPassed = true;
  log(`[DeathLog][${name}] KillerFamilyFilter - no includes configured, pass`);
} else if (famComp && killer.typeId === "minecraft:player") {
  // see if any of the engine families match an include
  familyPassed = includedFams.some(inc => 
    typeof famComp.hasTypeFamily === "function"
      ? famComp.hasTypeFamily(inc)
      : engineFams.includes(inc)
  );
  log(
    `[DeathLog][${name}] KillerFamilyFilter - required=[${includedFams.join(",")}], ` +
    `engine=[${engineFams.join(",")}], pass=${familyPassed}`
  );
if (config.sendPlayersFailureMessages) {
deadEntity.sendMessage(`[Death-Debug][${name}] KillerFamilyFilter - required=[${includedFams.join(",")}], engine=[${engineFams.join(",")}], pass=${familyPassed}`
  );
}
  
} else {
  // no family component or killer isn’t player → skip family filtering
  familyPassed = true;
  log(`[Death-Log][${name}] KillerFamilyFilter - skipped (no type_family or killer invalid)`);
  if (config.sendPlayersFailureMessages) {
deadEntity.sendMessage(`[Death-Debug][${name}] KillerFamilyFilter - skipped (no type_family or killer invalid)`);
}
}

if (!familyPassed) continue;
}


// ── Killer score filter (using checkScoreFilter)
if(killer) {
   const ksPassed = checkScoreFilter(
  killer,
  config.killerScoreFilter,
  "killerScoreFilter",       // label
  config.logToConsole,       // log → console.warn
  config.sendPlayersFailureMessages, // sendFailure → player.sendMessage
  deadEntity
   );
    log(
      `[KillLog][${name}] KillerScoreFilter - filter=${JSON.stringify(config.killerScoreFilter)}, pass=${ksPassed}`
    );

    if (config.sendPlayersFailureMessages) {
    deadEntity.sendMessage(
      `[KillLog][${name}] KillerScoreFilter - filter=${JSON.stringify(config.killerScoreFilter)}, pass=${ksPassed}`
    );
    }

    
    if (!ksPassed) continue;
  }

  if (killer && killer.typeId=== "minecraft:player"){ 
// —— REQUIRED ITEM FILTER (uses config.itemType) —— 
  const rawItems = Array.isArray(config.itemType) ? config.itemType : [];
  if (rawItems.length > 0) {
    let handItem = null;
const invComp = killer.getComponent("minecraft:inventory");
if (invComp) {
  handItem = invComp.container.getItem(killer.selectedSlotIndex ?? 0);
} else {
  // …otherwise try mob equipment
  const equipComp = killer.getComponent("minecraft:equipment_inventory");
  if (equipComp) {
    // slot 0 is usually main‐hand
    handItem = equipComp.container.getItem(0);
  }
}

const itemId = handItem?.typeId;
if (!itemId) {
  if (config.sendPlayersFailureMessages) {
    deadEntity.sendMessage(
      `[Death-Debug:${name}] failed: no hand‐item to test`
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
      if (config.sendPlayersFailureMessages) {
        deadEntity.sendMessage(
          `[Death-Debug:${name}] failed: held item excluded (${itemId})`
        );
      }
      continue;
    }
    // 5) include‐list check (only if includes exist)
    if (includeItems.length > 0 && !includeItems.includes(itemId)) {
      if (config.sendPlayersFailureMessages) {
        deadEntity.sendMessage(
          `[Death-Debug:${name}] failed: held item not in include list (${itemId})`
        );
      }
      continue;
    }



  }
}

//DEATH location filter

if (config.killLocationEnabled) {
  // 1) grab the dead entity’s position
  

  // 2) bail out if no position
  if (!pos) {
    if (config.sendPlayersFailureMessages) {
      deadEntity.sendMessage(
        `[Death-Debug:${name}] no position data on ${deadEntity.typeId}`
      );
    }
    continue; // skip this death
  }

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
      deadEntity.sendMessage(
        `[Death-Debug:${name}] Death Location FAIL at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}); allowed [${allowed}]`
      );
    }
    log(`[Death-Debug:${name}] Death Location FAIL at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}); allowed [${allowed}]`);
    continue; // don’t count this death
  }

  // 6) optional “pass” debug
  if (config.sendPlayersFailureMessages) {
    deadEntity.sendMessage(
      `[Death-Debug:${name}] Death Location PASS at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}); allowed [${allowed}]`
    );
  }
  log(`[Death-Debug:${name}] Death Location PASS at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}); allowed [${allowed}]`);
}

    
     //-----------Deaths Tag Filter---------------------------

    const rawD = Array.isArray(config.deathTagFilter)
      ? config.deathTagFilter
      : sanitizeList((config.deathTagFilter||[]).join(','), /* allowSpaces=*/ false);
    const victimTags = deadEntity.getTags();
    const includeD = rawD.filter(t => !t.startsWith('!'));
    const excludeD = rawD.filter(t => t.startsWith('!')).map(t => t.slice(1));
    if (config.sendPlayersFailureMessages) {
      deadEntity.sendMessage(`[Death-Debug][${name}] victim tag filter [Included Tags:${includeD}] [Excluded Tags:${excludeD}] [Actual Tags:${victimTags}]`)
    }
    if (excludeD.some(tag => deadEntity.hasTag(tag))) {
    
     if (config.sendPlayersFailureMessages) {
      deadEntity.sendMessage(`[Death-Debug][${name}] victim tag excluded: ${excludeD}- §cFAIL`)
    }

      log(`[Death-Debug][${name}] victim tag excluded: ${excludeD}- FAIL`);
      continue;
    }
   

    if (includeD.length && !includeD.every(tag => deadEntity.hasTag(tag))) {
    

      if (config.sendPlayersFailureMessages) {
      deadEntity.sendMessage(`[Death-Debug][${name}] victim tag missing one of: ${includeD}- §cFAIL`)
    }

      log(`[Death-Debug][${name}] victim tag missing one of: ${includeD}- FAIL`);
      continue;
    }
    
    
    log(`[Death-Debug][${name}] victim tag filter [Included Tags:${includeD}] [Excluded Tags:${excludeD}] [Actual Tags:${victimTags}]`)

    //-------------Death score filter--------------------------------------
    const dsPassed = checkScoreFilter(deadEntity, config.deathScoreFilter);
    log(
      `[DeathLog][${name}] DeathScoreFilter -` +
      `filter=${JSON.stringify(config.deathScoreFilter)}, pass=${dsPassed}`
    );

    if (config.sendPlayersFailureMessages) {
      deadEntity.sendMessage(
      `[Death-Debug][${name}] DeathScoreFilter - filter=${JSON.stringify(config.deathScoreFilter)}, pass=${dsPassed}`
    );
    }
    if (!dsPassed) continue;



    

//-------------- FULL PASS--------------

// ——— Run victimCommand if it’s set ———
if (config.victimCommand?.trim()) {
  const cmd = config.victimCommand
    .replace('{victim}', deadEntity.name);
  deadEntity.runCommand(cmd)
}


    // ── Pick random increment
    const { min, max } = config.incrementScore.amount;
    const value = randomInRange(min, max);
    log(`[DeathLog][${name}] randomInRange → value=${value} from (${min}-${max})`);

    if (config.sendPlayersFailureMessages) {
      deadEntity.sendMessage(`[Death-Debug][${name}] randomInRange - value=${value} from (${min}-${max})`);

    }

    // ── Apply score to deadEntity
    const objectiveIds = Array.isArray(config.objectiveName)
      ? config.objectiveName
      : [config.objectiveName];
    const displayNames = Array.isArray(config.displayName)
      ? config.displayName
      : [config.displayName];

    for (let i = 0; i < objectiveIds.length; i++) {
      const objId = objectiveIds[i];
      const disp  = displayNames[i] || objId;

      createScoreboardIfNotExists(objId, disp);
      const objective = world.scoreboard.getObjective(objId);
      if (!objective) {
        log(`[DeathLog][${name}] Objective '${objId}' missing, skip`);
        continue;
      }

      applyDeltaSafely(objective, deadEntity, {
        amount:        config.incrementScore.amount,
        mode:          config.incrementScore.mode,
        allowNegative: config.incrementScore.allowNegative
      });
      const after = objective.getScore(deadEntity)
      log(
        `[DeathLog][${name}] applyDeltaSafely → ` +
        `objective=${objId}, delta=${value}, ` +
        `mode=${config.incrementScore.mode}, allowNegative=${config.incrementScore.allowNegative}`
      );

      if (config.sendPlayersFailureMessages) {(
        `[DeathLog][${name}] applyDeltaSafely - ` +
        `objective=${objId}, delta=${value}, ` +
        `mode=${config.incrementScore.mode}, allowNegative=${config.incrementScore.allowNegative}`
      );}

      // ── Action Bar
      if (config.actionBarEnabled && deadEntity.typeId=== "minecraft:player") {
        if (config.sendPlayersFailureMessages) {
          deadEntity.sendMessage(`action bar toggled - enabled`)
        }
        const ids = objectiveIds;
        const names = displayNames;
        const actionBarFormatCode = config.actionBarFormatCode;
        showSingleActionBar(deadEntity, ids, names, value, config.incrementScore.mode, actionBarFormatCode);
      }
      
      

 

      // ── Send message to deadEntity
      if (config.sendPlayersMessages && deadEntity.typeId === "minecraft:player") {
        const verb = config.incrementScore.mode === "add" ? "added to" : "removed from";
        if (config.sendPlayersFailureMessages) {
          deadEntity.sendMessage(
          `[Death-Log][${name}] §aFULL PASS§r - You died, ${value} point${value===1?"":"s"} ${verb} "${disp}" now ${after}`
        );
        }
        
        log(
          `[DeathLog][${name}] Sending message - You died, ${value} point${value===1?"":"s"} ${verb} "${disp}" now ${after}`
        );
        deadEntity.sendMessage(
          `You died, and ${value} point${value===1?"":"s"} ${verb} "${disp}"!`
        );
      }



      // ── Log to menu
      if (config.logToMenu) {
        const verb = config.incrementScore.mode === "add" ? "added to" : "removed from";


      if (cause === "entityAttack") {
      if (killer && killer.typeId === "minecraft:player") {
        addLog(
          `§c[DeathCounter: ${name}]§r ${deadEntity.nameTag} was killed by ${killer.name} at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})  and ${value} ${verb} "${disp}" now ${after}`);
      }
      const hasNameTag = typeof killer.nameTag === "string" && killer.nameTag.length > 0;
      if (killer && killer.typeId !== "minecraft:player" && hasNameTag) {
        addLog(
          `§c[DeathCounter: ${name}]§r ${deadEntity.nameTag} was killed by ${killer.typeId} named "${killer.nameTag}" at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) in ${dimId} and ${value} ${verb} "${disp}" now ${after}`);
      }

      if (killer && killer.typeId !== "minecraft:player" && !hasNameTag) {
        addLog(
          `§c[DeathCounter: ${name}]§r ${deadEntity.nameTag} was killed by ${killer.typeId} at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) in ${dimId} and ${value} ${verb} "${disp}" now ${after}`);
      }
    }
      if (cause !== "entityAttack") {
        addLog(
          `§c[DeathCounter: ${name}]§r ${deadEntity.nameTag} was killed by ${cause} at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) in ${dimId} and ${value} ${verb} "${disp}" now ${after}`);
      }
      
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
    }
  }
});


