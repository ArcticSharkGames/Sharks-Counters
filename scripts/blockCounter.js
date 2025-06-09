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

///--------------- BLOCK COUNTER MEMORY AND CONFIGS ----------------
const BLOCKS_PREFIX = "blocksCounter:";

export const defaultBlockCounterConfig = {
  enabled: true,
  actionBarEnabled: true,
  blockBreakEnabled: false,
  blockPlaceEnabled: false,
  // toggles whether position-based filtering is applied
  blockPositionEnabled: false,
  // filter on player tags (include/exclude syntax with !)
  playerTagFilter: [],
  // filter on player scores: objective name and range
  playerScoreFilter: { objective: "none", min: 1, max: 1 },
  objectiveName: [],
  displayName: [],
  BlockType: [],
  blockLocation: {
    x: { min: -100, max: 100 },
    y: { min: -100, max: 100 },
    z: { min: -100, max: 100 },
  },
  itemType: [],
  logToMenu: false,
  logToConsole: false,
  sendPlayersMessages: true,
  sendPlayersFailureMessages: false,
  incrementScore: {
    amount: { min: 1, max: 1 },
    mode: "add",
    allowNegative: false,
  },
  actionBarFormatCode: "r",
  playerCommand:"",
  replaceBrokenBlock: false,
  removePlacedBlock: false,
  dimensionFilter: ["overworld", "nether", "the_end"],
  displayType: ["none"],
};

export let blockCounters = {};

/**
 * Save a block-counter config both to dynamic properties and in-memory
 */
export function saveBlockCounter(counterName, config) {
  try {
    const raw = JSON.stringify(config);
    world.setDynamicProperty(BLOCKS_PREFIX + counterName, raw);
    blockCounters[counterName] = config;
  } catch (e) {
    console.error(`[Save] Failed to save Block Counter '${counterName}':`, e);
  }
}

/**
 * Load all block-counter configs from dynamic properties into memory
 */
export function loadBlockCounters() {
  try {
    const allKeys = world.getDynamicPropertyIds();
    for (const key of allKeys) {
      if (!key.startsWith(BLOCKS_PREFIX)) continue;
      const counterName = key.slice(BLOCKS_PREFIX.length);
      const raw = world.getDynamicProperty(key);
      try {
        const parsed = JSON.parse(raw);

        // Merge incrementScore
        const incrementScore = {
          ...defaultBlockCounterConfig.incrementScore,
          ...parsed.incrementScore,
          allowNegative:
            parsed.incrementScore?.allowNegative ??
            defaultBlockCounterConfig.incrementScore.allowNegative,
        };

        // Merge blockLocation per axis
        const defaultLoc = defaultBlockCounterConfig.blockLocation;
        const parsedLoc = parsed.blockLocation || {};
        const blockLocation = {
          x: {
            min: parsedLoc.x?.min ?? defaultLoc.x.min,
            max: parsedLoc.x?.max ?? defaultLoc.x.max,
          },
          y: {
            min: parsedLoc.y?.min ?? defaultLoc.y.min,
            max: parsedLoc.y?.max ?? defaultLoc.y.max,
          },
          z: {
            min: parsedLoc.z?.min ?? defaultLoc.z.min,
            max: parsedLoc.z?.max ?? defaultLoc.z.max,
          },
        };

        // Ensure arrays and objects for filters and names
        const playerTagFilterList = Array.isArray(parsed.playerTagFilter)
          ? parsed.playerTagFilter
          : defaultBlockCounterConfig.playerTagFilter;
        const scoreObj = parsed.playerScoreFilter || {};
        const playerScoreFilter = {
          objective:
            scoreObj.objective ?? defaultBlockCounterConfig.playerScoreFilter.objective,
          min: scoreObj.min ?? defaultBlockCounterConfig.playerScoreFilter.min,
          max: scoreObj.max ?? defaultBlockCounterConfig.playerScoreFilter.max,
        };
        const objectiveName = Array.isArray(parsed.objectiveName)
          ? parsed.objectiveName
          : defaultBlockCounterConfig.objectiveName;
        const displayName = Array.isArray(parsed.displayName)
          ? parsed.displayName
          : defaultBlockCounterConfig.displayName;
        const BlockTypeList = Array.isArray(parsed.BlockType)
          ? parsed.BlockType
          : defaultBlockCounterConfig.BlockType;
        const itemTypeList = Array.isArray(parsed.itemType)
          ? parsed.itemType
          : defaultBlockCounterConfig.itemType;
        const displayTypeList = Array.isArray(parsed.displayType)
          ? parsed.displayType
          : defaultBlockCounterConfig.displayType;

        // Top-level flags and filters with fallbacks
        const enabled = parsed.enabled ?? defaultBlockCounterConfig.enabled;
        const actionBarEnabled =
          parsed.actionBarEnabled ?? defaultBlockCounterConfig.actionBarEnabled;
        const blockBreakEnabled =
          parsed.blockBreakEnabled ?? defaultBlockCounterConfig.blockBreakEnabled;
        const blockPlaceEnabled =
          parsed.blockPlaceEnabled ?? defaultBlockCounterConfig.blockPlaceEnabled;
        const blockPositionEnabled =
          parsed.blockPositionEnabled ?? defaultBlockCounterConfig.blockPositionEnabled;
        const logToMenu = parsed.logToMenu ?? defaultBlockCounterConfig.logToMenu;
        const logToConsole =
          parsed.logToConsole ?? defaultBlockCounterConfig.logToConsole;
        const sendPlayersMessages =
          parsed.sendPlayersMessages ?? defaultBlockCounterConfig.sendPlayersMessages;
        const sendPlayersFailureMessages =
          parsed.sendPlayersFailureMessages ?? defaultBlockCounterConfig.sendPlayersFailureMessages;
        const actionBarFormatCode =
         parsed.actionBarFormatCode ?? defaultBlockCounterConfig.actionBarFormatCode;
        const playerCommand = parsed.playerCommand ?? defaultBlockCounterConfig.playerCommand;
        const replaceBrokenBlock =
          parsed.replaceBrokenBlock ?? defaultBlockCounterConfig.replaceBrokenBlock;
        const removePlacedBlock =
          parsed.removePlacedBlock ?? defaultBlockCounterConfig.removePlacedBlock;
        const dimensionFilter = Array.isArray(parsed.dimensionFilter)
          ? parsed.dimensionFilter
          : defaultBlockCounterConfig.dimensionFilter;

        blockCounters[counterName] = {
          ...defaultBlockCounterConfig,
          ...parsed,
          incrementScore,
          blockLocation,
          playerTagFilter: playerTagFilterList,
          playerScoreFilter,
          objectiveName,
          displayName,
          BlockType: BlockTypeList,
          itemType: itemTypeList,
          displayType: displayTypeList,
          enabled,
          actionBarEnabled,
          blockBreakEnabled,
          blockPlaceEnabled,
          blockPositionEnabled,
          logToMenu,
          logToConsole,
          sendPlayersMessages,
          sendPlayersFailureMessages,
          actionBarFormatCode,
          playerCommand,
          replaceBrokenBlock,
          removePlacedBlock,
          dimensionFilter,
          type: "block"
        };
      } catch (e) {
        console.warn(
          `[Load] Failed to parse Block Counter config for '${counterName}':`,
          e
        );
      }
    }
  } catch (e) {
    console.error("[Load] Failed to load Block counters:", e);
  }
}

/**
 * Delete a block-counter both from dynamic properties and memory
 */
export function deleteBlockCounter(counterName) {
  try {
    world.setDynamicProperty(BLOCKS_PREFIX + counterName, undefined);
    delete blockCounters[counterName];
  } catch (e) {
    console.error(
      `[Delete] Failed to delete Block Counter '${counterName}':`,
      e
    );
  }
}



//-----------------SHOW/EDIT BLOCK COUNTER MENU------------------

export function showConfigureBrokenBlockCounterForm(player, name) {
  const rawConfig = blockCounters[name] || {};
  const config = {
    ...defaultBlockCounterConfig,
    ...rawConfig,
    incrementScore: {
      ...defaultBlockCounterConfig.incrementScore,
      ...rawConfig.incrementScore,
    },
    blockBreakEnabled: rawConfig.blockBreakEnabled ?? defaultBlockCounterConfig.blockBreakEnabled,
    blockPlaceEnabled: rawConfig.blockPlaceEnabled ?? defaultBlockCounterConfig.blockPlaceEnabled,
    blockTypeFilter: rawConfig.blockTypeFilter ?? defaultBlockCounterConfig.blockTypeFilter,
    blockLocationEnabled: rawConfig.blockLocationEnabled ?? defaultBlockCounterConfig.blockLocationEnabled,
    blockLocation: rawConfig.blockLocation ?? defaultBlockCounterConfig.blockLocation,
    playerTagFilter: rawConfig.playerTagFilter ?? defaultBlockCounterConfig.playerTagFilter,
    playerScoreFilter: rawConfig.playerScoreFilter ?? defaultBlockCounterConfig.playerScoreFilter,
    requiredItemFilter: rawConfig.requiredItemFilter ?? defaultBlockCounterConfig.requiredItemFilter,
    logToConsole: rawConfig.logToConsole ?? defaultBlockCounterConfig.logToConsole,
    sendPlayersMessages: rawConfig.sendPlayersMessages ?? defaultBlockCounterConfig.sendPlayersMessages,
    sendPlayersFailureMessages: rawConfig.sendPlayersFailureMessages ?? defaultBlockCounterConfig.sendPlayersFailureMessages,
    logToMenu: rawConfig.logToMenu ?? defaultBlockCounterConfig.logToMenu,
    actionBarFormatCode: rawConfig.actionBarFormatCode ?? defaultBlockCounterConfig.actionBarFormatCode,
    playerCommand: rawConfig.playerCommand ?? defaultBlockCounterConfig.playerCommand,
    replaceBrokenBlock: rawConfig.replaceBrokenBlock ?? defaultBlockCounterConfig.replaceBrokenBlock,
    removePlacedBlock: rawConfig.removePlacedBlock ?? defaultBlockCounterConfig.removePlacedBlock
    
  };

  // helper to stringify an axis range
  const fmtAxis = ax =>
    ax.min === ax.max ? `${ax.min}` : `${ax.min}..${ax.max}`;

  // allow "!" exclusions and range syntax
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
    enabled: config.enabled,
    actionBarEnabled: config.actionBarEnabled,
    actionBarFormatCode: String(config.actionBarFormatCode ?? "r"),
    breakEnabled: config.blockBreakEnabled,
    placeEnabled: config.blockPlaceEnabled,
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
    blockTypes: Array.isArray(config.blockTypeFilter)
      ? config.blockTypeFilter.join(", ")
      : "",
    locationEnabled: Boolean(config.blockLocationEnabled),
    blockLocation: [
      fmtAxis(config.blockLocation.x),
      fmtAxis(config.blockLocation.y),
      fmtAxis(config.blockLocation.z),
    ].join(", "),
    playerTags: Array.isArray(config.playerTagFilter)
      ? config.playerTagFilter.join(", ")
      : "",
    playerScoreObj: Array.isArray(config.playerScoreFilter.objective)
      ? config.playerScoreFilter.objective.join(", ")
      : "",
    playerScoreRange: formatRange(config.playerScoreFilter),
    requiredItems: Array.isArray(config.requiredItemFilter)
      ? config.requiredItemFilter.join(", ")
      : "",
    playerCommand: String(config.playerCommand ?? ""),
    logToConsole: config.logToConsole,
    sendPlayersMessages: config.sendPlayersMessages,
    sendPlayersFailureMessages: config.sendPlayersFailureMessages,
    logToMenu: config.logToMenu,
    replaceBrokenBlock: config.replaceBrokenBlock,
    removePlacedBlock: config.removePlacedBlock
  };

  const form = new ModalFormData()
    .title(`Configure Broken Block Counter: ${name}`)
    .toggle("Counter Enabled", initial.enabled)
    .toggle("Action Bar Enabled", initial.actionBarEnabled)
    .textField("Action Bar Format Code", "a–u or 0–9", initial.actionBarFormatCode)
    .textField("Score Objective(s)", "e.g. broken_blocks,broken_stone", initial.objectiveName)
    .textField("Score Display Name(s)", "e.g. Broken Blocks,Broken Stone", initial.displayName)
    .textField("Player Score Amount", "(e.g. 1 or 1..5)", initial.incrementAmount)
    .dropdown("Score Mode", ["Add Score", "Remove Score"], initial.removeMode ? 1 : 0)
    .toggle("Allow Negative Numbers", initial.allowNegative)
    .textField('Execute Command as Player (e.g /give @s diamond 1 0)', '', initial.playerCommand)
    .textField("Block Type Filters", "e.g. minecraft:dirt,!minecraft:stone", initial.blockTypes)
    .toggle("Block Location Enabled", initial.locationEnabled)
    .textField("Block Location (x, y, z) or a range (x..x, y..y, z..z)", "e.g. -5..5,60..70,!100..100", initial.blockLocation)
    .textField("Player Required Tags","e.g. blockBreaker,!notAllowed", initial.playerTags)
    .textField("Player Required Score Objectives", "e.g. blocksBroken,cobblestoneMined", initial.playerScoreObj)
    .textField("Player Required Score Range", "e.g. 1 or 1..10 or !1", initial.playerScoreRange)
    .textField("Required Items", "e.g. minecraft:diamond_pickaxe,!minecraft:stone_pickaxe", initial.requiredItems)
    .toggle("Debug Log To Console", initial.logToConsole)
    .toggle("Send Players Messages", initial.sendPlayersMessages)
    .toggle("Send Players Debug Messages", initial.sendPlayersFailureMessages)
    .toggle("Log To Menu", initial.logToMenu)
    .toggle("Replace Broken Block", initial.replaceBrokenBlock)

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
      playerCommandRaw,
      blockTypesRaw,
      locationEnabledRaw,
      blockLocationRaw,
      playerTagsRaw,
      playerScoreObjRaw,
      playerScoreRangeRaw,
      requiredItemsRaw,
      logRaw,
      sendMsgRaw,
      sendMsgFailureRaw,
      menuLogRaw,
      replaceBrokenBlockRaw,
    ] = response.formValues;

    // validate format code (single a–u or 0–9)
    const rawCode = String(actionBarFormatCodeRaw).trim();
    const actionBarFormatCode = /^[a-u0-9]$/.test(rawCode)
      ? rawCode
      : defaultBlockCounterConfig.actionBarFormatCode;

    const objectiveArr = objectiveRaw.trim()
      ? filterNone(sanitizeList(objectiveRaw))
      : defaultBlockCounterConfig.objectiveName;
    const displayArr = displayRaw.trim()
      ? sanitizeList(displayRaw, true)
      : defaultBlockCounterConfig.displayName;
    const incrementAmt = incrementRaw.trim()
      ? parseRangeInput(incrementRaw.trim())
      : defaultBlockCounterConfig.incrementScore.amount;
    const mode = scoreModeIndex === 1 ? "remove" : "add";
    const allowNeg = Boolean(allowNegRaw);

    const blockTypes = blockTypesRaw.trim()
      ? filterNone(sanitizeList(blockTypesRaw))
      : defaultBlockCounterConfig.blockTypeFilter;

    const locationEnabled = Boolean(locationEnabledRaw);
    let blockLoc = defaultBlockCounterConfig.blockLocation;
    if (locationEnabled && blockLocationRaw.trim()) {
      const [rx, ry, rz] = blockLocationRaw.split(",").map(s => s.trim());
      const parsedX = parseRangeInput(rx);
      const parsedY = parseRangeInput(ry);
      const parsedZ = parseRangeInput(rz);
      blockLoc = { x: parsedX, y: parsedY, z: parsedZ };
    }

    const playerTags = playerTagsRaw.trim()
      ? filterNone(sanitizeList(playerTagsRaw))
      : defaultBlockCounterConfig.playerTagFilter;
    const playerScoreObjs = playerScoreObjRaw.trim()
      ? filterNone(sanitizeList(playerScoreObjRaw))
      : defaultBlockCounterConfig.playerScoreFilter.objective;
    const playerScoreRange = playerScoreRangeRaw.trim()
      ? parseRangeInput(playerScoreRangeRaw.trim())
      : defaultBlockCounterConfig.playerScoreFilter;
    const requiredItems = requiredItemsRaw.trim()
      ? filterNone(sanitizeList(requiredItemsRaw))
      : defaultBlockCounterConfig.requiredItemFilter;
    const playerCommand = String(playerCommandRaw).trim();

    const logToConsole = Boolean(logRaw);
    const sendPlayersMessages = Boolean(sendMsgRaw);
    const sendPlayersFailureMessages = Boolean(sendMsgFailureRaw);
    const logToMenu = Boolean(menuLogRaw);
    const replaceBrokenBlock = Boolean(replaceBrokenBlockRaw);
    

    const configToSave = {
      enabled,
      actionBarEnabled,
      actionBarFormatCode,
      blockBreakEnabled: config.blockBreakEnabled,
      blockPlaceEnabled: config.blockPlaceEnabled,
      objectiveName: objectiveArr,
      displayName: displayArr,
      incrementScore: { amount: incrementAmt, mode, allowNegative: allowNeg },
      playerCommand,
      blockTypeFilter: blockTypes,
      blockLocationEnabled: locationEnabled,
      blockLocation: blockLoc,
      playerTagFilter: playerTags,
      playerScoreFilter: {
        objective: playerScoreObjs,
        min: playerScoreRange.min,
        max: playerScoreRange.max,
        exclude: playerScoreRange.exclude,
      },
      requiredItemFilter: requiredItems,
      logToConsole,
      sendPlayersMessages,
      sendPlayersFailureMessages,
      logToMenu,
      replaceBrokenBlock,
      removePlacedBlock: config.removePlacedBlock,
      dimensionFilter: config.dimensionFilter,
      type: "block",
    };

    // confirmation dialog
    const df = v => (Array.isArray(v) && v.length ? v.join(", ") : "None");
    const incVal = configToSave.incrementScore.amount;
    const incDisplay = incVal.min === incVal.max ? `${incVal.min}` : `${incVal.min}..${incVal.max}`;
    const fmt = formatRange;
    const confirm = new MessageFormData()
      .title("Confirm Broken Block Counter Setup")
      .body(
        `Name: ${name}\n` +
        `Counter Enabled: ${configToSave.enabled}\n` +
        `Action Bar Enabled: ${configToSave.actionBarEnabled}\n` +
        `Action Bar Format Code: ${configToSave.actionBarFormatCode}\n` +
        `Score Objective(s): ${df(configToSave.objectiveName)}\n` +
        `Score Display Name(s): ${df(configToSave.displayName)}\n` +
        `Score Increment: ${incDisplay} (${configToSave.incrementScore.mode})\n` +
        `Player Command: ${playerCommand || "None"}\n` +
        `Allow Negative Numbers: ${configToSave.incrementScore.allowNegative}\n` +
        `Block Types: ${df(configToSave.blockTypeFilter)}\n` +
        `Block Location Enabled: ${configToSave.blockLocationEnabled}\n` +
        `Block Location: ${fmt(blockLoc.x)}, ${fmt(blockLoc.y)}, ${fmt(blockLoc.z)}\n` +
        `Player Required Tags: ${df(configToSave.playerTagFilter)}\n` +
        `Player Required Score Obj: ${df(configToSave.playerScoreFilter.objective)}\n` +
        `Player Required Score Range: ${fmt(configToSave.playerScoreFilter)}\n` +
        `Required Items: ${df(configToSave.requiredItemFilter)}\n` +
        `Debug Log To Console: ${configToSave.logToConsole}\n` +
        `Send Players Messages: ${configToSave.sendPlayersMessages}\n` +
        `Send Players Debug Messages: ${configToSave.sendPlayersFailureMessages}\n` +
        `Log To Menu: ${configToSave.logToMenu}` +
        `Replace Broken Block: ${configToSave.replaceBrokenBlock}`

      )
      .button1("Confirm")
      .button2("Edit");

    confirm.show(player).then(result => {
      if (result.canceled || result.selection === 1) {
        showConfigureBrokenBlockCounterForm(player, name);
        return;
      }
      saveBlockCounter(name, configToSave);
      player.sendMessage(`Broken Block Counter '${name}' saved.`);
      addLog(`§a[Add/Edit]§r ${player.name} Managed A Broken Block Counter named ${name}`);
      manageAllCountersMenu(player);
    });
    
  });
}

//--------------------------------------------------------------------------


//-----------------------Show Blocks Placed Form ---------------------------

export function showConfigurePlacedBlockCounterForm(player, name) {
  const rawConfig = blockCounters[name] || {};
  const config = {
    ...defaultBlockCounterConfig,
    ...rawConfig,
    incrementScore: {
      ...defaultBlockCounterConfig.incrementScore,
      ...rawConfig.incrementScore,
    },
    blockBreakEnabled: rawConfig.blockBreakEnabled ?? defaultBlockCounterConfig.blockBreakEnabled,
    blockPlaceEnabled: rawConfig.blockPlaceEnabled ?? defaultBlockCounterConfig.blockPlaceEnabled,
    blockTypeFilter: rawConfig.blockTypeFilter ?? defaultBlockCounterConfig.blockTypeFilter,
    blockLocationEnabled: rawConfig.blockLocationEnabled ?? defaultBlockCounterConfig.blockLocationEnabled,
    blockLocation: rawConfig.blockLocation ?? defaultBlockCounterConfig.blockLocation,
    playerTagFilter: rawConfig.playerTagFilter ?? defaultBlockCounterConfig.playerTagFilter,
    playerScoreFilter: rawConfig.playerScoreFilter ?? defaultBlockCounterConfig.playerScoreFilter,
    requiredItemFilter: rawConfig.requiredItemFilter ?? defaultBlockCounterConfig.requiredItemFilter,
    logToConsole: rawConfig.logToConsole ?? defaultBlockCounterConfig.logToConsole,
    sendPlayersMessages: rawConfig.sendPlayersMessages ?? defaultBlockCounterConfig.sendPlayersMessages,
    sendPlayersFailureMessages: rawConfig.sendPlayersFailureMessages ?? defaultBlockCounterConfig.sendPlayersFailureMessages,
    logToMenu: rawConfig.logToMenu ?? defaultBlockCounterConfig.logToMenu,
    actionBarFormatCode: rawConfig.actionBarFormatCode ?? defaultBlockCounterConfig.actionBarFormatCode,
    playerCommand: rawConfig.playerCommand ?? defaultBlockCounterConfig.playerCommand,
    replaceBrokenBlock: rawConfig.replaceBrokenBlock ?? defaultBlockCounterConfig.replaceBrokenBlock,
    removePlacedBlock: rawConfig.removePlacedBlock ?? defaultBlockCounterConfig.removePlacedBlock
    
  };

  // helper to stringify an axis range
  const fmtAxis = ax =>
    ax.min === ax.max ? `${ax.min}` : `${ax.min}..${ax.max}`;

  // allow "!" exclusions and range syntax
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
    enabled: config.enabled,
    actionBarEnabled: config.actionBarEnabled,
    actionBarFormatCode: String(config.actionBarFormatCode ?? "r"),
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
    blockTypes: Array.isArray(config.blockTypeFilter)
      ? config.blockTypeFilter.join(", ")
      : "",
    locationEnabled: Boolean(config.blockLocationEnabled),
    blockLocation: [
      fmtAxis(config.blockLocation.x),
      fmtAxis(config.blockLocation.y),
      fmtAxis(config.blockLocation.z),
    ].join(", "),
    playerTags: Array.isArray(config.playerTagFilter)
      ? config.playerTagFilter.join(", ")
      : "",
    playerScoreObj: Array.isArray(config.playerScoreFilter.objective)
      ? config.playerScoreFilter.objective.join(", ")
      : "",
    playerScoreRange: formatRange(config.playerScoreFilter),
    requiredItems: Array.isArray(config.requiredItemFilter)
      ? config.requiredItemFilter.join(", ")
      : "",
    playerCommand: String(config.playerCommand ?? ""),
    logToConsole: config.logToConsole,
    sendPlayersMessages: config.sendPlayersMessages,
    sendPlayersFailureMessages: config.sendPlayersFailureMessages,
    logToMenu: config.logToMenu,
    removePlacedBlock: config.removePlacedBlock
  };

  const form = new ModalFormData()
    .title(`Configure Placed Block Counter: ${name}`)
    .toggle("Counter Enabled", initial.enabled)
    .toggle("Action Bar Enabled", initial.actionBarEnabled)
    .textField("Action Bar Format Code", "a–u or 0–9", initial.actionBarFormatCode)
    .textField("Score Objective(s)", "e.g. placed_blocks,placed_stone", initial.objectiveName)
    .textField("Score Display Name(s)", "e.g. Placed Blocks,Placed Stone", initial.displayName)
    .textField("Player Score Amount", "(e.g. 1 or 1..5)", initial.incrementAmount)
    .dropdown("Score Mode", ["Add Score", "Remove Score"], initial.removeMode ? 1 : 0)
    .toggle("Allow Negative Numbers", initial.allowNegative)
    .textField('Execute Command as Player (e.g /give @s diamond 1 0)', '', initial.playerCommand)
    .textField("Block Type Filters", "e.g. minecraft:dirt,!minecraft:stone", initial.blockTypes)
    .toggle("Block Location Enabled", initial.locationEnabled)
    .textField("Block Location (x, y, z) or a range (x..x, y..y, z..z)", "e.g. -5..5,60..70,!100..100", initial.blockLocation)
    .textField("Player Required Tags","e.g. blockBreaker,!notAllowed", initial.playerTags)
    .textField("Player Required Score Objectives", "e.g. blocksBroken,cobblestoneMined", initial.playerScoreObj)
    .textField("Player Required Score Range", "e.g. 1 or 1..10 or !1", initial.playerScoreRange)
    .toggle("Debug Log To Console", initial.logToConsole)
    .toggle("Send Players Messages", initial.sendPlayersMessages)
    .toggle("Send Players Debug Messages", initial.sendPlayersFailureMessages)
    .toggle("Log To Menu", initial.logToMenu)
    .toggle("Remove Placed Block", initial.removePlacedBlock);

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
      playerCommandRaw,
      blockTypesRaw,
      locationEnabledRaw,
      blockLocationRaw,
      playerTagsRaw,
      playerScoreObjRaw,
      playerScoreRangeRaw,
      logRaw,
      sendMsgRaw,
      sendMsgFailureRaw,
      menuLogRaw,
      removePlacedBlockRaw,
    ] = response.formValues;

    // validate format code (single a–u or 0–9)
    const rawCode = String(actionBarFormatCodeRaw).trim();
    const actionBarFormatCode = /^[a-u0-9]$/.test(rawCode)
      ? rawCode
      : defaultBlockCounterConfig.actionBarFormatCode;

    const objectiveArr = objectiveRaw.trim()
      ? filterNone(sanitizeList(objectiveRaw))
      : defaultBlockCounterConfig.objectiveName;
    const displayArr = displayRaw.trim()
      ? sanitizeList(displayRaw, true)
      : defaultBlockCounterConfig.displayName;
    const incrementAmt = incrementRaw.trim()
      ? parseRangeInput(incrementRaw.trim())
      : defaultBlockCounterConfig.incrementScore.amount;
    const mode = scoreModeIndex === 1 ? "remove" : "add";
    const allowNeg = Boolean(allowNegRaw);

    const blockTypes = blockTypesRaw.trim()
      ? filterNone(sanitizeList(blockTypesRaw))
      : defaultBlockCounterConfig.blockTypeFilter;

    const locationEnabled = Boolean(locationEnabledRaw);
    let blockLoc = defaultBlockCounterConfig.blockLocation;
    if (locationEnabled && blockLocationRaw.trim()) {
      const [rx, ry, rz] = blockLocationRaw.split(",").map(s => s.trim());
      const parsedX = parseRangeInput(rx);
      const parsedY = parseRangeInput(ry);
      const parsedZ = parseRangeInput(rz);
      blockLoc = { x: parsedX, y: parsedY, z: parsedZ };
    }

    const playerTags = playerTagsRaw.trim()
      ? filterNone(sanitizeList(playerTagsRaw))
      : defaultBlockCounterConfig.playerTagFilter;
    const playerScoreObjs = playerScoreObjRaw.trim()
      ? filterNone(sanitizeList(playerScoreObjRaw))
      : defaultBlockCounterConfig.playerScoreFilter.objective;
    const playerScoreRange = playerScoreRangeRaw.trim()
      ? parseRangeInput(playerScoreRangeRaw.trim())
      : defaultBlockCounterConfig.playerScoreFilter;
    const playerCommand = String(playerCommandRaw).trim();

    const logToConsole = Boolean(logRaw);
    const sendPlayersMessages = Boolean(sendMsgRaw);
    const sendPlayersFailureMessages = Boolean(sendMsgFailureRaw);
    const logToMenu = Boolean(menuLogRaw);
    const removePlacedBlock = Boolean(removePlacedBlockRaw);

    const configToSave = {
      enabled,
      actionBarEnabled,
      actionBarFormatCode,
      objectiveName: objectiveArr,
      displayName: displayArr,
      incrementScore: { amount: incrementAmt, mode, allowNegative: allowNeg },
      playerCommand,
      blockTypeFilter: blockTypes,
      blockLocationEnabled: locationEnabled,
      blockLocation: blockLoc,
      playerTagFilter: playerTags,
      playerScoreFilter: {
        objective: playerScoreObjs,
        min: playerScoreRange.min,
        max: playerScoreRange.max,
        exclude: playerScoreRange.exclude,
      },
      requiredItemFilter: config.itemType,
      logToConsole,
      sendPlayersMessages,
      sendPlayersFailureMessages,
      logToMenu,
      removePlacedBlock,
      replaceBrokenBlock: config.replaceBrokenBlock,
      blockBreakEnabled: config.blockBreakEnabled,
      blockPlaceEnabled: config.blockPlaceEnabled,
      dimensionFilter: config.dimensionFilter,
      type: "block",
    };

    // confirmation dialog
    const df = v => (Array.isArray(v) && v.length ? v.join(", ") : "None");
    const incVal = configToSave.incrementScore.amount;
    const incDisplay = incVal.min === incVal.max ? `${incVal.min}` : `${incVal.min}..${incVal.max}`;
    const fmt = formatRange;
    const confirm = new MessageFormData()
      .title("Confirm Placed Block Counter Setup")
      .body(
        `Name: ${name}\n` +
        `Counter Enabled: ${configToSave.enabled}\n` +
        `Action Bar Enabled: ${configToSave.actionBarEnabled}\n` +
        `Action Bar Format Code: ${configToSave.actionBarFormatCode}\n` +
        `Score Objective(s): ${df(configToSave.objectiveName)}\n` +
        `Score Display Name(s): ${df(configToSave.displayName)}\n` +
        `Score Increment: ${incDisplay} (${configToSave.incrementScore.mode})\n` +
        `Player Command: ${playerCommand || "None"}\n` +
        `Allow Negative Numbers: ${configToSave.incrementScore.allowNegative}\n` +
        `Block Types: ${df(configToSave.blockTypeFilter)}\n` +
        `Block Location Enabled: ${configToSave.blockLocationEnabled}\n` +
        `Block Location: ${fmt(blockLoc.x)}, ${fmt(blockLoc.y)}, ${fmt(blockLoc.z)}\n` +
        `Player Required Tags: ${df(configToSave.playerTagFilter)}\n` +
        `Player Required Score Obj: ${df(configToSave.playerScoreFilter.objective)}\n` +
        `Player Required Score Range: ${fmt(configToSave.playerScoreFilter)}\n` +
        `Debug Log To Console: ${configToSave.logToConsole}\n` +
        `Send Players Messages: ${configToSave.sendPlayersMessages}\n` +
        `Send Players Debug Messages: ${configToSave.sendPlayersFailureMessages}\n` +
        `Log To Menu: ${configToSave.logToMenu}` +
        `Remove Placed Block: ${configToSave.removePlacedBlock}`

      )
      .button1("Confirm")
      .button2("Edit");

    confirm.show(player).then(result => {
      if (result.canceled || result.selection === 1) {
        showConfigurePlacedBlockCounterForm(player, name);
        return;
      }
      saveBlockCounter(name, configToSave);
      player.sendMessage(`Block Placed Counter '${name}' saved.`);
      addLog(`§a[Add/Edit]§r ${player.name} Managed A Block Placed Counter named ${name}`);
      manageAllCountersMenu(player);
    });
    
  });
}



//---------------------------------------------------------------------------


//------------------------------Blocks Broken Event------------------------


//----------------- RUNTIME: BLOCK BROKEN EVENT ------------------
world.afterEvents.playerBreakBlock.subscribe(event => {
    const player = event.player;
    if (!player) { if (config.sendPlayersFailureMessages) {
        player.sendMessage(`No Valid Player Object Was Found Retry`);
      } return };
    // Grab the real block state before it vanished
    const perm = event.brokenBlockPermutation;
    const brokenType = perm.type.id;
    const { x, y, z } = event.block.location;
  
    for (const [name, config] of Object.entries(blockCounters)) {
      //check if enabled
      if (!config.enabled) { if (config.sendPlayersFailureMessages) {
        player.sendMessage(`§2[Block-Debug:§r ${name}] is toggled to disabled -§cStop Processing`);
      } continue };

       if  (config.sendPlayersFailureMessages) {
        player.sendMessage(`§2[Block-Debug:§r ${name}] is toggled enabled- §aStart Processing`); 
      
          const flagStatuses = {
              "action bar toggle": config.actionBarEnabled,
              "blocks broken counter": config.blockBreakEnabled,
              "blocks placed counter": config.blockPlaceEnabled,
              "allow negative numbers": config.incrementScore.allowNegative,
              "send players messages": config.sendPlayersMessages,
              "send players debug messages": config.sendPlayersFailureMessages,
              "log to menu": config.logToMenu,
              "log to console": config.logToConsole,
              "replace broken blocks": config.replaceBrokenBlock,
              "remove placed blocks": config.removePlacedBlock
                               };

  const lines = Object.entries(flagStatuses)
    .map(
      ([label, enabled]) =>
        `${label} - ${enabled ? "enabled" : "disabled"}`
    );

  player.sendMessage(lines.join("\n"));}



  
      // shorthand logger
      const log = (...args) => {
        if (config.logToConsole) console.log(`[BlockCounter:${name}]`, ...args);
      };
  
      // only if break-watching is on
      if (!config.blockBreakEnabled) { if (config.sendPlayersFailureMessages) {
        player.sendMessage(`[Block-Debug: ${name}] is not set to watch block breaks toggle it on menu if desired`);
      }
        log(`[Block-Debug: ${name}] skipped: block break disabled`);
        continue;
      }


      //---------------DIMENSION FILTER----------------------------        
  const dimId = event.dimension.id.replace("minecraft:", "");  
  // if there is a filter and this dim isn’t in it, bail out
  if (
    Array.isArray(config.dimensionFilter) &&
    config.dimensionFilter.length > 0 &&
    !config.dimensionFilter.includes(dimId)
  ) {
    if (config.sendPlayersFailureMessages) {
    // optional: let them know why nothing happened
    player.sendMessage(`[Block-Debug] DimensionFilter: §cFAIL§r: you are in ${dimId}, which is disabled`);
  }
    log(`skipped: dimension ${dimId} not in filter`);
    continue;
  }
  
      // —— TYPE FILTERS ——
      const rawTypes = Array.isArray(config.blockTypeFilter) ? config.blockTypeFilter : [];
      const includeTypes = rawTypes.filter(t => !t.startsWith("!"));
      const excludeTypes = rawTypes.filter(t => t.startsWith("!")).map(t => t.slice(1));
  
      if (includeTypes.length > 0 && !includeTypes.includes(brokenType)) { if (config.sendPlayersFailureMessages) {
        player.sendMessage(`[Block-Debug: ${name}] §cFAIL§r: block type not in include list: ${brokenType}`);
      }
        log(`[Block-Debug: ${name}] FAIL: type not in include list: ${brokenType}`);
        continue;
      }
      if (excludeTypes.length > 0 && excludeTypes.includes(brokenType)) {
        if (config.sendPlayersFailureMessages) {
        player.sendMessage(`[Block-Debug: ${name}] §cFAIL§r block type: ${brokenType} is excluded`);
      }
        log(`[Block-Debug: ${name}] FAIL: type in exclude list: ${brokenType}`);
        continue;
      }
      if (config.sendPlayersFailureMessages) {
        player.sendMessage(`[Block-Debug: ${name}]  Block Type Filter: [Included: "${includeTypes}"] [Excluded: "${excludeTypes}"] Actual Block: "${brokenType}"`);
      }
      
     
  
     // —— POSITION FILTER —— 
if (config.blockLocationEnabled) {
  const locCfg = config.blockLocation; // { x:{…}, y:{…}, z:{…} }

  // helper to test one axis
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


   const fmtRangeStr = cfg =>
    cfg.exclude
      ? `!${cfg.exclude.min}${cfg.exclude.min != null && cfg.exclude.max != null ? '..' : ''}${cfg.exclude.max}`
      : (cfg.min === cfg.max ? `${cfg.min}` : `${cfg.min}..${cfg.max}`);

  // build a “allowed” string for x,y,z
  const allowed = [
    fmtRangeStr(locCfg.x),
    fmtRangeStr(locCfg.y),
    fmtRangeStr(locCfg.z),
  ].join(', ');

  if (!passX || !passY || !passZ) {


    
  // helper to stringify one axis config (inclusion or exclusion)
 

  log(
    `[Block-Debug: ${name}] FAIL: location mismatch at (${x}, ${y}, ${z}); ` +
    `allowed ranges [${allowed}]`
  );

  if (config.sendPlayersFailureMessages) {
        player.sendMessage(`[BlockDebug ${name}] Location Filter: §cFAIL§r: location mismatch at (${x}, ${y}, ${z}); ` +
    `allowed ranges [${allowed}]`);
    }
  continue;
}
//Location Filter Pass
if (passX && passY && passZ) {
  if (config.sendPlayersFailureMessages) {
        player.sendMessage(`[BlockDebug ${name}] Location Filter Pass - Block: "${brokenType}" location match at (${x}, ${y}, ${z}); ` +
    `allowed ranges [${allowed}]`);
      }
}
}


  
      // —— PLAYER TAG FILTER ——
      const rawTags = Array.isArray(config.playerTagFilter) ? config.playerTagFilter : [];
      if (rawTags.length > 0) {
        const includeTags = rawTags.filter(t => !t.startsWith("!"));
        const excludeTags = rawTags.filter(t => t.startsWith("!")).map(t => t.slice(1));
        const ptags = player.getTags();
  
        if (excludeTags.some(t => ptags.includes(t))) {
          if (config.sendPlayersFailureMessages) {
        player.sendMessage(`[Block-Debug: ${name}] Player Tag Filter §cFAIL§r: player has excluded tag(s): ${excludeTags}`);
      }
          log("[Block-Debug: ${name}] FAIL: player has excluded tag");
          continue;
        }
        if (includeTags.length > 0 && !includeTags.some(t => ptags.includes(t))) {
          if (config.sendPlayersFailureMessages) {
        player.sendMessage(`[Block-Debug: ${name}] Player Tag Filter- §cFAIL§r: player is missing required tag(s): ${includeTags} `);
      }
          log("[Block-Debug: ${name}] FAIL: player missing required tag");
          continue;
        }
     if (config.sendPlayersFailureMessages) {
        player.sendMessage(`[Block-Debug: ${name}] Player Tag Filter Pass [Required Tags: ${includeTags}] [Exluded Tags: ${excludeTags}] [Actual Tags: ${ptags}] `);
      }
      }
  
      // —— PLAYER SCORE FILTER ——
      if (
        !checkScoreFilter(
          player,
          config.playerScoreFilter,
          "playerScoreFilter",
          config.logToConsole,
          config.sendPlayersFailureMessages
        )
      ) {
        if (config.sendPlayersFailureMessages) {
        player.sendMessage(`[Block-Debug: ${name}] skipped: player failed score filter`);
      }
        log("skipped: playerScoreFilter");
        continue;
      }
  
      // —— REQUIRED ITEM FILTER —— 
const rawItems = Array.isArray(config.requiredItemFilter)
  ? config.requiredItemFilter
  : [];
if (rawItems.length > 0) {
  // use the stack from right before the break
  const handStack = event.itemStackBeforeBreak;  
  const itemId    = handStack?.typeId;

  if (!itemId) {
    if (config.sendPlayersFailureMessages) {
        player.sendMessage(`[Block-Debug: ${name}] skipped: item filter required but no held item was held`);
      }
    log("skipped: no held item but items required");
    continue;
  }

  const includeItems = rawItems.filter(i => !i.startsWith("!"));
  const excludeItems = rawItems
    .filter(i => i.startsWith("!"))
    .map(i => i.slice(1));

  if (excludeItems.includes(itemId)) {

    if (config.sendPlayersFailureMessages) {
        player.sendMessage(`[Block-Debug: ${name}] skipped: item filter matched excluded: ${excludeItems} held item: ${itemId}`);
      }
    log("skipped: held item excluded, detected item:", itemId);
    continue;
  }
  if (includeItems.length > 0 && !includeItems.includes(itemId)) {
    if (config.sendPlayersFailureMessages) {
        player.sendMessage(`[Block-Debug: ${name}] skipped: item filter required: ${includeItems}| detected item: ${itemId}`);
      }
    log("skipped: held item not in include list. detected item:", itemId);
    continue;
  }
  if (config.sendPlayersFailureMessages) {
        player.sendMessage(`[Block-Debug: ${name}] Required Item Filter [Required Items: ${includeItems}] [Exluded Items: ${excludeItems}] [Actual Item: ${itemId}] `);
      }
  }

  
//--------------- PASSED ALL FILTERS --------------------------

if (config.playerCommand?.trim()) {
  // replace placeholders if you want:
  const cmd = config.playerCommand
    .replace('{player}', player.name)
  player.runCommand(cmd);
}

      const { min, max } = config.incrementScore.amount;
      const rawDelta = randomInRange(min, max);
      const delta = config.incrementScore.mode === "remove" ? -rawDelta : rawDelta;
  
      const ids = Array.isArray(config.objectiveName) ? config.objectiveName : [];
      const names = Array.isArray(config.displayName) ? config.displayName : ids;
      
  
      // apply to each objective
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const disp = names[i] || id;
        const obj = createScoreboardIfNotExists(id, disp);
        
        applyDeltaSafely(obj, player, config.incrementScore);
        log(`updated ${id} by ${delta}`);
         
      }
     
  
      // action bar
      if (config.actionBarEnabled && ids.length) {
    const actionBarFormatCode = config.actionBarFormatCode;
    showSingleActionBar(player, ids, names, delta, config.incrementScore.mode, actionBarFormatCode);
}

 for (let i = 0; i < ids.length; i++) {
    const id   = ids[i];
    const disp = names[i] || id;
    const verb = config.incrementScore.mode === "add" ? "added to" : "removed from"; 
    const objective = world.scoreboard.getObjective(id);
    const after = objective.getScore(player);

  if (config.sendPlayersMessages) {
    const rawName = brokenType.includes(':')
      ? brokenType.split(':')[1]
      : brokenType;
    const prettyName = rawName
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    player.sendMessage(`You broke ${prettyName} ${verb} ${delta} "${disp}" score`);
    }
      if (config.sendPlayersFailureMessages) {
        player.sendMessage(`[Block-Debug: ${name}] §aFULL PASS§r ${player.name|| player.nameTag} Broke ${brokenType} at ${x},${y},${z} and ${delta} ${verb} "${disp}" now ${after}`);
      }

      log(`[Block-Debug: ${name}] FULL PASS: ${player.name|| player.nameTag} Broke ${brokenType} at ${x},${y},${z} and ${delta} ${verb} "${disp}" now ${after}`);
      
      if (config.logToMenu) {
        addLog(
          `[BlockCounter: ${name}]§r ${player.name|| player.nameTag} Broke ${brokenType} at ${x},${y},${z} and ${delta} ${verb} "${disp}" now ${after}`);
        }

   if (config.replaceBrokenBlock) {
      // 1) put the block back
      event.block.setPermutation(event.brokenBlockPermutation);
      
      player.runCommand(`kill @e[type=item,x=${x},y=${y},z=${z},r=2]`);
    }


    }
  }
  }
);






//-----------------------------BLOCKS PLACED EVENT ---------------------------------------------


world.afterEvents.playerPlaceBlock.subscribe(event => {
  const player = event.player;
  const dimension = event.dimension; 
  if (!player) return;

  const placedBlock = event.block;
  // ← pull the post-placement state off the BlockLocation
  const perm = placedBlock.permutation;
  if (!perm) {
    console.warn(`[BlockPlace] no block permutation available`);
    return;
  }

  const placedType = perm.type.id;
  const { x, y, z } = placedBlock.location;

    for (const [name, config] of Object.entries(blockCounters)) {
        // check if enabled
        if (!config.enabled) {
            if (config.sendPlayersFailureMessages) {
                player.sendMessage(`§2[BlockPlace-Debug:§r ${name}] is toggled to disabled -§cStop Processing`);
            }
            continue;
        }

        // shorthand logger
        const log = (...args) => {
            if (config.logToConsole) console.log(`[BlockPlace:${name}]`, ...args);
        };

        // debug flags
        if (config.sendPlayersFailureMessages) {
            player.sendMessage(`§2[BlockPlace-Debug:§r ${name}] Start Processing`);
            const flagStatuses = {
                "action bar toggle": config.actionBarEnabled,
                "blocks broken counter": config.blockBreakEnabled,
                "blocks placed counter": config.blockPlaceEnabled,
                "allow negative numbers": config.incrementScore.allowNegative,
                "send players messages": config.sendPlayersMessages,
                "send players debug messages": config.sendPlayersFailureMessages,
                "log to menu": config.logToMenu,
                "log to console": config.logToConsole,
                "replace broken blocks": config.replaceBrokenBlock,
                "remove placed blocks": config.removePlacedBlock
            };
            const lines = Object.entries(flagStatuses)
                .map(([label, enabled]) => `${label} - ${enabled ? "enabled" : "disabled"}`);
            player.sendMessage(lines.join("\n"));
        }
        // only if place-watching is on
        if (!config.blockPlaceEnabled) {
            if (config.sendPlayersFailureMessages) {
                player.sendMessage(`[BlockPlace-Debug: ${name}] skipped: block place disabled`);
            }
            log(`skipped: block place disabled`);
            continue;
        }
 //---------------DIMENSION FILTER----------------------------        
  const dimId = event.dimension.id.replace("minecraft:", "");  
  // if there is a filter and this dim isn’t in it, bail out
  if (
    Array.isArray(config.dimensionFilter) &&
    config.dimensionFilter.length > 0 &&
    !config.dimensionFilter.includes(dimId)
  ) {
    if (config.sendPlayersFailureMessages) {
    // optional: let them know why nothing happened
    player.sendMessage(`[Block-Debug] DimensionFilter: §cFAIL§r: you are in ${dimId}, which is disabled`);
  }
    log(`skipped: dimension ${dimId} not in filter`);
    continue;
  }



        // —— TYPE FILTERS ——
        const rawTypes = Array.isArray(config.blockTypeFilter) ? config.blockTypeFilter : [];
        const includeTypes = rawTypes.filter(t => !t.startsWith("!"));
        const excludeTypes = rawTypes.filter(t => t.startsWith("!")).map(t => t.slice(1));
        if (includeTypes.length > 0 && !includeTypes.includes(placedType)) {
            if (config.sendPlayersFailureMessages) player.sendMessage(`[BlockPlace-Debug: ${name}] §cFAIL§r: type not in include list: ${placedType}`);
            log(`FAIL: type not in include list: ${placedType}`);
            continue;
        }
        if (excludeTypes.length > 0 && excludeTypes.includes(placedType)) {
            if (config.sendPlayersFailureMessages) player.sendMessage(`[BlockPlace-Debug: ${name}] §cFAIL§r: type excluded: ${placedType}`);
            log(`FAIL: type excluded: ${placedType}`);
            continue;
        }
        if (config.sendPlayersFailureMessages) player.sendMessage(`[BlockPlace-Debug: ${name}] Type Filter Pass: ${placedType}`);

        // —— POSITION FILTER ——
        if (config.blockLocationEnabled) {
            const locCfg = config.blockLocation;
            const checkAxis = (coord, cfg) => cfg.exclude ?
                !(coord >= cfg.exclude.min && coord <= cfg.exclude.max) :
                (coord >= cfg.min && coord <= cfg.max);
            const passX = checkAxis(x, locCfg.x);
            const passY = checkAxis(y, locCfg.y);
            const passZ = checkAxis(z, locCfg.z);
            const fmt = c => c.exclude ? `!${c.exclude.min}..${c.exclude.max}` : (c.min === c.max ? `${c.min}` : `${c.min}..${c.max}`);
            const allowed = [fmt(locCfg.x), fmt(locCfg.y), fmt(locCfg.z)].join(", ");
            if (!passX || !passY || !passZ) {
                if (config.sendPlayersFailureMessages) player.sendMessage(`[BlockPlace-Debug: ${name}] §cFAIL§r: location mismatch (${x},${y},${z}); allowed [${allowed}]`);
                log(`FAIL: location mismatch (${x},${y},${z}); allowed [${allowed}]`);
                continue;
            }
            if (config.sendPlayersFailureMessages) player.sendMessage(`[BlockPlace-Debug: ${name}] Location Filter Pass at (${x},${y},${z})`);
        }

        // —— PLAYER TAG FILTER ——
        const rawTags = Array.isArray(config.playerTagFilter) ? config.playerTagFilter : [];
        if (rawTags.length > 0) {
            const includeTags = rawTags.filter(t => !t.startsWith("!"));
            const excludeTags = rawTags.filter(t => t.startsWith("!")).map(t => t.slice(1));
            const ptags = player.getTags();
            if (excludeTags.some(t => ptags.includes(t))) { if (config.sendPlayersFailureMessages) player.sendMessage(`[BlockPlace-Debug: ${name}] §cFAIL§r: has excluded tag`); log(`FAIL: excluded tag`); continue; }
            if (includeTags.length > 0 && !includeTags.some(t => ptags.includes(t))) { if (config.sendPlayersFailureMessages) player.sendMessage(`[BlockPlace-Debug: ${name}] §cFAIL§r: missing required tag`); log(`FAIL: missing tag`); continue; }
            if (config.sendPlayersFailureMessages) player.sendMessage(`[BlockPlace-Debug: ${name}] Tag Filter Pass [${ptags}]`);
        }

        // —— PLAYER SCORE FILTER ——
        if (!checkScoreFilter(player, config.playerScoreFilter, "playerScoreFilter", config.logToConsole, config.sendPlayersFailureMessages)) {
            if (config.sendPlayersFailureMessages) player.sendMessage(`[BlockPlace-Debug: ${name}] skipped: player failed score filter`);
            log(`skipped: score filter`);
            continue;
        }


        //--------------- PASSED ALL FILTERS --------------------------
        if (config.playerCommand?.trim()) {
            const cmd = config.playerCommand.replace('{player}', player.name);
            player.runCommand(cmd);
        }

        const { min, max } = config.incrementScore.amount;
        const rawDelta = randomInRange(min, max);
        const delta = config.incrementScore.mode === "remove" ? -rawDelta : rawDelta;
        const ids = Array.isArray(config.objectiveName) ? config.objectiveName : [];
        const names = Array.isArray(config.displayName) ? config.displayName : ids;
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const disp = names[i] || id;
            const obj = createScoreboardIfNotExists(id, disp);
            applyDeltaSafely(obj, player, config.incrementScore);
            log(`updated ${id} by ${delta}`);
        }

        // action bar
        if (config.actionBarEnabled && ids.length) {
            showSingleActionBar(player, ids, names, delta, config.incrementScore.mode, config.actionBarFormatCode);
        }

        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const disp = names[i] || id;
            const verb = config.incrementScore.mode === "add" ? "added to" : "removed from";
            const objective = world.scoreboard.getObjective(id);
            const after = objective.getScore(player);
            if (config.sendPlayersMessages) {
                const rawName = placedType.includes(':') ? placedType.split(':')[1] : placedType;
                const pretty = rawName.split('_').map(w => w[0].toUpperCase()+w.slice(1)).join(' ');
                player.sendMessage(`You placed ${pretty} ${verb} ${delta} "${disp}" score`);
            }
            if (config.sendPlayersFailureMessages) {
                player.sendMessage(`[BlockPlace-Debug: ${name}] §aFULL PASS§r ${player.name} placed ${placedType} at ${x},${y},${z} in ${dimId} and ${delta} ${verb} "${disp}" now ${after}`);
            }
            log(`[BlockPlace-Debug: ${name}] FULL PASS: ${player.name} placed ${placedType} at ${x},${y},${z} in ${dimId} and ${delta} ${verb} "${disp}" now ${after}`);
            if (config.logToMenu) {
                addLog(`[BlockCounter: ${name}]§r ${player.name} placed ${placedType} at ${x},${y},${z} in ${dimId} and ${delta} ${verb} "${disp}" now ${after}`);
            }
        }

      if (config.removePlacedBlock) {
  // set the block at this location to air
  event.dimension.runCommandAsync(`setblock ${x} ${y} ${z} air`)
  event.dimension.runCommandAsync (`execute as "${player.nameTag}" run give @s ${placedType} 1`)
}
    }
});