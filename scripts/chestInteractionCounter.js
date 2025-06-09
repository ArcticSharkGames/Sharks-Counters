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

// Prefix for chest interaction dynamic properties
const CHEST_PREFIX = "chestInteractionCounter:";

// Default configuration for chest interaction counters
export const defaultChestInteractionConfig = {
  enabled: true,
  actionBarEnabled: true,
  // toggles whether position-based filtering is applied
  blockPositionEnabled: false,
  // filter on player tags (include/exclude syntax with !)
  playerTagFilter: [],
  // filter on player scores: objective name and range
  playerScoreFilter: { objective: "none", min: 1, max: 1 },
  objectiveName: [],
  displayName: [],
   BlockType: [
    "minecraft:chest",
    "minecraft:trapped_chest",
    "minecraft:barrel",
    "minecraft:dispenser",
    "minecraft:dropper",
    "minecraft:hopper",
    "minecraft:furnace",
    "minecraft:smoker",
    "minecraft:blast_furnace",
    "minecraft:lectern",
    "minecraft:shulker_box",
    "minecraft:white_shulker_box",
    "minecraft:orange_shulker_box",
    "minecraft:magenta_shulker_box",
    "minecraft:light_blue_shulker_box",
    "minecraft:yellow_shulker_box",
    "minecraft:lime_shulker_box",
    "minecraft:pink_shulker_box",
    "minecraft:gray_shulker_box",
    "minecraft:light_gray_shulker_box",
    "minecraft:cyan_shulker_box",
    "minecraft:purple_shulker_box",
    "minecraft:blue_shulker_box",
    "minecraft:brown_shulker_box",
    "minecraft:green_shulker_box",
    "minecraft:red_shulker_box",
    "minecraft:black_shulker_box"
  ],
  blockLocation: {
    x: { min: -100, max: 100 },
    y: { min: -100, max: 100 },
    z: { min: -100, max: 100 },
  },
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
  playerCommand: "",
  dimensionFilter: ["overworld", "nether", "the_end"],
  displayType: ["none"],
  type: "container"
};

// In-memory store for chest interaction counters
export let chestInteractionCounters = {};

/**
 * Save a chest-interaction counter config to dynamic properties and memory
 */
export function saveChestInteractionCounter(counterName, config) {
  try {
    const raw = JSON.stringify(config);
    world.setDynamicProperty(CHEST_PREFIX + counterName, raw);
    chestInteractionCounters[counterName] = config;
  } catch (e) {
    console.error(`[Save] Failed to save Chest Interaction Counter '${counterName}':`, e);
  }
}

/**
 * Load all chest-interaction counter configs into memory
 */
export function loadChestInteractionCounters() {
  try {
    const allKeys = world.getDynamicPropertyIds();
    for (const key of allKeys) {
      if (!key.startsWith(CHEST_PREFIX)) continue;
      const counterName = key.slice(CHEST_PREFIX.length);
      const raw = world.getDynamicProperty(key);
      try {
        const parsed = JSON.parse(raw);

        // Merge incrementScore
        const incrementScore = {
          ...defaultChestInteractionConfig.incrementScore,
          ...parsed.incrementScore,
          allowNegative:
            parsed.incrementScore?.allowNegative ??
            defaultChestInteractionConfig.incrementScore.allowNegative,
        };

        // Merge blockLocation per axis
        const defaultLoc = defaultChestInteractionConfig.blockLocation;
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

        // Ensure arrays for filters and names
        const playerTagFilterList = Array.isArray(parsed.playerTagFilter)
          ? parsed.playerTagFilter
          : defaultChestInteractionConfig.playerTagFilter;
        const scoreObj = parsed.playerScoreFilter || {};
        const playerScoreFilter = {
          objective:
            scoreObj.objective ?? defaultChestInteractionConfig.playerScoreFilter.objective,
          min: scoreObj.min ?? defaultChestInteractionConfig.playerScoreFilter.min,
          max: scoreObj.max ?? defaultChestInteractionConfig.playerScoreFilter.max,
        };
        const objectiveName = Array.isArray(parsed.objectiveName)
          ? parsed.objectiveName
          : defaultChestInteractionConfig.objectiveName;
        const displayName = Array.isArray(parsed.displayName)
          ? parsed.displayName
          : defaultChestInteractionConfig.displayName;
        const BlockTypeList = Array.isArray(parsed.BlockType)
          ? parsed.BlockType
          : defaultChestInteractionConfig.BlockType;
        const displayTypeList = Array.isArray(parsed.displayType)
          ? parsed.displayType
          : defaultChestInteractionConfig.displayType;

        // Top-level flags and filters with fallbacks
        const enabled = parsed.enabled ?? defaultChestInteractionConfig.enabled;
        const actionBarEnabled =
          parsed.actionBarEnabled ?? defaultChestInteractionConfig.actionBarEnabled;
        const blockPositionEnabled =
          parsed.blockPositionEnabled ?? defaultChestInteractionConfig.blockPositionEnabled;
        const logToMenu = parsed.logToMenu ?? defaultChestInteractionConfig.logToMenu;
        const logToConsole =
          parsed.logToConsole ?? defaultChestInteractionConfig.logToConsole;
        const sendPlayersMessages =
          parsed.sendPlayersMessages ?? defaultChestInteractionConfig.sendPlayersMessages;
        const sendPlayersFailureMessages =
          parsed.sendPlayersFailureMessages ??
          defaultChestInteractionConfig.sendPlayersFailureMessages;
        const actionBarFormatCode =
          parsed.actionBarFormatCode ?? defaultChestInteractionConfig.actionBarFormatCode;
        const playerCommand = parsed.playerCommand ?? defaultChestInteractionConfig.playerCommand;
        const dimensionFilter = Array.isArray(parsed.dimensionFilter)
          ? parsed.dimensionFilter
          : defaultChestInteractionConfig.dimensionFilter;

        chestInteractionCounters[counterName] = {
          ...defaultChestInteractionConfig,
          ...parsed,
          incrementScore,
          blockLocation,
          playerTagFilter: playerTagFilterList,
          playerScoreFilter,
          objectiveName,
          displayName,
          BlockType: BlockTypeList,
          displayType: displayTypeList,
          enabled,
          actionBarEnabled,
          blockPositionEnabled,
          logToMenu,
          logToConsole,
          sendPlayersMessages,
          sendPlayersFailureMessages,
          actionBarFormatCode,
          playerCommand,
          dimensionFilter,
          type: "container"
        };
      } catch (e) {
        console.warn(
          `[Load] Failed to parse Chest Interaction Counter config for '${counterName}':`,
          e
        );
      }
    }
  } catch (e) {
    console.error("[Load] Failed to load Chest Interaction counters:", e);
  }
}

/**
 * Delete a chest-interaction counter from dynamic properties and memory
 */
export function deleteChestInteractionCounter(counterName) {
  try {
    world.setDynamicProperty(CHEST_PREFIX + counterName, undefined);
    delete chestInteractionCounters[counterName];
  } catch (e) {
    console.error(
      `[Delete] Failed to delete Chest Interaction Counter '${counterName}':`,
      e
    );
  }
}




//-----------------------------Container Interaction Counter Menu-----------------------------



// Helper utilities
const sanitizeList = (raw) =>
  raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const filterNone = (list) => list.filter((e) => e.toLowerCase() !== "none");
const fmtRange = (r) => (r.min === r.max ? `${r.min}` : `${r.min}..${r.max}`);



export function showConfigureChestInteractionCounterForm(player, name) {
  // 1) load and merge defaults
  loadChestInteractionCounters();
  const raw    = chestInteractionCounters[name] || {};
  const config = { ...defaultChestInteractionConfig, ...raw };

  // 2) prepare initial values for the form
  const initial = {
    enabled:                    config.enabled,
    actionBarEnabled:           config.actionBarEnabled,
    actionBarFormatCode:        config.actionBarFormatCode,
    objective:                  Array.isArray(config.objectiveName)
                                  ? config.objectiveName.join(", ")
                                  : "",
    display:                    Array.isArray(config.displayName)
                                  ? config.displayName.join(", ")
                                  : "",
    amount:                     fmtRange(config.incrementScore.amount),
    scoreMode:                  config.incrementScore.mode === "remove" ? 1 : 0,
    allowNegative:              config.incrementScore.allowNegative,
    positionFilter:             config.blockPositionEnabled,
    positionRange:              `${fmtRange(config.blockLocation.x)},${fmtRange(config.blockLocation.y)},${fmtRange(config.blockLocation.z)}`,
    playerTags:                 config.playerTagFilter.join(", "),
    playerScoreObj:             config.playerScoreFilter.objective,
    playerScoreRange:           `${config.playerScoreFilter.min}..${config.playerScoreFilter.max}`,
    playerCommand:              config.playerCommand || "",
    logToMenu:                  config.logToMenu,
    logToConsole:               config.logToConsole,
    sendPlayersMessages:        config.sendPlayersMessages,
    sendPlayersFailureMessages: config.sendPlayersFailureMessages
  };

  // 3) build the form
  const form = new ModalFormData()
    .title(`Container Counter: ${name}`)
    .toggle("Counter Enabled",               initial.enabled)
    .toggle("Action Bar Enabled",            initial.actionBarEnabled)
    .textField("Action Bar Format Code",     "a–u or 0–9",                initial.actionBarFormatCode)
    .textField("Score Objective(s)",         "e.g. chest_interactions",   initial.objective)
    .textField("Score Display Name(s)",      "e.g. Chest Interactions",   initial.display)
    .textField("Increment Amount",           "e.g. 1 or 1..5",            initial.amount)
    .dropdown("Score Mode", ["Add Score","Remove Score"], initial.scoreMode)
    .toggle("Allow Negative Numbers",        initial.allowNegative)
    .toggle("Position Filter Enabled",       initial.positionFilter)
    .textField("Position Ranges (x..x,y..y,z..z)", "e.g. -5..5,60..70,-100..100", initial.positionRange)
    .textField("Player Required Tag Filters",         "e.g. !noTrack",             initial.playerTags)
    .textField("Player Required Score Objective",     "e.g. playtime",             initial.playerScoreObj)
    .textField("Player Required Score Range",         "e.g. 1..10",                initial.playerScoreRange)
    .textField("Execute Command as Player",   "e.g. /give @s diamond",     initial.playerCommand) // new field
    .toggle("Log To Menu",                   initial.logToMenu)
    .toggle("Debug Log To Console",          initial.logToConsole)
    .toggle("Send Players Messages",         initial.sendPlayersMessages)
    .toggle("Send Players Debug Messages",   initial.sendPlayersFailureMessages);

  form.show(player).then(resp => {
    if (resp.canceled) return;
    const [
      enRaw, abRaw, codeRaw,
      objRaw, dispRaw, amtRaw,
      modeIdx, negRaw,
      posFiltRaw, posRangeRaw,
      tagsRaw, scoreObjRaw, scoreRangeRaw,
      cmdRaw,                      // new field index
      logMenuRaw, logConsoleRaw, sendMsgRaw, sendFailRaw
    ] = resp.formValues;

    // 4) parse back into typed values
    const enabled                    = Boolean(enRaw);
    const actionBarEnabled           = Boolean(abRaw);
    const actionBarFormatCode        = /^[a-u0-9]$/.test(codeRaw.trim())
                                      ? codeRaw.trim()
                                      : defaultChestInteractionConfig.actionBarFormatCode;
    const objectiveName              = objRaw.trim()
                                      ? sanitizeList(objRaw)
                                      : config.objectiveName;
    const displayName                = dispRaw.trim()
                                      ? sanitizeList(dispRaw)
                                      : config.displayName;
    const incrementAmt               = amtRaw.trim()
                                      ? parseRangeInput(amtRaw.trim())
                                      : config.incrementScore.amount;
    const mode                       = modeIdx === 1 ? "remove" : "add";
    const allowNegative              = Boolean(negRaw);
    const positionEnabled            = Boolean(posFiltRaw);

    let blockLocation = config.blockLocation;
    if (positionEnabled && posRangeRaw.trim()) {
      const [rx, ry, rz] = posRangeRaw.split(",").map(s => s.trim());
      blockLocation = {
        x: parseRangeInput(rx),
        y: parseRangeInput(ry),
        z: parseRangeInput(rz),
      };
    }

    const playerTagFilter            = tagsRaw.trim()
                                      ? filterNone(sanitizeList(tagsRaw))
                                      : config.playerTagFilter;
    const playerScoreObj             = scoreObjRaw.trim()
                                      ? scoreObjRaw.trim()
                                      : config.playerScoreFilter.objective;
    const scrRange                   = scoreRangeRaw.trim()
                                      ? parseRangeInput(scoreRangeRaw.trim())
                                      : { min: config.playerScoreFilter.min, max: config.playerScoreFilter.max };

    const playerCommand              = cmdRaw.trim() || "";
    const logToMenu                  = Boolean(logMenuRaw);
    const logToConsole               = Boolean(logConsoleRaw);
    const sendPlayersMessages        = Boolean(sendMsgRaw);
    const sendPlayersFailureMessages = Boolean(sendFailRaw);

    // 5) build new config
    const configToSave = {
      ...config,
      enabled,
      actionBarEnabled,
      actionBarFormatCode,
      objectiveName,
      displayName,
      incrementScore:       { amount: incrementAmt, mode, allowNegative },
      blockPositionEnabled: positionEnabled,
      blockLocation,
      playerTagFilter,
      playerScoreFilter:    {
        objective: playerScoreObj,
        min:       scrRange.min,
        max:       scrRange.max
      },
      playerCommand,
      logToMenu,
      logToConsole,
      sendPlayersMessages,
      sendPlayersFailureMessages
    };

    // 6) confirmation dialog
    const df    = v => Array.isArray(v) ? v.join(", ") : v;
    const incV  = configToSave.incrementScore.amount;
    const incDisplay = `${incV.min}${incV.min !== incV.max ? `..${incV.max}` : ""}`;

    new MessageFormData()
      .title("Confirm Chest Interaction Counter")
      .body(
        `Name: ${name}\n` +
        `Enabled: ${configToSave.enabled}\n` +
        `Action Bar Enabled: ${configToSave.actionBarEnabled}\n` +
        `Format Code: ${configToSave.actionBarFormatCode}\n` +
        `Objectives: ${df(configToSave.objectiveName)}\n` +
        `Displays: ${df(configToSave.displayName)}\n` +
        `Increment: ${incDisplay} (${configToSave.incrementScore.mode})\n` +
        `Allow Negative: ${configToSave.incrementScore.allowNegative}\n` +
        `Position Filter: ${configToSave.blockPositionEnabled}\n` +
        `Position Range: ${fmtRange(configToSave.blockLocation.x)},${fmtRange(configToSave.blockLocation.y)},${fmtRange(configToSave.blockLocation.z)}\n` +
        `Player Required Tags: ${df(configToSave.playerTagFilter)}\n` +
        `Player Required Score Objective: ${configToSave.playerScoreFilter.objective}\n` +
        `Player Required Score Range: ${fmtRange({ min: configToSave.playerScoreFilter.min, max: configToSave.playerScoreFilter.max })}\n` +
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
          showConfigureChestInteractionCounterForm(player, name);
        } else {
          saveChestInteractionCounter(name, configToSave);
          player.sendMessage(`Chest Interaction Counter '${name}' saved.`);
          addLog(`§a[Add/Edit]§r ${player.nameTag} updated chest counter ${name}`);
          manageAllCountersMenu(player);
        }
      });
  });
}


//---------------------------------------------------------------------------------------------------------

//--------------------------------Chest BlockType Menu----------------------------------------------------


const ALL_INVENTORY_BLOCKS = [
  "minecraft:chest",
  "minecraft:trapped_chest",
  "minecraft:barrel",
  "minecraft:dispenser",
  "minecraft:dropper",
  "minecraft:hopper",
  "minecraft:furnace",
  "minecraft:smoker",
  "minecraft:blast_furnace",
  "minecraft:lectern",
  // all shulker variants:
  "minecraft:shulker_box","minecraft:white_shulker_box","minecraft:orange_shulker_box",
  "minecraft:magenta_shulker_box","minecraft:light_blue_shulker_box","minecraft:yellow_shulker_box",
  "minecraft:lime_shulker_box","minecraft:pink_shulker_box","minecraft:gray_shulker_box",
  "minecraft:light_gray_shulker_box","minecraft:cyan_shulker_box","minecraft:purple_shulker_box",
  "minecraft:blue_shulker_box","minecraft:brown_shulker_box","minecraft:green_shulker_box",
  "minecraft:red_shulker_box","minecraft:black_shulker_box"
];
const SHULKER_IDS = ALL_INVENTORY_BLOCKS.filter(id => id.endsWith("shulker_box"));

export function showConfigureBlockTypesForm(player, counterName) {
  // 1) load existing configs
  loadChestInteractionCounters();
  const cfg     = chestInteractionCounters[counterName] || { ...defaultChestInteractionConfig };
  const current = Array.isArray(cfg.BlockType) ? cfg.BlockType.slice() : [];

  // Compute only-your-custom entries
  const customList = current
    .filter(id => !ALL_INVENTORY_BLOCKS.includes(id.replace(/^!/, "")))
    .map(id => id);

  // 2) Build the form
  const form = new ModalFormData()
    .title(`Block Types: ${counterName}`);

  // 2a) “Shulker Boxes” group toggle (values[0])
  const shulkerExcluded = SHULKER_IDS.some(id => current.includes("!" + id));
  form.toggle("Shulker Boxes (all colors)", !shulkerExcluded);

  // 2b) Individual toggles for each non-shulker inventory block
  ALL_INVENTORY_BLOCKS
    .filter(id => !SHULKER_IDS.includes(id))
    .forEach(id => {
      // If “!id” is in current, it’s excluded → toggle starts OFF
      const isExcluded = current.includes("!" + id);
      form.toggle(id, !isExcluded); // values[1..10]
    });

  // 2c) Now insert the dropdown for custom entries
  form.dropdown(
    "Current custom block types",
    customList.length ? customList : ["None"],
    0
  ); // this will be values[11]

  // 2d) Free-form “Add custom” field (values[12])
  form.textField(
    "Add custom block types (comma-separated; prefix with ! to exclude)",
    ""
  );
  // 2e) Free-form “Remove custom” field (values[13])
  form.textField(
    "Remove custom block type:",
    ""
  );

  // 3) Show everything
  form.show(player).then(res => {
    if (res.canceled) return;
    const values   = res.formValues;
    let idx        = 0;
    const newFilter = [];

    // 3a) Read the Shulker toggle (values[0])
    const shulkerOn = values[idx++];
    SHULKER_IDS.forEach(id => {
      if (shulkerOn) {
        // include id if not already present
        if (!newFilter.includes(id)) newFilter.push(id);
      } else {
        // exclude id with “!”
        newFilter.push("!" + id);
      }
    });

    // 3b) Read each non-shulker block toggle (values[1..10])
    ALL_INVENTORY_BLOCKS
      .filter(id => !SHULKER_IDS.includes(id))
      .forEach(id => {
        const on = values[idx++];
        if (on) {
          // toggle ON → include id
          if (!newFilter.includes(id)) newFilter.push(id);
        } else {
          // toggle OFF → exclude with “!”
          newFilter.push("!" + id);
        }
      });

    // 3c) Skip the dropdown (values[11])—we do not consume its boolean, so just advance idx
    idx++;

    // 3d) Parse “Add custom” textField (values[12])
    const addField = values[idx++] || "";
    addField.split(",")
      .map(s => s.trim())
      .filter(s => !!s)
      .forEach(s => {
        if (s.startsWith("!")) {
          // if user typed “!foo”
          if (!newFilter.includes(s)) newFilter.push(s);
        } else {
          // if user typed “foo” (and neither “foo” nor “!foo” is present)
          if (!newFilter.includes(s) && !newFilter.includes("!" + s)) {
            newFilter.push(s);
          }
        }
      });

    // 3e) Parse “Remove custom” textField (values[13])
    const remField = (values[idx++] || "").trim();
    if (remField) {
      const target = remField.startsWith("!") ? remField.slice(1) : remField;
      for (let i = newFilter.length - 1; i >= 0; i--) {
        const entry = newFilter[i].replace(/^!/, "");
        if (entry === target) {
          newFilter.splice(i, 1);
        }
      }
    }

    // 4) Save
    cfg.BlockType = newFilter;
    saveChestInteractionCounter(counterName, cfg);

    player.sendMessage("§aBlock-type filter updated!");
    showConfigureChestInteractionCounterForm(player, counterName);
  });
}



// ------------------------------Chest Interaction Event Handler-------------------------------------------

world.afterEvents.playerInteractWithBlock.subscribe(event => {
  const player = event.player;
  const block  = event.block;
  if (!player || !block) return;


  // ─── Only proceed if this block really is a container
  const invComp = block.getComponent("minecraft:inventory");
  if (!invComp || !invComp.container.isValid) {
    return;
  }

  // ─── Skip if it’s empty (just placed)
  const container = invComp.container;
  let foundItem = false;
  for (let i = 0; i < container.size; i++) {
    if (container.getItem(i)) {
      foundItem = true;
      break;
    }
  }
  if (!foundItem) {
    const pInv = player.getComponent("minecraft:inventory")?.container;
    const held = pInv?.getItem(player.selectedSlotIndex ?? 0);
    if (held && held.typeId === block.type.id) {
      return;
    }
  }

  // ─── Determine dimension ID
  const { x, y, z } = block.location;
  const dimId       = block.dimension.id.replace("minecraft:", "");

  // ─── Load all chest-interaction counters into memory
  loadChestInteractionCounters();


  // ─── Iterate through each saved container counter
  for (const [name, config] of Object.entries(chestInteractionCounters)) {

    const log = (...args) => {
        if (config.logToConsole) console.log(`[BlockCounter:${name}]`, ...args);
      };
  
    if (config.enabled) { 
      log(`[Container-Debug: ${name}] §aStart Processing counter`);
      if (config.sendPlayersFailureMessages) {
       player.sendMessage(`§3[Container-Debug] §aStart Processing counter "${name}"`);
    };
  }
    // — Enabled?
    if (!config.enabled) {
      log(`[Container-Debug: ${name}] Counter is disabled`);
      if (config.sendPlayersFailureMessages) {
        player.sendMessage(`§3[Container-Debug:${name}] §cCounter is disabled - skipping.`);
      }
      continue;
    }

    // — Debug flags if sendPlayersFailureMessages is on
    if (config.sendPlayersFailureMessages) {
      player.sendMessage(`  ActionBarEnabled:            ${config.actionBarEnabled}`);
      player.sendMessage(`  AllowNegativeNumbers:        ${config.incrementScore.allowNegative}`);
      player.sendMessage(`  SendPlayersMessages:         ${config.sendPlayersMessages}`);
      player.sendMessage(`  SendPlayersFailureMessages:  ${config.sendPlayersFailureMessages}`);
      player.sendMessage(`  LogToMenu:                   ${config.logToMenu}`);
      player.sendMessage(`  LogToConsole:                ${config.logToConsole}`);
      player.sendMessage(`  DimensionFilter:             [${config.dimensionFilter}]`);
    }

    // — Dimension filter
    if (
      Array.isArray(config.dimensionFilter) &&
      config.dimensionFilter.length > 0 &&
      !config.dimensionFilter.includes(dimId)
    ) {
      log(`[Container-Debug: ${name}] DimensionFilter FAIL: "${dimId}" not in [${config.dimensionFilter}]`);
      if (config.sendPlayersFailureMessages) {
        player.sendMessage(
          `[Container-Debug: ${name}] §cDimensionFilter FAIL §rYou are in "${dimId}", which is excluded.`
        );
      }
      continue;
    }
    log(`[Container-Debug: ${name}] DimensionFilter PASS: "${dimId}" allowed`);
    if (config.sendPlayersFailureMessages) {
      player.sendMessage(
        `[Container-Debug: ${name}] DimensionFilter PASS §rYou are in "${dimId}".`
      );
    }

    // — Position filter
    if (config.blockPositionEnabled) {
      const checkAxis = (coord, { min, max, exclude }) =>
        exclude
          ? !(coord >= exclude.min && coord <= exclude.max)
          : (coord >= min && coord <= max);

      const loc = config.blockLocation;
      if (
        !checkAxis(x, loc.x) ||
        !checkAxis(y, loc.y) ||
        !checkAxis(z, loc.z)
      ) {
        log(
          `[Container-Debug: ${name}] PositionFilter FAIL at (${x},${y},${z}) outside (${loc.x.min}..${loc.x.max}, ${loc.y.min}..${loc.y.max}, ${loc.z.min}..${loc.z.max})`
        );
        if (config.sendPlayersFailureMessages) {
          player.sendMessage(
            `[Container-Debug:${name}] §cPositionFilter FAIL §rYou are at (${x},${y},${z}) outside allowed (${loc.x.min}..${loc.x.max}, ${loc.y.min}..${loc.y.max}, ${loc.z.min}..${loc.z.max}).`
          );
        }
        continue;
      }
      log(`[Container-Debug: ${name}] PositionFilter PASS at (${x},${y},${z}) allowed (${loc.x.min}..${loc.x.max}, ${loc.y.min}..${loc.y.max}, ${loc.z.min}..${loc.z.max})`);
      if (config.sendPlayersFailureMessages) {
        player.sendMessage(
          `[Container-Debug:${name}] PositionFilter PASS §rYou are at (${x},${y},${z}) allowed (${loc.x.min}..${loc.x.max}, ${loc.y.min}..${loc.y.max}, ${loc.z.min}..${loc.z.max}).`
        );
      }
    }

    // — Block-Type filter
    const types    = Array.isArray(config.BlockType) ? config.BlockType : [];
    const includes = types.filter(t => !t.startsWith("!"));
    const excludes = types
      .filter(t => t.startsWith("!"))
      .map(t => t.slice(1));
    const actual   = block.type.id;

    if (includes.length && !includes.includes(actual)) {
      log(`[Container-Debug: ${name}] BlockTypeFilter FAIL: "${actual}" not in list: [${includes}]`);
      if (config.sendPlayersFailureMessages) {
        player.sendMessage(
          `[Container-Debug: ${name}] BlockTypeFilter FAIL You opened "${actual}" not in include list: [${includes}].`
        );
      }
      continue;
    }
    if (excludes.includes(actual)) {
      log(`[Container-Debug: ${name}] BlockTypeFilter FAIL: "${actual}" excluded: [${excludes}]`);
      if (config.sendPlayersFailureMessages) {
        player.sendMessage(
          `[Container-Debug: ${name}] §cBlockTypeFilter FAIL §rYou opened "${actual}" which is excluded: [${excludes}].`
        );
      }
      continue;
    }
    log(`[Container-Debug: ${name}] BlockTypeFilter PASS: "${actual}" allowed: [${includes}]`);
    if (config.sendPlayersFailureMessages) {
      player.sendMessage(
        `[Container-Debug: ${name}] BlockTypeFilter PASS §rYou opened "${actual}".`
      );
    }

    // — Player-Tag filter
    if (Array.isArray(config.playerTagFilter) && config.playerTagFilter.length) {
      const tags = player.getTags();
      const inc  = config.playerTagFilter.filter(t => !t.startsWith("!"));
      const exc  = config.playerTagFilter.filter(t => t.startsWith("!")).map(t => t.slice(1));

      if (exc.some(t => tags.includes(t))) {
        log(`[Container-Debug: ${name}] TagFilter FAIL (has excluded tag [${exc}])`);
        if (config.sendPlayersFailureMessages) {
          player.sendMessage(
            `[Container-Debug: ${name}] §cTagFilter FAIL §rYou have excluded tag [${exc}].`
          );
        }
        continue;
      }
      if (inc.length && !inc.some(t => tags.includes(t))) {
        log(`[Container-Debug: ${name}] TagFilter FAIL (missing required tag [${inc}])`);
        if (config.sendPlayersFailureMessages) {
          player.sendMessage(
            `[Container-Debug: ${name}] §cTagFilter FAIL §rMissing required tag [${inc}].`
          );
        }
        continue;
      }
      log(`[Container-Debug: ${name}] TagFilter - PASS`);
      if (config.sendPlayersFailureMessages) {
        player.sendMessage(
          `[Container-Debug:${name}] TagFilter - PASS.`
        );
      }
    }

    // — Player-Score filter
    const passScore = checkScoreFilter(
      player,
      config.playerScoreFilter,
      "chestScoreFilter",
      config.logToConsole,
      config.sendPlayersFailureMessages
    );
    if (!passScore) {
      log(`[Container-Debug: ${name}] ScoreFilter FAIL`);
      if (config.sendPlayersFailureMessages) {
        player.sendMessage(
          `[Container-Debug:${name}] §cScoreFilter FAIL.`
        );
      }
      continue;
    }
    log(`[Container-Debug: ${name}] ScoreFilter PASS`);
    if (config.sendPlayersFailureMessages) {
      player.sendMessage(
        `[Container-Debug:${name}] ScoreFilter PASS.`
      );
    }
    // — Custom command?
    if (config.playerCommand?.trim()) {
      player.runCommand(
        config.playerCommand.replace("{player}", player.nameTag)
      );
      log(`[Container-Debug: ${name}] Ran custom command: ${config.playerCommand}`);
    }

    // — All filters passed. Now apply scoreboard increment:
    const { min, max } = config.incrementScore.amount;
    const rawDelta     = (min === max)
                         ? min
                         : Math.floor(Math.random() * (max - min + 1)) + min;
    const delta        = (config.incrementScore.mode === "remove")
                         ? -rawDelta
                         : rawDelta;

    const ids   = Array.isArray(config.objectiveName) ? config.objectiveName : [];
    const names = Array.isArray(config.displayName)     ? config.displayName     : ids;

    ids.forEach((id, i) => {
      const disp = names[i] || id;
      const obj  = createScoreboardIfNotExists(id, disp);
      const currentScore = getScoreSafe(player.nameTag, obj.id) || 0;
      let updatedScore   = currentScore + delta;
      if (!config.incrementScore.allowNegative && updatedScore < 0) {
        updatedScore = 0;
      }
      obj.setScore(player.nameTag, updatedScore);
       const verb = config.incrementScore.mode === "add" ? "added to" : "removed from";
      if (config.sendPlayersMessages) {
     
      player.sendMessage(
        `§3[Container Counter:${name}]§r You opened ${actual} at ${x},${y},${z} and ${delta} ${verb} ${disp}`
      );
    }
     if (config.logToMenu) {
      addLog(`[Container-Log:${name}]§r ${player.nameTag} opened ${actual} at ${x},${y},${z} in ${dimId} and ${delta} ${verb} ${disp}`);
    }

      log(`[Container Counter:${name}]§r ${player.nameTag} opened ${actual} at ${x},${y},${z} and ${delta} ${verb} ${disp}`);
    });

    // — Action bar feedback
    if (config.actionBarEnabled && ids.length) {
      showSingleActionBar(
        player,
        ids,
        names,
        delta,
        config.incrementScore.mode,
        config.actionBarFormatCode
      );
    }
   
  }
});

