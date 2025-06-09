import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { createScoreboardIfNotExists, getScoreSafe } from "./main";
import { addLog } from "./logManager";


const SCORE_REWARD_PROPERTY = "scoreRewardConfigs";

// Holds in-memory data
export const scoreRewardConfigs = {};

// ─── Default Config ─────────────────────────────────────────────────────
export const defaultScoreRewardConfig = {
    enabled: true,
    mode: "ascending", //or "descending"
    allowNegative: false, //
    objectiveName: "",
    rewardMode: "once", // or "interval"
    scoreValue: 100,
    scoreRange: { min: 1, max: 1 },
    tagFilter: [],
    locationFilterEnabled: false,
    playerLocation: {
    x: { min: -100, max: 100 },
    y: { min: -100, max: 100 },
    z: { min: -100, max: 100 },
    },
    requiredScoreFilter: { objective: "none", min: 1, max: 1 },
    sendMessage:`Congrats on Score Achieved`,
    runCommand: `/give @s diamond 1 0`,
    dimensionFilter: ["overworld", "nether", "the_end"],
    logToMenu: false,
    sendPlayersFailureMessages: false,
    logToConsole: false
      
};

// ─── Save ───────────────────────────────────────────────────────────────
export function saveScoreRewardConfigs() {
  try {
    const serialized = JSON.stringify(scoreRewardConfigs);
    world.setDynamicProperty(SCORE_REWARD_PROPERTY, serialized);
  } catch (e) {
    console.warn(`[ScoreRewards] Failed to save configs: ${e}`);
  }
}

// ─── Load ───────────────────────────────────────────────────────────────
export function loadScoreRewardConfigs() {
  const raw = world.getDynamicProperty(SCORE_REWARD_PROPERTY);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      // merge onto existing (empty object or last loaded)
      Object.assign(scoreRewardConfigs, parsed);
    } catch (e) {
      console.warn(`[ScoreRewards] Corrupt config data; skipping load. Error: ${e}`);
    }
  }
}

// ─── Delete ─────────────────────────────────────────────────────────────
export function deleteScoreReward(counterName) {
  if (scoreRewardConfigs[counterName]) {
    delete scoreRewardConfigs[counterName];
    saveScoreRewardConfigs();
  }
}


//----------------------Helper Functions ------------------------------------

function formatXYZ(location) {
  return `${location.x.min}..${location.x.max},${location.y.min}..${location.y.max},${location.z.min}..${location.z.max}`;
}


function parseXYZ(text) {
  const [x = "", y = "", z = ""] = text.split(",").map(s => s.trim());
  const [xMin, xMax] = parseRange(x);
  const [yMin, yMax] = parseRange(y);
  const [zMin, zMax] = parseRange(z);
  return {
    x: { min: xMin, max: xMax },
    y: { min: yMin, max: yMax },
    z: { min: zMin, max: zMax }
  };
}


function parseRange(rangeStr) {
  if (!rangeStr.includes("..")) {
    const val = parseInt(rangeStr);
    return [val, val];
  }

  const [start, end] = rangeStr.split("..").map(v => v.trim());
  const min = start === "" ? -999999 : parseInt(start);
  const max = end === "" ? 999999 : parseInt(end);
  return [isNaN(min) ? -999999 : min, isNaN(max) ? 999999 : max];
}

function toTitleCase(str) {
  return str.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const RESERVED_NAMES = ["interval", "once", "scoreboard", "reward", "player", "set"];

export function isValidRewardName(name) {
  const trimmed = name?.trim();

  if (!trimmed || trimmed.length === 0 || trimmed.length > 32) {
    return { valid: false, reason: "Name must be 1–32 characters." };
  }

  if (RESERVED_NAMES.includes(trimmed.toLowerCase())) {
    return { valid: false, reason: `"${trimmed}" is a reserved name.` };
  }

  if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
    return { valid: false, reason: "Only a–z, A–Z, 0–9, _ and - are allowed." };
  }

  return { valid: true };
}


//-----------------------Score Reward Manager---------------------------------

export function scoreRewardManager(player) {
  loadScoreRewardConfigs();

  const form = new ActionFormData()
    .title("Score Rewards")
    .body("Create and manage score-based command triggers.")
    .button("+ Add Score Reward");

  const names = Object.keys(scoreRewardConfigs);
  for (const name of names) {
    const cfg = scoreRewardConfigs[name];
    const status = cfg?.enabled ? "§a[Enabled]" : "§c[Disabled]";
    form.button(`${name} ${status}`);
  }

  form.show(player).then(res => {
    if (res.canceled) return;
    if (res.selection === 0) {
      showAddScoreRewardPrompt(player);
    } else {
      const index = res.selection - 1;
      const name = names[index];
      scoreRewardOptions(player, name);
    }
  });
}




//------------------------Score Reward Menu ------------------------------------

export function showConfigureScoreRewardForm(player, rewardName) {
  const existing = scoreRewardConfigs[rewardName];
  const cfg = {
    ...defaultScoreRewardConfig,
    ...(existing ?? {})
  };

  if (cfg.rewardMode === "interval") {
    showIntervalScoreRewardForm(player, rewardName, cfg);
  } else {
    showOnceScoreRewardForm(player, rewardName, cfg);
  }
}


function showOnceScoreRewardForm(player, rewardName, cfg) {
  const form = new ModalFormData()
    .title(`Once Reward: ${rewardName}`)
    .toggle("Enabled", cfg.enabled)
    .toggle("Allow Negative Scores", cfg.allowNegative)
    .textField("Objective Name", "example", cfg.objectiveName)
    .textField("Score Value", "e.g. 100", cfg.scoreValue.toString())
    .textField("Tag Filter", "tag1,!tag2", cfg.tagFilter.join(","))
    .toggle("Location Filter Enabled?", cfg.locationFilterEnabled)
    .textField("Player Location", "x,y,z as ranges", formatXYZ(cfg.playerLocation))
    .textField("Required Score Objective", "e.g. kills", cfg.requiredScoreFilter.objective)
    .textField("Required Score Range", "e.g. 1..5", `${cfg.requiredScoreFilter.min}..${cfg.requiredScoreFilter.max}`)
    .textField("Send Message", "optional", cfg.sendMessage)
    .textField("Run Command", "e.g. /give @s diamond 1", cfg.runCommand)
    .toggle("Log To Menu", cfg.logToMenu)
    .toggle("Send Player Failure Messages", cfg.sendPlayersFailureMessages)
    .toggle("Log To Console", cfg.logToConsole);

  form.show(player).then(res => {
    if (res.canceled) return;

    const [
      enabled, allowNeg, objName, scoreVal, tagStr,
      locEnabled, locStr, scoreObj, scoreRange, msg, cmd,
      logToMenu, failMsg, logConsole
    ] = res.formValues;

    const [min, max] = parseRange(scoreRange || "1..1");

    scoreRewardConfigs[rewardName] = {
      ...cfg,
      enabled,
      allowNegative: allowNeg ?? false,
      objectiveName: objName.trim(),
      scoreValue: parseInt(scoreVal),
      tagFilter: tagStr.split(",").map(s => s.trim()).filter(Boolean),
      locationFilterEnabled: locEnabled ?? false,
      playerLocation: parseXYZ(locStr),
      requiredScoreFilter: {
        objective: scoreObj.trim() || "none",
        min,
        max
      },
      sendMessage: msg.trim(),
      runCommand: cmd.trim(),
      logToMenu: logToMenu ?? false,
      sendPlayersFailureMessages: failMsg ?? false,
      logToConsole: logConsole ?? false
    };

    saveScoreRewardConfigs();
    player.sendMessage(`§a[ScoreRewards] Saved reward: ${rewardName}`);
  });
}



function showIntervalScoreRewardForm(player, rewardName, cfg) {
  const form = new ModalFormData()
    .title(`Interval Reward: ${rewardName}`)
    .toggle("Enabled", cfg.enabled)
    .dropdown("Mode", ["ascending", "descending"], cfg.mode === "descending" ? 1 : 0)
    .toggle("Allow Negative Scores", cfg.allowNegative)
    .textField("Objective Name", "example", cfg.objectiveName)
    .textField("Score Step Value", "e.g. 100", cfg.scoreValue.toString())
    .textField("Score Range", "e.g. 1.. or ..100 or 100..1000", `${cfg.scoreRange.min}..${cfg.scoreRange.max}`)
    .textField("Tag Filter", "tag1,!tag2", cfg.tagFilter.join(","))
    .toggle("Location Filter Enabled?", cfg.locationFilterEnabled)
    .textField("Player Location", "x,y,z as ranges", formatXYZ(cfg.playerLocation))
    .textField("Required Score Objective(s)", "comma list", cfg.requiredScoreFilter.objective)
    .textField("Required Score Range", "e.g. 1..10", `${cfg.requiredScoreFilter.min}..${cfg.requiredScoreFilter.max}`)
    .textField("Send Message", "optional", cfg.sendMessage)
    .textField("Run Command", "e.g. /give @s diamond 1", cfg.runCommand)
    .toggle("Log To Menu", cfg.logToMenu)
    .toggle("Send Player Failure Messages", cfg.sendPlayersFailureMessages)
    .toggle("Log To Console", cfg.logToConsole);

  form.show(player).then(res => {
    if (res.canceled) return;

    const [
      enabled, modeIndex, allowNeg, objName, stepVal,
      rangeStr, tagStr, locEnabled, locStr, requiredObj,
      requiredRangeStr, messageStr, commandStr,
      logToMenu, failMsg, logConsole
    ] = res.formValues;

    const [rangeMin, rangeMax] = parseRange(rangeStr);
    const [reqMin, reqMax] = parseRange(requiredRangeStr);

    scoreRewardConfigs[rewardName] = {
      ...cfg,
      enabled,
      mode: modeIndex === 1 ? "descending" : "ascending",
      allowNegative: allowNeg ?? false,
      objectiveName: objName.trim(),
      scoreValue: parseInt(stepVal) || cfg.scoreValue,
      scoreRange: { min: rangeMin, max: rangeMax },
      tagFilter: tagStr.split(",").map(s => s.trim()).filter(Boolean),
      locationFilterEnabled: locEnabled ?? false,
      playerLocation: parseXYZ(locStr),
      requiredScoreFilter: {
        objective: requiredObj.trim() || "none",
        min: reqMin,
        max: reqMax
      },
      sendMessage: messageStr.trim(),
      runCommand: commandStr.trim(),
      logToMenu: logToMenu ?? false,
      sendPlayersFailureMessages: failMsg ?? false,
      logToConsole: logConsole ?? false
    };

    saveScoreRewardConfigs();
    player.sendMessage(`§a[ScoreRewards] Saved reward: ${rewardName}`);
  });
}



//-----------------Add New Score Reward--------------------------

function showAddScoreRewardPrompt(player) {
  const form = new ModalFormData()
    .title("Add Score Reward")
    .textField("Reward Name", "Enter unique identifier")
    .dropdown("Reward Mode", ["once", "interval"], 0);

  form.show(player).then(res => {
    if (res.canceled) return;

    const name = (res.formValues[0] ?? "").trim();
    const modeIndex = res.formValues[1] ?? 0;
    const rewardMode = modeIndex === 1 ? "interval" : "once";

    const validation = isValidRewardName(name);
    if (!validation.valid) {
      player.sendMessage(`§c[ScoreRewards] ${validation.reason}`);
      return;
    }

    scoreRewardConfigs[name] = {
      ...defaultScoreRewardConfig,
      rewardMode,
    };

    showConfigureScoreRewardForm(player, name);
  });
}


//-----------Score Reward Options--------------------------------

export function scoreRewardOptions(player, rewardName) {
  const cfg = scoreRewardConfigs[rewardName];
  if (!cfg) return player.sendMessage(`§c[ScoreRewards] Missing config: ${rewardName}`);

  const status = cfg.enabled ? "§2Enabled" : "§4Disabled";

  const form = new ActionFormData()
    .title(`Reward: ${rewardName}`)
    .body(`Current status: ${status}`)
    .button(cfg.enabled ? "§4Disable" : "§2Enable")
    .button("Edit")
    .button("Dimension Filter")
    .button("Delete")
    .button("Back");

  form.show(player).then(res => {
    if (res.canceled) return;

    switch (res.selection) {
      case 0: // toggle enable
        cfg.enabled = !cfg.enabled;
        saveScoreRewardConfigs();
        player.sendMessage(`§e[ScoreRewards] ${rewardName} is now ${cfg.enabled ? "enabled" : "disabled"}.`);
        scoreRewardOptions(player, rewardName);
        break;

      case 1: // edit
        showConfigureScoreRewardForm(player, rewardName);
        break;
      case 2: //dimension filter
        showScoreRewardDimensionFilterMenu(player, rewardName)
        break;
      case 3: { // confirm delete
          const confirm = new MessageFormData()
           .title("Confirm Delete")
           .body(`Do you want to delete "${rewardName}"?`)
           .button1("§cYes, delete")
           .button2("Cancel");

             confirm.show(player).then(res => {
             if (res.canceled || res.selection !== 0) return;

            deleteScoreReward(rewardName);
            player.sendMessage(`§c[ScoreRewards] Deleted reward "${rewardName}"`);
            scoreRewardManager(player);
          });
       break;
        }
      
      case 4: // back
        scoreRewardManager(player);
        break;
    }
  });
}

// -----------------------Dimension Filter Menu -----------------------------

export function showScoreRewardDimensionFilterMenu(player, rewardName) {
  const cfg = scoreRewardConfigs[rewardName];
  if (!cfg) {
    player.sendMessage(`§c[ScoreRewards] No config found for "${rewardName}"`);
    return;
  }

  const current = cfg.dimensionFilter || [];
  const hasOverworld = current.includes("overworld");
  const hasNether    = current.includes("nether");
  const hasEnd       = current.includes("the_end");

  const form = new ModalFormData()
    .title(`Dimensions for ${rewardName}`)
    .toggle("Overworld", hasOverworld)
    .toggle("Nether", hasNether)
    .toggle("The End", hasEnd);

  form.show(player).then(res => {
    if (res.canceled) return;

    const [ow, nether, end] = res.formValues;

    const newDims = [];
    if (ow) newDims.push("overworld");
    if (nether) newDims.push("nether");
    if (end) newDims.push("the_end");

    cfg.dimensionFilter = newDims;
    saveScoreRewardConfigs();

    player.sendMessage(`§a[ScoreRewards] Updated dimensions for "${rewardName}"`);
  });
}

//-----------------------------------------------------------------------------

//---------------------------Score Reward Event--------------------------------


// ─── Main Interval ─────────────────────────────────────────────────────

system.runInterval(() => {
  if (Object.keys(scoreRewardConfigs).length === 0) return;

  for (const rewardName in scoreRewardConfigs) {
    const config = scoreRewardConfigs[rewardName];
    if (!config.enabled) continue;

    const {
      rewardMode,
      mode,
      objectiveName,
      scoreValue,
      allowNegative,
      logToConsole,
      sendPlayersFailureMessages,
      scoreRange = { min: -999999, max: 999999 },
    } = config;

    const scoreObj = createScoreboardIfNotExists(objectiveName, toTitleCase(objectiveName));
    const rewardKey = `reward_${rewardName}_track_${rewardMode}`;
    const trackerObj = createScoreboardIfNotExists(rewardKey, `${rewardName} Tracker`);

    for (const player of world.getPlayers()) {
      const name = player.nameTag;
      const score = getScoreSafe(player, scoreObj.id);
      if (typeof score !== "number") continue;

      // ─── Score Range Check ───────────────────────────────────────────
      if (score < scoreRange.min || score > scoreRange.max) {
        if (logToConsole) console.warn(`[ScoreReward: ${rewardName}] ${name} outside allowed scoreRange (${score})`);
        if (sendPlayersFailureMessages) player.sendMessage(`§c[ScoreReward] Score not in range for "${rewardName}"`);
        continue;
      }

      // ─── Once Reward ────────────────────────────────────────────────
      if (rewardMode === "once") {
        if (getScoreSafe(player, trackerObj.id) === 1) {
          if (logToConsole) console.warn(`[ScoreReward: ${rewardName}] ${name} already rewarded (once)`);
          if (sendPlayersFailureMessages) player.sendMessage(`§c[ScoreReward] You already earned "${rewardName}"`);
          continue;
        }

        // Filters
        if (!passesRewardFilters(player, config, rewardName)) continue;

        // Reward + Track
        player.runCommandAsync(`scoreboard players set "${name}" ${trackerObj.id} 1`);
        if (config.sendMessage) player.sendMessage(config.sendMessage);
        if (config.runCommand) {
          const cmd = config.runCommand.replace(/%player%/g, `"${name}"`);
          player.runCommandAsync(cmd);
        }
        if (config.logToMenu) addLog(`[Reward:${rewardName}] ${name} has earned ${scoreValue} on ${objectiveName}`);
        if (logToConsole) console.warn(`[ScoreReward: ${rewardName}] ${name} SUCCESS`);
        continue;
      }

      // ─── Interval Reward ─────────────────────────────────────────────
      if (rewardMode === "interval") {
        // Step progress based on mode
        let earnedSteps = 0;
        if (mode === "ascending") {
          earnedSteps = Math.floor(score / scoreValue);
        } else if (mode === "descending") {
          const ceiling = scoreRange.max ?? 0;
          earnedSteps = Math.floor((ceiling - score) / scoreValue);
        }

        const rewardedSteps = getScoreSafe(player, trackerObj.id);
        if (earnedSteps <= rewardedSteps) {
          if (logToConsole) console.warn(`[ScoreReward: ${rewardName}] ${name} has no new steps (earned=${earnedSteps}, rewarded=${rewardedSteps})`);
          if (sendPlayersFailureMessages) player.sendMessage(`§c[ScoreReward] No new reward step for "${rewardName}"`);
          continue;
        }

        // Filters
        if (!passesRewardFilters(player, config, rewardName)) continue;

        // Reward + Track
        player.runCommandAsync(`scoreboard players set "${name}" ${trackerObj.id} ${earnedSteps}`);
        if (config.sendMessage) player.sendMessage(config.sendMessage);
        if (config.runCommand) {
          const cmd = config.runCommand.replace(/%player%/g, `"${name}"`);
          player.runCommandAsync(cmd);
        }
        if (config.logToMenu) addLog(`[Reward:${rewardName}] ${name} has earned ${scoreValue} on ${objectiveName}`);
        if (logToConsole) console.warn(`[ScoreReward: ${rewardName}] ${name} SUCCESS (step ${earnedSteps})`);
        continue;
      }
    }
  }
}, 20);


function passesRewardFilters(player, config, rewardName) {
  const dim = player.dimension.id;
  const { x, y, z } = player.location;
  const name = player.nameTag;

  const fail = (reason) => {
    if (config.logToConsole) {
      console.warn(`[Reward-Fail: ${rewardName}] ${name}: ${reason}`);
    }
    if (config.sendPlayersFailureMessages) {
      player.sendMessage(`§c[Reward] Failed: ${reason}`);
    }
    return false;
  };

  // ─── Dimension ──────────────────────────────────────────────────────
  const dimId = player.dimension.id.replace("minecraft:", ""); // normalize
const validDims = (config.dimensionFilter ?? []).map(d => d.replace("minecraft:", ""));
if (!validDims.includes(dimId)) {
  return fail(`Wrong dimension (${dimId})`);
}

  // ─── Location ───────────────────────────────────────────────────────
  if (config.locationFilterEnabled) {
    const loc = config.playerLocation;
    if (
      x < loc.x.min || x > loc.x.max ||
      y < loc.y.min || y > loc.y.max ||
      z < loc.z.min || z > loc.z.max
    ) {
      return fail(`outside location range: (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`);
    }
  }

  // ─── Tags ───────────────────────────────────────────────────────────
  const tags = player.getTags();
  const mustInclude = config.tagFilter.filter(t => !t.startsWith("!"));
  const mustExclude = config.tagFilter.filter(t => t.startsWith("!")).map(t => t.slice(1));

  for (const tag of mustExclude) {
    if (tags.includes(tag)) return fail(`excluded tag "${tag}"`);
  }

  if (mustInclude.length > 0 && !mustInclude.some(t => tags.includes(t))) {
    return fail(`missing required tag`);
  }

  // ─── Score Filter ───────────────────────────────────────────────────
  const scoreCfg = config.requiredScoreFilter;
  if (scoreCfg.objective !== "none") {
    const filterObj = createScoreboardIfNotExists(scoreCfg.objective, toTitleCase(scoreCfg.objective));
    const val = getScoreSafe(player, filterObj.id);
    if (typeof val !== "number") return fail(`missing score on "${scoreCfg.objective}"`);
    if (val < scoreCfg.min || val > scoreCfg.max) {
      return fail(`score ${val} not in range ${scoreCfg.min}..${scoreCfg.max}`);
    }
  }

  return true;
}
