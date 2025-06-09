import { world, system, EntityInventoryComponent } from "@minecraft/server";
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
    manageAllCountersMenu } from "./main";

///--------------- GENERAL KILLS COUNTER MEMORY AND CONFIGS ----------------



const KILLS_PREFIX = "killsCounter:";

export const defaultKillCounterConfig = {
  enabled: true,
  actionBarEnabled: true,
  actionBarFormatCode: "r",
  objectiveName: [],
  displayName: [],
  logToMenu: false,
  logToConsole: false,
  sendPlayersMessages: true,
  sendPlayersFailureMessages: false,
  victimEntityType: [],
  victimEntityFamily: [],
  incrementScore: {
    amount: { min: 1, max: 1 },
    mode: "add",
    allowNegative: false,
  },
  deadEntity: [],
  killerTagFilter: [],
  itemType:[],
  deathTagFilter: [],
  killerScoreFilter: { objective: "none", min: 1, max: 1 },
  deathScoreFilter: { objective: "none", min: 1, max: 1 },
  onlyPlayerKill: false,
  excludeTrident: true,
  killLocation: { 
    x: { min: -100, max: 100 },
    y: { min: -100, max: 100 },
    z: { min: -100, max: 100 },
  },
  killLocationEnabled: false,
  killerCommand: "",
  dimensionFilter: ["overworld", "nether", "the_end"],
  displayType: ["none"]
};

export let killCounters = {};


export function saveKillCounter(counterName, config) {
    try {
      const raw = JSON.stringify(config);
      world.setDynamicProperty(KILLS_PREFIX + counterName, raw);
      killCounters[counterName] = config;
    } catch (e) {
      console.error(`[Save] Failed to save Kill Counter '${counterName}':`, e );
    }
  }

export function loadKillCounters() {
  try {
    const allKeys = world.getDynamicPropertyIds();
    for (const key of allKeys) {
      if (!key.startsWith(KILLS_PREFIX)) continue;
      const counterName = key.slice(KILLS_PREFIX.length);
      const raw = world.getDynamicProperty(key);

      try {

        const parsed = JSON.parse(raw);
                const defaultLoc = defaultKillCounterConfig.killLocation;
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
                    ?? defaultKillCounterConfig.killLocationEnabled;

        // ── Merge incrementScore and preserve allowNegative ─────────────
        const incrementScore = {
          ...defaultKillCounterConfig.incrementScore,
          ...parsed.incrementScore,
          allowNegative: parsed.incrementScore?.allowNegative 
            ?? defaultKillCounterConfig.incrementScore.allowNegative
        };

        // ── Merge your existing filters ────────────────────────────────
        const killerScoreFilter = {
          ...defaultKillCounterConfig.killerScoreFilter,
          ...parsed.killerScoreFilter
        };
        const deathScoreFilter = {
          ...defaultKillCounterConfig.deathScoreFilter,
          ...parsed.deathScoreFilter
        };

        // ── Array-typed settings with fallbacks ────────────────────────
        const victimEntityType = Array.isArray(parsed.victimEntityType)
          ? parsed.victimEntityType
          : defaultKillCounterConfig.victimEntityType;
        const victimEntityFamily = Array.isArray(parsed.victimEntityFamily)
          ? parsed.victimEntityFamily
          : defaultKillCounterConfig.victimEntityFamily;
        const deathTagFilter = Array.isArray(parsed.deathTagFilter)
          ? parsed.deathTagFilter
          : defaultKillCounterConfig.deathTagFilter;
        const killerTagFilter = Array.isArray(parsed.killerTagFilter)
          ? parsed.killerTagFilter
          : defaultKillCounterConfig.killerTagFilter;
        // ── NEW: load itemType filter array ───────────────────────────
        const itemType = Array.isArray(parsed.itemType)
          ? parsed.itemType
          : defaultKillCounterConfig.itemType;

        // ── Boolean flags and format codes ────────────────────────────
        const actionBarEnabled = parsed.actionBarEnabled 
          ?? defaultKillCounterConfig.actionBarEnabled;
        const logToMenu = parsed.logToMenu 
          ?? defaultKillCounterConfig.logToMenu;
        const logToConsole = parsed.logToConsole 
          ?? defaultKillCounterConfig.logToConsole;
        const sendPlayersMessages = parsed.sendPlayersMessages 
          ?? defaultKillCounterConfig.sendPlayersMessages;
        const sendPlayersFailureMessages = parsed.sendPlayersFailureMessages 
          ?? defaultKillCounterConfig.sendPlayersFailureMessages;
        const actionBarFormatCode = parsed.actionBarFormatCode 
          ?? defaultKillCounterConfig.actionBarFormatCode;
        const killerCommand = parsed.killerCommand ?? defaultKillCounterConfig.killerCommand;
        const dimensionFilter = Array.isArray(parsed.dimensionFilter)
                                    ? parsed.dimensionFilter
                                    : defaultKillCounterConfig.dimensionFilter;

        // ── Compose the in-memory config ──────────────────────────────
        killCounters[counterName] = {
          ...defaultKillCounterConfig,
          ...parsed,
          killLocationEnabled,
          killLocation,
          incrementScore,
          killerScoreFilter,
          killerTagFilter,
          deathTagFilter,
          deathScoreFilter,
          victimEntityType,
          victimEntityFamily,
          itemType,
          actionBarEnabled,
          logToMenu,
          logToConsole,
          sendPlayersMessages,
          sendPlayersFailureMessages,
          actionBarFormatCode,
          killerCommand,
          dimensionFilter,
          type: "kill"
        };
      } catch {
        console.warn(
          `[Load] Failed to parse Kill Counter config for '${counterName}'`
        );
      }
    }
  } catch (e) {
    console.error("[Load] Failed to load Kill counters:", e);
  }
}


  


//--------DELETE KILL COUNTER FUNCTION--------
export function deleteKillCounter(counterName) {
    try {
      world.setDynamicProperty(KILLS_PREFIX + counterName, undefined);
      delete killCounters[counterName];
    } catch (e) {
      console.error(`[Delete] Failed to delete Kill Counter '${counterName}':`, e);
    }
  }
//-----------------------------------------------------------



///-------------Show Add/edit Kill Counter Form------------------


export function showConfigureKillCounterForm(player, name) {
  const rawConfig = killCounters[name] || {};
  const config = {
    ...defaultKillCounterConfig,
    ...rawConfig,
    incrementScore: {
      ...defaultKillCounterConfig.incrementScore,
      ...rawConfig.incrementScore,
    },
    killerScoreFilter: {
      ...defaultKillCounterConfig.killerScoreFilter,
      ...rawConfig.killerScoreFilter,
    },
    deathScoreFilter: {
      ...defaultKillCounterConfig.deathScoreFilter,
      ...rawConfig.deathScoreFilter,
    },
  };

  // ── Helpers ──────────────────────────────────────────────────────
  const sanitizeList = (raw, allowSpaces = false) =>
    raw
      ?.split(",")
      .map(s => s.trim())
      .map(s => {
        const isNeg = !allowSpaces && s.startsWith("!");
        const core = isNeg ? s.slice(1) : s;
        const cleaned = allowSpaces
          ? core
          : core.replace(/[^a-zA-Z0-9_:!]/g, "");
        return isNeg ? `!${cleaned}` : cleaned;
      })
      .filter(Boolean) || [];

  const filterNone = list =>
    list.filter(e => e.toLowerCase() !== "none");

  const formatRange = r =>
    r.exclude
      ? `!${r.exclude.min ?? ""}${
          r.exclude.min != null && r.exclude.max != null ? ".." : ""
        }${r.exclude.max ?? ""}`
      : `${r.min ?? ""}${
          r.min != null && r.max != null ? ".." : ""
        }${r.max ?? ""}`;

  // ── Initial form values ──────────────────────────────────────────
  const initial = {
    enabled: config.enabled,
    actionBarEnabled: config.actionBarEnabled,
    actionBarFormatCode: config.actionBarFormatCode,
    tridentEnabled: !config.excludeTrident,
    objectiveName: Array.isArray(config.objectiveName)
      ? config.objectiveName.join(", ")
      : config.objectiveName || "",
    displayName: Array.isArray(config.displayName)
      ? config.displayName.join(", ")
      : config.displayName || "",
    incrementAmount:
      config.incrementScore.amount.min ===
      config.incrementScore.amount.max
        ? String(config.incrementScore.amount.min)
        : `${config.incrementScore.amount.min}..${config.incrementScore.amount.max}`,
    removeMode: config.incrementScore.mode === "remove",
    allowNegative: Boolean(config.incrementScore.allowNegative),
    killerTags: Array.isArray(config.killerTagFilter)
      ? config.killerTagFilter.join(", ")
      : "",
    victimTags: Array.isArray(config.deathTagFilter)
      ? config.deathTagFilter.join(", ")
      : "",
    killerScoreObj: Array.isArray(config.killerScoreFilter.objective)
      ? config.killerScoreFilter.objective.join(", ")
      : "",
    killerScoreRange: formatRange(config.killerScoreFilter),
    // ── NEW initial for itemType ───────────────────────────────────
    itemType: Array.isArray(config.itemType)
      ? config.itemType.join(", ")
      : "",
    victimScoreObj: Array.isArray(config.deathScoreFilter.objective)
      ? config.deathScoreFilter.objective.join(", ")
      : "",
    victimScoreRange: formatRange(config.deathScoreFilter),
    victimTypes: Array.isArray(config.victimEntityType)
      ? config.victimEntityType.join(", ")
      : "",
    victimFamilies: Array.isArray(config.victimEntityFamily)
      ? config.victimEntityFamily.join(", ")
      : "",
    killLocationEnabled: Boolean(config.killLocationEnabled),
     killLocation:
    `${config.killLocation.x.min}..${config.killLocation.x.max},` +
    `${config.killLocation.y.min}..${config.killLocation.y.max},` +
    `${config.killLocation.z.min}..${config.killLocation.z.max}`,
    killerCommand: String(config.killerCommand ?? ""),
    logToConsole: config.logToConsole,
    sendPlayersMessages: config.sendPlayersMessages,
    sendPlayersFailureMessages: config.sendPlayersFailureMessages,
    logToMenu: config.logToMenu,
  };

  // ── Build form ───────────────────────────────────────────────────
  const form = new ModalFormData()
    .title(`Configure Kill Counter: ${name}`)
    .toggle("Counter Enabled", initial.enabled)
    .toggle("Action Bar Enabled", initial.actionBarEnabled)
    .textField("Action Bar Format Code", "a–u or 0–9", initial.actionBarFormatCode)
    .toggle("Trident Killers Enabled", initial.tridentEnabled)
    .textField("Score Objective Name(s)", "e.g. monster_kills", initial.objectiveName)
    .textField("Display Name(s)", "e.g. Monster Kills", initial.displayName)
    .textField("Increment Killer Score Amount", "(e.g. 1 or 1..5)", initial.incrementAmount)
    .dropdown('Killer Score Mode', ['Add Score', 'Remove Score'], initial.removeMode ? 1 : 0 )
    .toggle("Allow Negative Numbers (Killer)", initial.allowNegative)
    .textField('Execute Command as Killer (e.g /give @s diamond 1 0)', '', initial.killerCommand)
    .textField("Killer Required Tags","e.g. member,vip,!noPvP", initial.killerTags)
    .textField("Victim Required Tags", "e.g. boss,!protected", initial.victimTags)
    .textField("Killer Required Score Objective(s)", "e.g. blue_team", initial.killerScoreObj)
    .textField("Killer Required Score Range","e.g. 1, 1..10, !1, 1.., ..10", initial.killerScoreRange)
    .textField("Item Type Filter", "e.g. minecraft:diamond_axe,!minecraft:netherite_axe", initial.itemType)
    .textField("Victim Required Score Objective(s)", "e.g. red_team", initial.victimScoreObj)
    .textField("Victim Required Score Range", "e.g. 1, 1..10, !1, 1.., ..10", initial.victimScoreRange)
    .textField("Victim Entity Types", "e.g. minecraft:creeper,!minecraft:zombie", initial.victimTypes)
    .textField("Victim Entity Families", "e.g. monster,!undead", initial.victimFamilies)
    .toggle("Kill Location Enabled", initial.killLocationEnabled)
    .textField("Kill Location (x, y, z) or a range (x..x, y..y, z..z)", "e.g. -100..100,-100..100,-100..100", initial.killLocation)
    .toggle("Debug Log To Console", initial.logToConsole)
    .toggle("Send Players Messages", initial.sendPlayersMessages)
    .toggle("Send Players Debug Messages", initial.sendPlayersFailureMessages)
    .toggle("Log To Menu\n(not recommended in most cases)", initial.logToMenu);

  form.show(player).then(response => {
    if (response.canceled) return;

    const [
      enabled,
      actionBarEnabled,
      actionBarFormatCodeRaw,
      tridentToggle,
      objectiveNameRaw,
      displayNameRaw,
      incrementRaw,
      killerModeIndex,
      allowNegativeRaw,
      killerCommandRaw,
      killerTagsRaw,
      victimTagsRaw,
      killerScoreObjRaw,
      killerScoreRangeRaw,
      itemTypeRaw,
      deathScoreObjRaw,
      deathScoreRangeRaw,
      victimTypesRaw,
      victimFamiliesRaw,
      killLocationEnabledRaw,
      killLocationRaw,
      logToConsoleRaw,
      sendPlayersMessagesRaw,
      sendPlayersFailureMessagesRaw,
      logToMenuRaw,
    ] = response.formValues;

    // ── Parse inputs ────────────────────────────────────────────────
    const rawCode = String(actionBarFormatCodeRaw).trim();
    const actionBarFormatCode = /^[a-u0-9]$/.test(rawCode)
      ? rawCode
      : defaultKillCounterConfig.actionBarFormatCode;

    const objectiveNameArr = objectiveNameRaw.trim()
      ? filterNone(sanitizeList(objectiveNameRaw))
      : defaultKillCounterConfig.objectiveName;

    const displayNameArr = displayNameRaw.trim()
      ? sanitizeList(displayNameRaw, true)
      : defaultKillCounterConfig.displayName;

    const incrementAmount = incrementRaw.trim()
      ? parseRangeInput(incrementRaw.trim())
      : defaultKillCounterConfig.incrementScore.amount;

    const modeStr = killerModeIndex === 1 ? 'remove' : 'add';
    const allowNegative = Boolean(allowNegativeRaw);
    const killerCommand = String(killerCommandRaw).trim();
    const excludeTrident = !tridentToggle;

    const killerTagFilter = killerTagsRaw.trim()
      ? sanitizeList(killerTagsRaw)
      : defaultKillCounterConfig.killerTagFilter;

    const deathTagFilter = victimTagsRaw.trim()
      ? sanitizeList(victimTagsRaw)
      : defaultKillCounterConfig.deathTagFilter;

    const killerScoreObjectives = killerScoreObjRaw.trim()
      ? filterNone(sanitizeList(killerScoreObjRaw))
      : defaultKillCounterConfig.killerScoreFilter.objective;

    const killerScoreParsed = parseRangeInput(killerScoreRangeRaw);
    const killerScoreFilter = {
      objective: killerScoreObjectives,
      min: killerScoreParsed.min,
      max: killerScoreParsed.max,
      exclude: killerScoreParsed.exclude,
    };

    // ── NEW parser for itemType ────────────────────────────────────
    const itemTypeArr = itemTypeRaw.trim()
      ? filterNone(sanitizeList(itemTypeRaw))
      : defaultKillCounterConfig.itemType;

    const victimScoreObjectives = deathScoreObjRaw.trim()
      ? filterNone(sanitizeList(deathScoreObjRaw))
      : defaultKillCounterConfig.deathScoreFilter.objective;

    const victimScoreParsed = parseRangeInput(deathScoreRangeRaw);
    const deathScoreFilter = {
      objective: victimScoreObjectives,
      min: victimScoreParsed.min,
      max: victimScoreParsed.max,
      exclude: victimScoreParsed.exclude,
    };

    const victimEntityType = victimTypesRaw.trim()
      ? filterNone(sanitizeList(victimTypesRaw))
      : defaultKillCounterConfig.victimEntityType;

    const victimEntityFamily = victimFamiliesRaw.trim()
      ? filterNone(sanitizeList(victimFamiliesRaw))
      : defaultKillCounterConfig.victimEntityFamily;

    const killLocationEnabled = Boolean(killLocationEnabledRaw);
          const [xRaw = "", yRaw = "", zRaw = ""] =
          String(killLocationRaw).split(/\s*,\s*/);
    
          // parseRangeInput for each (falls back to defaults if empty)
          const locX = xRaw.trim()
          ? parseRangeInput(xRaw.trim())
          : defaultKillCounterConfig.killLocation.x;
          const locY = yRaw.trim()
          ? parseRangeInput(yRaw.trim())
           : defaultKillCounterConfig.killLocation.y;
          const locZ = zRaw.trim()
          ? parseRangeInput(zRaw.trim())
          : defaultKillCounterConfig.killLocation.z;
    const killLocation = { x: locX, y: locY, z: locZ };

    const logToConsole = Boolean(logToConsoleRaw);
    const sendPlayersMessages = Boolean(sendPlayersMessagesRaw);
    const sendPlayersFailureMessages = Boolean(
      sendPlayersFailureMessagesRaw
    );
    const logToMenu = Boolean(logToMenuRaw);

    // ── Build saved config ─────────────────────────────────────────
    const configToSave = {
      enabled,
      actionBarEnabled,
      actionBarFormatCode,
      excludeTrident,
      objectiveName: objectiveNameArr,
      displayName: displayNameArr,
      incrementScore: {
        amount: incrementAmount,
        mode: modeStr,
        allowNegative,
      },
      killerCommand,
      killerTagFilter,
      deathTagFilter,
      killerScoreFilter,
      deathScoreFilter,
      itemType: itemTypeArr,
      victimEntityType,
      victimEntityFamily,
      killLocationEnabled,
      killLocation,
      logToConsole,
      sendPlayersMessages,
      sendPlayersFailureMessages,
      logToMenu,
      dimensionFilter: config.dimensionFilter || defaultKillCounterConfig.dimensionFilter,
      type: "kill",
    };

    // ── Confirmation ────────────────────────────────────────────────
    const df = v => (Array.isArray(v) && v.length ? v.join(", ") : "None");
    const fmt = formatRange
    const confirm = new MessageFormData()
      .title("Confirm Kill Counter Setup")
      .body(
        `Counter Name: ${name}\n` +
        `Enabled: ${configToSave.enabled}\n` +
        `Action Bar: ${configToSave.actionBarEnabled}\n` +
        `Format Code: ${configToSave.actionBarFormatCode}\n` +
        `Trident Enabled: ${!configToSave.excludeTrident}\n` +
        `Objective(s): ${df(configToSave.objectiveName)}\n` +
        `Display Name(s): ${df(configToSave.displayName)}\n` +
        `Increment Score: ${configToSave.incrementScore.amount.min === configToSave.incrementScore.amount.max ? configToSave.incrementScore.amount.min : `${configToSave.incrementScore.amount.min}..${configToSave.incrementScore.amount.max}`} (${configToSave.incrementScore.mode})\n` +
        `Killer Command: ${killerCommand || "None"}\n` +       
        `Killer Tags: ${df(configToSave.killerTagFilter)}\n` +
        `Victim Tags: ${df(configToSave.deathTagFilter)}\n` +
        `Killer Score Obj: ${df(configToSave.killerScoreFilter.objective)} [${formatRange(configToSave.killerScoreFilter)}]\n` +
        `Item Type Filter: ${df(configToSave.itemType)}\n` +
        `Victim Score Obj: ${df(configToSave.deathScoreFilter.objective)} [${formatRange(configToSave.deathScoreFilter)}]\n` +
        `Victim Types: ${df(configToSave.victimEntityType)}\n` +
        `Victim Families: ${df(configToSave.victimEntityFamily)}\n` +
        `Kill Location Enabled: ${configToSave.killLocationEnabled}\n` +
        `Kill Location: ${fmt(configToSave.killLocation.x)}, ${fmt(configToSave.killLocation.y)}, ${fmt(configToSave.killLocation.z)}\n` +
        `Log To Console: ${configToSave.logToConsole}\n` +
        `Send Messages: ${configToSave.sendPlayersMessages}\n` +
        `Send Debug Messages: ${configToSave.sendPlayersFailureMessages}\n` +
        `Log To Menu: ${configToSave.logToMenu}`
      )
      .button1("Confirm")
      .button2("Edit");

    confirm.show(player).then(result => {
      if (result.canceled || result.selection === 1) {
        showConfigureKillCounterForm(player, name);
        return;
      }
      saveKillCounter(name, configToSave);
      player.sendMessage(`§aKill Counter '${name}' saved.`);
      addLog(
        `§a[Add/Edit]§r ${player.name} managed kill counter '${name}'.`
      );
      manageAllCountersMenu(player);
    });
  });
}


//------------------ Kill Counter Logic ------------------

// Main kill logic
world.afterEvents.entityDie.subscribe(event => {
  const { deadEntity, damageSource } = event;
  const killer = damageSource?.damagingEntity;
  const damagingProjectile = damageSource?.damagingProjectile;
  if (!deadEntity || !killer) {return;}
  if (killer.typeId !== "minecraft:player" ) return;
  
  for (const [name, config] of Object.entries(killCounters)) {

    //Check If enabled
    if (!config?.enabled) {
    if (config.sendPlayersFailureMessages) {
      killer.sendMessage(`§5[Kills-Debug]§r[${name}] Is toggled To Disabled - §cStop Processing`)
    } continue; }
    
    let pos;
  if (typeof killer.location === "object") {
    pos = killer.location;
  } else {
    const posComp = killer.getComponent("minecraft:position");
    pos = posComp?.location;
  }

  const { x, y, z } = pos;

    // only log if the toggle is true
    const log = (...args) => {
      if (config.logToConsole) console.log(...args);
    };

    log(`[KillLog][${name}] → Start processing`);

    if  (config.sendPlayersFailureMessages) {
        killer.sendMessage(`§5[Kill-Debug:§r ${name}] is toggled to enabled- §aStart Processing`); }
    
    if (killer.typeId !== "minecraft:player") { return; }

    if (config.sendPlayersFailureMessages) {
  const flagStatuses = {
    "action bar toggle": config.actionBarEnabled,
    "allow negative numbers": config.incrementScore.allowNegative,
    "trident killers enabled": config.tridentEnabled,
    "send players messages": config.sendPlayersMessages,
    "send dead players debug messages": config.sendPlayersFailureMessages,
    "log to menu": config.logToMenu,
    "log to console": config.logToConsole,
  };

  const lines = Object.entries(flagStatuses)
    .map(
      ([label, enabled]) =>
        `${label} - ${enabled ? "enabled" : "disabled"}`
    );

  killer.sendMessage(lines.join("\n"));
}

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
          `[Death-Debug§r:${name}] DimensionFilter §cFAIL§r ${deadEntity.typeId} died in ${dimId}, which is disabled`
        );
      }
      // log and skip to next counter
      log(`[DeathCounter:${name}] skipped in ${dimId}`);  
      continue;
    }



    // ── Trident exclusion
    const blockedByTrident = config.excludeTrident
  && damagingProjectile?.typeId === "minecraft:thrown_trident";

const tridentMsg =
  `[KillLog][${name}] Trident check → ` +
  `excludeTrident=${config.excludeTrident}, ` +
  `projectile=${damagingProjectile?.typeId}, pass=${!blockedByTrident}`;

// always log
log(tridentMsg);
if (config.sendPlayersFailureMessages) {
    killer.sendMessage(`[Kill-Debug ${name}] Trident check - excludeTrident=${config.excludeTrident} projectile=${damagingProjectile?.typeId} pass=${!blockedByTrident}`);
  }
// if it’s blocked, optionally message the player then skip
if (blockedByTrident) {
  continue;
}


    // ── Killer tag filter (include/exclude "!" support)
    const killerTags = killer.getTags();
    const rawK = config.killerTagFilter || [];
    const includeK = rawK.map(t => t.trim()).filter(t => t && !t.startsWith("!"));
    const excludeK = rawK.map(t => t.trim()).filter(t => t.startsWith("!")).map(t => t.slice(1));
    const killerTagPassed =
      !excludeK.some(tag => killerTags.includes(tag)) &&
      (includeK.length === 0 || includeK.some(tag => killerTags.includes(tag)));
    log(
      `[KillLog][${name}] KillerTagFilter → include=[${includeK.join(",")}] exclude=[${excludeK.join(",")}] actual=[${killerTags.join(",")}] pass=${killerTagPassed}`
    );

    if (config.sendPlayersFailureMessages) {
    killer.sendMessage(`[Kill-Debug[${name}] KillerTagFilter - include=[${includeK.join(",")}] exclude=[${excludeK.join(",")}] actual=[${killerTags.join(",")}] pass=${killerTagPassed}`) }


    if (!killerTagPassed) continue;

    // ── Killer score filter (using checkScoreFilter)
   const ksPassed = checkScoreFilter(
  killer,
  config.killerScoreFilter,
  "killerScoreFilter",       // label
  config.logToConsole,       // log → console.warn
  config.sendPlayersFailureMessages // sendFailure → player.sendMessage
   );
    log(
      `[KillLog][${name}] KillerScoreFilter - filter=${JSON.stringify(config.killerScoreFilter)}, pass=${ksPassed}`
    );

    if (config.sendPlayersFailureMessages) {
    killer.sendMessage(
      `[KillLog][${name}] KillerScoreFilter - filter=${JSON.stringify(config.killerScoreFilter)}, pass=${ksPassed}`
    );
    }

    
    if (!ksPassed) continue;

    // ── Death score filter (usingcheckScoreFilter)
    const dsPassed = checkScoreFilter(deadEntity, config.deathScoreFilter, "victimScoreFilter", config.logToConsole, config.sendPlayersFailureMessages, killer);
    log(
      `[KillLog][${name}] DeathScoreFilter - filter=${JSON.stringify(config.deathScoreFilter)}, pass=${dsPassed}`
    );

     if (config.sendPlayersFailureMessages) {
    killer.sendMessage(
      `[KillLog][${name}] DeathScoreFilter - filter=${JSON.stringify(config.deathScoreFilter)}, pass=${dsPassed}`
    );
    }

    if (!dsPassed) continue;

// — Victim Entity Type Filter —

const rawTypes = Array.isArray(config.victimEntityType)
? config.victimEntityType
: [];
const excludedTypes = rawTypes
.filter(t => t.startsWith("!"))
.map(t => t.slice(1));
const includedTypes = rawTypes.filter(t => !t.startsWith("!"));


// 1) Exclusion pass: if any excluded type matches, skip
if (excludedTypes.length > 0) {
const isExcluded = excludedTypes.includes(deadEntity.typeId);
log(
  `[KillLog][${name}] VictimTypeFilter - excluded=[${excludedTypes.join(",")}], ` +
  `victim=${deadEntity.typeId}, excludeHit=${isExcluded}`
);

if (config.sendPlayersFailureMessages) {
  killer.sendMessage(`[Kill-Debug[${name}] VictimTypeFilter - excluded=[${excludedTypes.join(",")}] victim=${deadEntity.typeId}, excludeHit=${isExcluded}`);
}
  if (isExcluded) continue;
}

// 2) Inclusion pass: if you have no includes, auto-pass; otherwise require a match
let typePassed;
if (includedTypes.length === 0) {
typePassed = true;
log(`[KillLog][${name}] VictimTypeFilter - no includes configured, pass`);
} else {
typePassed = includedTypes.includes(deadEntity.typeId);
log(
  `[KillLog][${name}] VictimTypeFilter - includes=[${includedTypes.join(",")}], ` +
  `victim=${deadEntity.typeId}, pass=${typePassed}`
);
}
if (config.sendPlayersFailureMessages) {
  killer.sendMessage (`[Kill-Debug][${name}] VictimTypeFilter - includes=[${includedTypes.join(",")}], victim=${deadEntity.typeId}, pass=${typePassed}`)
}
if (!typePassed) continue;


    // ── Victim family filter
    let familyPassed = false;
const rawFams = Array.isArray(config.victimEntityFamily)
  ? config.victimEntityFamily
  : [config.victimEntityFamily];

// split out excluded vs included
const excludedFams = rawFams
  .filter(f => f.startsWith("!"))
  .map(f => f.slice(1));
const includedFams = rawFams.filter(f => !f.startsWith("!"));

const famComp = deadEntity.getComponent("minecraft:type_family");
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
    `[KillLog][${name}] FamilyFilter - excluded=[${excludedFams.join(",")}], ` +
    `engine=[${engineFams.join(",")}], excludeHit=${hit}`
  );
  if (config.sendPlayersFailureMessages) {
    killer.sendMessage(`[Kill-Debug][${name}] FamilyFilter - excluded=[${excludedFams.join(",")}], engine=[${engineFams.join(",")}], excludeHit=${hit}`)
  }
  if (hit) continue;  // skip this counter
}

// 2) inclusion check
if (includedFams.length === 0) {
  familyPassed = true;
  log(`[KillLog][${name}] FamilyFilter - no includes configured, pass`);
} else if (famComp && killer.typeId === "minecraft:player") {
  // see if any of the engine families match an include
  familyPassed = includedFams.some(inc => 
    typeof famComp.hasTypeFamily === "function"
      ? famComp.hasTypeFamily(inc)
      : engineFams.includes(inc)
  );
  log(
    `[KillLog][${name}] FamilyFilter - required=[${includedFams.join(",")}], ` +
    `engine=[${engineFams.join(",")}], pass=${familyPassed}`
  );
if (config.sendPlayersFailureMessages) {
killer.sendMessage(`[Kill-Debug][${name}] FamilyFilter - required=[${includedFams.join(",")}], engine=[${engineFams.join(",")}], pass=${familyPassed}`
  );
}
  
} else {
  // no family component or killer isn’t player → skip family filtering
  familyPassed = true;
  log(`[KillLog][${name}] FamilyFilter - skipped (no type_family or killer invalid)`);
  if (config.sendPlayersFailureMessages) {
killer.sendMessage(`[Kill-Debug][${name}] FamilyFilter - skipped (no type_family or killer invalid)`);
}
}

if (!familyPassed) continue;

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
      if (config.sendPlayersFailureMessages) {
        killer.sendMessage(
          `[Kill-Debug:${name}] failed: item filter set but no item held`
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
        killer.sendMessage(
          `[Kill-Debug:${name}] failed: held item excluded (${itemId})`
        );
      }
      continue;
    }
    // 5) include‐list check (only if includes exist)
    if (includeItems.length > 0 && !includeItems.includes(itemId)) {
      if (config.sendPlayersFailureMessages) {
        killer.sendMessage(
          `[Kill-Debug:${name}] failed: held item not in include list (${itemId})`
        );
      }
      continue;
    }
  }


    // ── Victim death tag filter (include/exclude "!" support)
    const deadActual = deadEntity.getTags();
    const rawD = config.deathTagFilter || [];
    const includeD = rawD.map(t => t.trim()).filter(t => t && !t.startsWith("!"));
    const excludeD = rawD.map(t => t.trim()).filter(t => t.startsWith("!")).map(t => t.slice(1));
    const deathTagPassed =
      !excludeD.some(tag => deadActual.includes(tag)) &&
      (includeD.length === 0 || includeD.some(tag => deadActual.includes(tag)));
    log(
      `[KillLog][${name}] DeathTagFilter - include=[${includeD.join(",")}], ` +
      `exclude=[${excludeD.join(",")}], actual=[${deadActual.join(",")}], pass=${deathTagPassed}`
    );
     if (config.sendPlayersFailureMessages) {
killer.sendMessage(
      `[KillLog][${name}] DeathTagFilter - include=[${includeD.join(",")}], exclude=[${excludeD.join(",")}], actual=[${deadActual.join(",")}], pass=${deathTagPassed}`);
}
    if (!deathTagPassed) continue;


//Kill location filter

if (config.killLocationEnabled) {
  // 1) grab the dead entity’s position
  let pos;
  if (typeof killer.location === "object") {
    pos = killer.location;
  } else {
    const posComp = killer.getComponent("minecraft:position");
    pos = posComp?.location;
  }

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
        `[Kills-Debug:${name}] Kill Location FAIL at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}); allowed [${allowed}]`
      );
    }
    log(`[Kills-Debug:${name}] Kill Location FAIL at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}); allowed [${allowed}]`);
    continue; // don’t count this death
  }

  // 6) optional “pass” debug
  if (config.sendPlayersFailureMessages) {
    killer.sendMessage(
      `[Kills-Debug:${name}] Kill Location PASS at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}); allowed [${allowed}]`
    );
    
  }
  log (`[Kills-Debug:${name}] Kill Location PASS at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}); allowed [${allowed}]`);
}







//FULL PASS

if (config.killerCommand?.trim()) {
  // replace placeholders if you want:
  const cmd = config.killerCommand
    .replace('{killer}', killer.name)
    .replace('{victim}', deadEntity.name);
  killer.runCommand(cmd);
}


    // ── Random value
    const { min, max } = config.incrementScore.amount;
    const value = randomInRange(min, max);
    log(`[KillLog][${name}] randomInRange - value=${value} from (${min}-${max})`);
   if (config.sendPlayersFailureMessages) {
killer.sendMessage(`[Kill-Debug][${name}] Score to be incrimented - value=${value} from (${min}-${max})`);   }

    // ── Apply score & messaging (now using applyDeltaSafely helper)
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
        if (config.sendPlayersFailureMessages) {
        killer.sendMessage(`[Kill-Debug][${name}] Error Objective '${objId}' missing, skip`);  }
        log(`[KillLog][${name}] Error Objective '${objId}' missing, skip`);
        continue;
      }

      // safely apply the delta (handles mode & allowNegative internally)
      applyDeltaSafely(objective, killer, {
        amount:        config.incrementScore.amount,
        mode:          config.incrementScore.mode,
        allowNegative: config.incrementScore.allowNegative
      })
      const after = objective.getScore(killer)
      log(
        `[KillLog][${name}] applyDeltaSafely - ` +
        `objective=${objId}, delta=${value}, ` +
        `mode=${config.incrementScore.mode}, allowNegative=${config.incrementScore.allowNegative}`
      );

      if (config.sendPlayersFailureMessages) {
        killer.sendMessage(`[Kill-Debug][${name}] Apply Score - objective=${objId}, delta=${value}, mode=${config.incrementScore.mode}, allowNegative=${config.incrementScore.allowNegative}`)}
     
     //Action Bar Display Toggle
     if (config.actionBarEnabled) {
      const ids = Array.isArray(config.objectiveName)
        ? config.objectiveName
        : [config.objectiveName];
      const names = Array.isArray(config.displayName)
        ? config.displayName
        : [config.displayName];
       const actionBarFormatCode = config.actionBarFormatCode
      showSingleActionBar(killer, ids, names, value, config.incrementScore.mode, actionBarFormatCode);
    }
      if (config.sendPlayersMessages) {
        const verb = config.incrementScore.mode === "add" ? "added to" : "removed from";
        log(
          `[KillLog][${name}] Sending message - You killed ${deadEntity.typeId}, ` +
          `${value} point${value===1?"":"s"} ${verb} "${disp}"`
        );
        killer.sendMessage(
          `You killed ${deadEntity.typeId}, and ${value} point${value===1?"":"s"} ` +
          `${verb} "${disp}"!`
        );
      }
      const verb = config.incrementScore.mode === "add" ? "added to" : "removed from";
  
      if (config.logToMenu) {
      if (deadEntity.typeId !== "minecraft:player"){
      const hasNameTag = typeof deadEntity.nameTag === "string" && deadEntity.nameTag.length > 0;
      if (hasNameTag) {
        addLog(`§5[KillCounter: ${name}]§r ${killer.name} killed ${deadEntity.typeId} named "${deadEntity.nameTag}" at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) in in ${dimId} and ${value} ${verb} "${disp}" now ${after}`);
      }
      if (!hasNameTag) {
        addLog(`§5[KillCounter: ${name}]§r ${killer.name} killed ${deadEntity.typeId} at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) in ${dimId} and ${value} ${verb} "${disp}" now ${after}`);
      }
      }
      if (deadEntity.typeId === "minecraft:player") {
        addLog(`§5[KillCounter: ${name}]§r ${killer.name} killed ${deadEntity.name} at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) in ${dimId} and ${value} ${verb} "${disp}" now ${after}`);
      }
    }
      if (config.sendPlayersFailureMessages) {
        killer.sendMessage(`[Kill-Debug:${name}]§aFULL-PASS§r ${killer.name} killed ${deadEntity.typeId} named "${deadEntity.nameTag}" at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) in ${dimId} and ${value} ${verb} objective:"${objId}" display dummy:"${disp}" now ${after}`);}
     
    }
  }
});


//----------------------------------------------------------------------------------------------------
