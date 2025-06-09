import { world, system, Container } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { adminMainMenu, createScoreboardIfNotExists, getScoreSafe} from "./main.js";
import { loadAdminConfig, saveAdminConfig, defaultAdminConfig, adminConfig } from "./adminSettings.js";
import { checkBannedPlayers } from "./afk.js";
import { loadPlaytimeCounters, playtimeCounters } from "./playtimeCounter.js";
import { loadRatioConfigs } from "./ratio.js";



// prefix for our single dynamic property
const BASIC_PREFIX = "basicCounterConfig:all";

// 1. Default on/off settings for each basic counter
export const defaultBasicCounterConfigs = {
  currency:      true,
  currencyObjectiveName: "money",
  currencyActionBar: true,
  currencyActionBarFormat: "a",
  pvpKill:      true,
  pvpKillActionBar: true,
  pvpActionBarFormat: "6",
  killCoins:  true,
  killCoinsActionBar: true,
  killCoinsActionBarFormat: "c",
  death:        true,
  deathActionBar: true,
  deathActionBarFormat: "c",
  monster:      true,
  monsterActionBar: true,
  monsterActionBarFormat: "3",
  mobs:         true,
  mobsActionBar: true,
  mobsActionBarFormat: "5",
  playerJoin:   true,
  totalPlayers: true,
  blocksPlaced: true,
  blocksPlacedActionBar: true,
  blocksPlacedActionBarFormat: "n",
  blocksBroken: true,
  blocksBrokenActionBar: true,
  blocksBrokenActionBarFormat: "p",
  playtime:    true,
  playtimeActionBar: false,
  playtimeActionBarFormat: "e",
  distanceTraveled: true,
  distanceTraveledActionBar: false,
  distanceTraveledActionBarFormat: "a",
  coordinateScore: false,
  coordinateScoreActionBar: false,
  coordinateScoreActionBarFormat: "s",
  containersOpened: true,
  containersOpenedActionBar: true,
  containersOpenedActionBarFormat: "u",
  globalActionBar: false, 
  globalActionBarPlayerName: false,
  playerTagFilter: [],
  playerScoreFilter: { objective: "none", min: 1, max: 1 },
  playerLocationFilterEnabled:"false",
  playerLocationFilter:{x:0 , y:0, z:0},
  globalActionBarPlayerNameFormat: "7",
  globalActionBarFormat: "l",
  defaultKDRatio: true,
  defaultKDRatioFormat: "r",
  defaultBPBRatio: true,
  defaultBPBRatioFormat: "r"
};

//----------------Load And Save ------------------------
export let basicCounterConfigs = {};

export function saveBasicCounterConfigs() {
  try {
    world.setDynamicProperty(
      BASIC_PREFIX,
      JSON.stringify(basicCounterConfigs)
    );
  } catch (e) {
    console.error("[Save] Failed to save basic counter configs:", e);
  }
}


export function loadBasicCounterConfigs() {
  try {
    const raw = world.getDynamicProperty(BASIC_PREFIX);
    if (raw) {
      // merge saved values over the defaults
      basicCounterConfigs = {
        ...defaultBasicCounterConfigs,
        ...JSON.parse(raw),
      };
    } else {
      // nothing saved yet—use all defaults
      basicCounterConfigs = { ...defaultBasicCounterConfigs };
    }
  } catch (e) {
    console.warn("[Load] Error loading basic counter configs:", e);
    // on parse error, fall back cleanly
    basicCounterConfigs = { ...defaultBasicCounterConfigs };
  }
}


//---------------------------------------------------------

export function defaultCountersMenu(player) {
    const form = new ActionFormData()
      .title("\u00a7l\u00a73Default Counters")
      .body("Select an Option:")
      .button("\u00a7lManage Default Counters")
      .button("\u00a7lAction Bar Settings")
      .button("\u00a7lBack");
  
    form.show(player).then((response) => {
      if (response.canceled) return;
  
      switch (response.selection) {
        case 0:
          manageDefaultCountersMenu(player);
          break;
        case 1:
          globalActionBarManagerMenu(player);
          break;
        case 2:
          adminMainMenu(player);
          break;
      }
    });
  }

//-------------------Action Bar Manager Menu-------------------


export function globalActionBarManagerMenu(player) {
  loadBasicCounterConfigs();

  // Capture initial values
  const init_globalAB = basicCounterConfigs.globalActionBar;
  const init_globalABName = basicCounterConfigs.globalActionBarPlayerName;
  const init_playerNameFmt = basicCounterConfigs.globalActionBarPlayerNameFormat || "";
  const init_globalFmt = basicCounterConfigs.globalActionBarFormat || "";
  const init_tagFilterStr = Array.isArray(basicCounterConfigs.playerTagFilter)
    ? basicCounterConfigs.playerTagFilter.join(",")
    : "";
  const init_scoreObjective = basicCounterConfigs.playerScoreFilter?.objective || "";
  const init_scoreRangeStr = (() => {
    const sf = basicCounterConfigs.playerScoreFilter;
    if (!sf || sf.objective === "none") return "";
    const min = sf.min;
    const max = sf.max;
    if (min === max) return `${min}`;
    if (min <= 0 && max > 0) return `..${max}`;
    if (max >= Number.MAX_SAFE_INTEGER) return `${min}..`;
    return `${min}..${max}`;
  })();
  const init_locationFilterEnabled = Boolean(basicCounterConfigs.playerLocationFilterEnabled);
  const init_locationRangesStr = (() => {
    const loc = basicCounterConfigs.playerLocation;
    if (
      !loc ||
      typeof loc.x?.min !== "number" ||
      typeof loc.x?.max !== "number" ||
      typeof loc.y?.min !== "number" ||
      typeof loc.y?.max !== "number" ||
      typeof loc.z?.min !== "number" ||
      typeof loc.z?.max !== "number"
    ) {
      return "";
    }
    const xMin = loc.x.min;
    const xMax = loc.x.max;
    const yMin = loc.y.min;
    const yMax = loc.y.max;
    const zMin = loc.z.min;
    const zMax = loc.z.max;

    const formatRange = (min, max) => {
      if (min === max) return `${min}`;
      if (min <= Number.MIN_SAFE_INTEGER && max > Number.MIN_SAFE_INTEGER) return `..${max}`;
      if (max >= Number.MAX_SAFE_INTEGER) return `${min}..`;
      return `${min}..${max}`;
    };

    return `${formatRange(xMin, xMax)},${formatRange(yMin, yMax)},${formatRange(zMin, zMax)}`;
  })();

  const form = new ModalFormData()
    .title("Action Bar Manager")
    // Existing toggles
    .toggle("Global ActionBar Enabled", init_globalAB)
    .toggle("ActionBar PlayerName Enabled", init_globalABName)
    // Existing text fields
    .textField(
      `PlayerName Color ("a-u" or "0-9")`,
      init_playerNameFmt
    )
    .textField(
      `Global ActionBar Format ("l" or "o" or "r")`,
      init_globalFmt
    )
    // Player Tag Filter (comma-separated)
    .textField(
      "Player Tag Filter (comma-separated)",
      init_tagFilterStr
    )
    // Score Objective (none for no filter)
    .textField(
      "Player Score Objective (\"none\" for no filter)",
      init_scoreObjective
    )
    // Single range field for score
    .textField(
      'Player Score Range (e.g., "..1", "1..", "1..10", or "5")',
      init_scoreRangeStr
    )
    // New: single text field for location ranges (x,y,z)
    .textField(
      'Player Location Ranges (x,y,z) (e.g. "-100..100,-100..100,-100..100")',
      init_locationRangesStr
    )
    // Toggle for enabling/disabling location filter
    .toggle(
      "Player Location Filter Enabled",
      init_locationFilterEnabled
    );

  form.show(player).then((response) => {
    if (response.canceled) return;

    const [
      globalAB,
      globalABName,
      globalNameFmt,
      globalFmt,
      tagFilterStr,
      scoreObjective,
      scoreRangeStr,
      locationRangesStr,
      locationFilterEnabled,
    ] = response.formValues;

    // Always write toggles (setting to same value if unchanged is fine)
    basicCounterConfigs.globalActionBar = globalAB;
    basicCounterConfigs.globalActionBarPlayerName = globalABName;

    // Only overwrite playerNameFormat if user entered a non-empty string
    // and that string is different from the initial value.
    const newPlayerNameFmt = globalNameFmt.trim();
    if (newPlayerNameFmt !== "" && newPlayerNameFmt !== init_playerNameFmt) {
      basicCounterConfigs.globalActionBarPlayerNameFormat = newPlayerNameFmt;
    }

    // Only overwrite global action-bar format if user entered a non-empty string
    // and that string is different from the initial value.
    const newGlobalFmt = globalFmt.trim();
    if (newGlobalFmt !== "" && newGlobalFmt !== init_globalFmt) {
      basicCounterConfigs.globalActionBarFormat = newGlobalFmt;
    }

    // Only update tagFilter if edited
    if (tagFilterStr !== init_tagFilterStr) {
      if (tagFilterStr.trim() !== "") {
        basicCounterConfigs.playerTagFilter = tagFilterStr
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      } else {
        basicCounterConfigs.playerTagFilter = [];
      }
    }

    // Only update score objective if edited
    if (scoreObjective !== init_scoreObjective) {
      basicCounterConfigs.playerScoreFilter.objective =
        scoreObjective.trim() === "" ? "none" : scoreObjective.trim();
    }

    // Only update score range if edited
    if (scoreRangeStr !== init_scoreRangeStr) {
      let min = 0;
      let max = Number.MAX_SAFE_INTEGER;
      const range = scoreRangeStr.trim();

      if (range.includes("..")) {
        const parts = range.split("..");
        const left = parts[0].trim();
        const right = parts[1].trim();

        if (left !== "") {
          const parsedMin = parseInt(left, 10);
          if (!isNaN(parsedMin)) min = parsedMin;
        }

        if (right !== "") {
          const parsedMax = parseInt(right, 10);
          if (!isNaN(parsedMax)) max = parsedMax;
        }
      } else if (range !== "") {
        const exact = parseInt(range, 10);
        if (!isNaN(exact)) {
          min = exact;
          max = exact;
        }
      }

      basicCounterConfigs.playerScoreFilter.min = min;
      basicCounterConfigs.playerScoreFilter.max = max;
    }

    // Only update location filter toggle if edited
    if (locationFilterEnabled !== init_locationFilterEnabled) {
      basicCounterConfigs.playerLocationFilterEnabled = Boolean(locationFilterEnabled);
    }

    // Only update location ranges if edited and nonempty
    if (
      locationRangesStr.trim() !== "" &&
      locationRangesStr !== init_locationRangesStr
    ) {
      const coords = locationRangesStr
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // Ensure we have exactly three parts: [xRange, yRange, zRange]
      if (coords.length === 3) {
        const parseCoordRange = (coordRange) => {
          let min = Number.MIN_SAFE_INTEGER;
          let max = Number.MAX_SAFE_INTEGER;
          if (coordRange.includes("..")) {
            const parts = coordRange.split("..");
            const left = parts[0].trim();
            const right = parts[1].trim();

            if (left !== "") {
              const parsedMin = parseInt(left, 10);
              if (!isNaN(parsedMin)) min = parsedMin;
            }
            if (right !== "") {
              const parsedMax = parseInt(right, 10);
              if (!isNaN(parsedMax)) max = parsedMax;
            }
          } else {
            const exact = parseInt(coordRange, 10);
            if (!isNaN(exact)) {
              min = exact;
              max = exact;
            }
          }
          return { min, max };
        };

        const [xRange, yRange, zRange] = coords;
        const xObj = parseCoordRange(xRange);
        const yObj = parseCoordRange(yRange);
        const zObj = parseCoordRange(zRange);

        basicCounterConfigs.playerLocation = {
          x: { min: xObj.min, max: xObj.max },
          y: { min: yObj.min, max: yObj.max },
          z: { min: zObj.min, max: zObj.max },
        };
      }
      // If the user provided an invalid format (not 3 comma-separated parts),
      // simply ignore and keep the existing values.
    }

    saveBasicCounterConfigs();
    loadBasicCounterConfigs(); // reload to apply changes
    player.sendMessage("§aAction-bar settings updated!");
  });
}







//-------------------Manage Default Counters Menu-------------------

export function manageDefaultCountersMenu(player) {
  // 1) Load all basic‐counter settings (including ratio flags)
  loadBasicCounterConfigs();

  // 2) Pull out “initial” values (fallback to defaults if missing)
  const {
    currency,
    currencyObjectiveName,
    currencyActionBar,
    currencyActionBarFormat,
    pvpKill,
    pvpKillActionBar,
    pvpActionBarFormat,
    killCoins,
    killCoinsActionBar,
    killCoinsActionBarFormat,
    death,
    deathActionBar,
    deathActionBarFormat,
    monster,
    monsterActionBar,
    monsterActionBarFormat,
    mobs,
    mobsActionBar,
    mobsActionBarFormat,
    blocksPlaced,
    blocksPlacedActionBar,
    blocksPlacedActionBarFormat,
    blocksBroken,
    blocksBrokenActionBar,
    blocksBrokenActionBarFormat,
    playtime,
    playtimeActionBar,
    playtimeActionBarFormat,
    distanceTraveled,
    distanceTraveledActionBar,
    distanceTraveledActionBarFormat,
    coordinateScore,
    coordinateScoreActionBar,
    coordinateScoreActionBarFormat,
    containersOpened,
    containersOpenedActionBar,
    containersOpenedActionBarFormat,
    defaultKDRatio,
    defaultKDRatioFormat,
    defaultBPBRatio,
    defaultBPBRatioFormat
  } = basicCounterConfigs;

  // 3) Build the form, in the exact order of inputs we want
  const form = new ModalFormData()
    .title("Default Counters")

    // — Currency Counter —
    .toggle(
      `Currency Enabled\n(${currencyObjectiveName})`,
      currency
    )
    .textField(
      "Currency Objective Name",
      currencyObjectiveName || ""
    )
    .toggle("Currency ActionBar", currencyActionBar)
    .textField(
      `Currency ActionBar Color ("a-u" or "0-9")`,
      currencyActionBarFormat || ""
    )

    // — PvP Kill Counter —
    .toggle("PvP Kills Enabled\n(kills)", pvpKill)
    .toggle("PvP ActionBar", pvpKillActionBar)
    .textField(
      `PvP ActionBar Color ("a-u" or "0-9")`,
      pvpActionBarFormat || ""
    )

    // — Kill Coins Counter —
    .toggle("Kill Coins Enabled\n(kill_coins)", killCoins)
    .toggle("Kill Coins ActionBar", killCoinsActionBar)
    .textField(
      `Kill Coins ActionBar Color ("a-u" or "0-9")`,
      killCoinsActionBarFormat || ""
    )

    // — K/D Ratio ActionBar (new) —
    .toggle("K/D Ratio ActionBar", defaultKDRatio)
    .textField("K/D Ratio Format Code (a-u or 0-9)", defaultKDRatioFormat || "")

    // — Death Counter —
    .toggle("Death Counter Enabled\n(deaths)", death)
    .toggle("Death ActionBar", deathActionBar)
    .textField(
      "Death ActionBar Color",
      deathActionBarFormat || ""
    )

    // — Monster Kill Counter —
    .toggle("Monster Counter Enabled\n(monster_kills)", monster)
    .toggle("Monster ActionBar", monsterActionBar)
    .textField(
      `Monster ActionBar Color ("a-u" or "0-9")`,
      monsterActionBarFormat || ""
    )

    // — Mob Kill Counter —
    .toggle("Mobs Counter Enabled\n(mob_kills)", mobs)
    .toggle("Mobs ActionBar", mobsActionBar)
    .textField(
      `Mobs ActionBar Color ("a-u" or "0-9")`,
      mobsActionBarFormat || ""
    )

    // — Blocks Placed Counter —
    .toggle("Blocks Placed Enabled\n(blocks_placed)", blocksPlaced)
    .toggle("Blocks Placed ActionBar", blocksPlacedActionBar)
    .textField(
      `Blocks Placed ActionBar Color ("a-u" or "0-9")`,
      blocksPlacedActionBarFormat || ""
    )

    // — Blocks Broken Counter —
    .toggle("Blocks Broken Enabled\n(blocks_broken)", blocksBroken)
    .toggle("Blocks Broken ActionBar", blocksBrokenActionBar)
    .textField(
      `Blocks Broken ActionBar Color ("a-u" or "0-9")`,
      blocksBrokenActionBarFormat || ""
    )

    // — Blocks Placed/Broken Ratio ActionBar (new) —
    .toggle("Blocks Ratio ActionBar", defaultBPBRatio)
    .textField(
      "Blocks Ratio Format Code (a-u or 0-9)",
      defaultBPBRatioFormat || ""
    )

    // — Playtime Counter —
    .toggle(
      "Playtime Enabled\n(playtime_seconds,playtime_minutes,playtime_hours,playtime_days)",
      playtime
    )
    .toggle("Playtime ActionBar", playtimeActionBar)
    .textField(
      `Playtime Action Bar Color ("a-u" or "0-9")`,
      playtimeActionBarFormat || ""
    )

    // — Distance Traveled Counter —
    .toggle(
      "Distance Traveled Enabled\n(distance_traveled)",
      distanceTraveled
    )
    .toggle("Distance Traveled ActionBar", distanceTraveledActionBar)
    .textField(
      `Distance Traveled ActionBar Color ("a-u" or "0-9")`,
      distanceTraveledActionBarFormat || ""
    )

    // — Coordinate Score Counter —
    .toggle("Coordinate Score Enabled\n(coord_x,coord_y,coord_z)", coordinateScore)
    .toggle("Coordinate Score ActionBar", coordinateScoreActionBar)
    .textField(
      `Coordinate Score ActionBar Color ("a-u" or "0-9")`,
      coordinateScoreActionBarFormat || ""
    )

    // — Containers Opened Counter —
    .toggle("Containers Opened Enabled\n(containers_opened)", containersOpened)
    .toggle("Containers Opened ActionBar", containersOpenedActionBar)
    .textField(
      `Containers Opened ActionBar Color ("a-u" or "0-9")`,
      containersOpenedActionBarFormat || ""
    );

  form.show(player).then((response) => {
    if (response.canceled) return;

    // 4) Unpack formValues in that exact order:
    const [
      currency,
      currencyObjName,
      currencyAB,
      currencyFmt,
      pvpKill,
      pvpKillAB,
      pvpFmt,
      killCoins,
      killCoinsAB,
      killCoinsFmt,
      kdAB,
      kdFmt,
      death,
      deathAB,
      deathFmt,
      monster,
      monsterAB,
      monsterFmt,
      mobs,
      mobsAB,
      mobsFmt,
      blocksPlaced,
      blocksPlacedAB,
      blocksPlacedFmt,
      blocksBroken,
      blocksBrokenAB,
      blocksBrokenFmt,
      bpbrAB,
      bpbrFmt,
      playtime,
      playtimeAB,
      playtimeFmt,
      distanceTraveled,
      distanceTraveledAB,
      distanceTraveledFmt,
      coordinateScore,
      coordinateScoreAB,
      coordinateScoreFmt,
      containersOpened,
      containersOpenedAB,
      containersOpenedFmt
    ] = response.formValues;

    // 5) Overwrite basicCounterConfigs exactly as before:
    basicCounterConfigs.currency = Boolean(currency);
    basicCounterConfigs.currencyObjectiveName =
      currencyObjName.trim() || basicCounterConfigs.currencyObjectiveName;
    basicCounterConfigs.currencyActionBar = Boolean(currencyAB);
    if (currencyFmt.trim() !== "") {
      basicCounterConfigs.currencyActionBarFormat = currencyFmt.trim();
    }

    basicCounterConfigs.pvpKill = Boolean(pvpKill);
    basicCounterConfigs.pvpKillActionBar = Boolean(pvpKillAB);
    if (pvpFmt.trim() !== "") {
      basicCounterConfigs.pvpActionBarFormat = pvpFmt.trim();
    }

    basicCounterConfigs.killCoins = Boolean(killCoins);
    basicCounterConfigs.killCoinsActionBar = Boolean(killCoinsAB);
    if (killCoinsFmt.trim() !== "") {
      basicCounterConfigs.killCoinsActionBarFormat = killCoinsFmt.trim();
    }

    basicCounterConfigs.death = Boolean(death);
    basicCounterConfigs.deathActionBar = Boolean(deathAB);
    if (deathFmt.trim() !== "") {
      basicCounterConfigs.deathActionBarFormat = deathFmt.trim();
    }

    basicCounterConfigs.monster = Boolean(monster);
    basicCounterConfigs.monsterActionBar = Boolean(monsterAB);
    if (monsterFmt.trim() !== "") {
      basicCounterConfigs.monsterActionBarFormat = monsterFmt.trim();
    }

    basicCounterConfigs.mobs = Boolean(mobs);
    basicCounterConfigs.mobsActionBar = Boolean(mobsAB);
    if (mobsFmt.trim() !== "") {
      basicCounterConfigs.mobsActionBarFormat = mobsFmt.trim();
    }

    basicCounterConfigs.blocksPlaced = Boolean(blocksPlaced);
    basicCounterConfigs.blocksPlacedActionBar = Boolean(blocksPlacedAB);
    if (blocksPlacedFmt.trim() !== "") {
      basicCounterConfigs.blocksPlacedActionBarFormat =
        blocksPlacedFmt.trim();
    }

    basicCounterConfigs.blocksBroken = Boolean(blocksBroken);
    basicCounterConfigs.blocksBrokenActionBar = Boolean(blocksBrokenAB);
    if (blocksBrokenFmt.trim() !== "") {
      basicCounterConfigs.blocksBrokenActionBarFormat =
        blocksBrokenFmt.trim();
    }

    basicCounterConfigs.playtime = Boolean(playtime);
    basicCounterConfigs.playtimeActionBar = Boolean(playtimeAB);
    if (playtimeFmt.trim() !== "") {
      basicCounterConfigs.playtimeActionBarFormat = playtimeFmt.trim();
    }

    basicCounterConfigs.distanceTraveled = Boolean(distanceTraveled);
    basicCounterConfigs.distanceTraveledActionBar =
      Boolean(distanceTraveledAB);
    if (distanceTraveledFmt.trim() !== "") {
      basicCounterConfigs.distanceTraveledActionBarFormat =
        distanceTraveledFmt.trim();
    }

    basicCounterConfigs.coordinateScore = Boolean(coordinateScore);
    basicCounterConfigs.coordinateScoreActionBar = Boolean(coordinateScoreAB);
    if (coordinateScoreFmt.trim() !== "") {
      basicCounterConfigs.coordinateScoreActionBarFormat =
        coordinateScoreFmt.trim();
    }

    basicCounterConfigs.containersOpened = Boolean(containersOpened);
    basicCounterConfigs.containersOpenedActionBar =
      Boolean(containersOpenedAB);
    if (containersOpenedFmt.trim() !== "") {
      basicCounterConfigs.containersOpenedActionBarFormat =
        containersOpenedFmt.trim();
    }

    // 6) Save all of the basicCounterConfigs
    saveBasicCounterConfigs();

    // 7) Overwrite the two ratio flags now
    basicCounterConfigs.defaultKDRatio = Boolean(kdAB);
    if (kdFmt.trim() !== "") {
      basicCounterConfigs.defaultKDRatioFormat = kdFmt.trim();
    }

    basicCounterConfigs.defaultBPBRatio = Boolean(bpbrAB);
    if (bpbrFmt.trim() !== "") {
      basicCounterConfigs.defaultBPBRatioFormat = bpbrFmt.trim();
    }

    // 8) Save again so those ratio flags persist
    saveBasicCounterConfigs();

    // 9) Confirmation message
    player.sendMessage("§aDefault counters updated!");
  });
}



//-------------------Kill/Death Events----------------------------



world.afterEvents.entityDie.subscribe(event => {
  const { deadEntity, damageSource } = event;
  const killer = damageSource?.damagingEntity;

  // ─── PvP Kills ─────────────────────────────────────────────────────────────
if (
  basicCounterConfigs.pvpKill &&
  killer?.typeId === "minecraft:player" &&
  deadEntity.typeId === "minecraft:player"
) {
  // — Increment the “Kills” scoreboard —
  const killsObj = createScoreboardIfNotExists("kills", "Kills");
  const totalKillsObj = createScoreboardIfNotExists("total_kills", "Total Kills");
  const newKills = getScoreSafe(killer, killsObj.id) + 1;
  killsObj.setScore(killer, newKills);
  totalKillsObj.setScore("total_kills", getScoreSafe("total_kills", totalKillsObj.id) + 1);

  // — Show PvP Kills action bar if enabled (and globalActionBar is off) —
  if (basicCounterConfigs.pvpActionBar && !basicCounterConfigs.globalActionBar) {
    const fmtKey = basicCounterConfigs.pvpActionBarFormat || "";
    const prefix = fmtKey.length === 1
      ? `§${fmtKey}`
      : fmtKey.startsWith("§")
        ? fmtKey
        : "";

    const raw = JSON.stringify({
      rawtext: [
        { text: `${prefix}Kills: +1 - ` },
        { score: { name: "@s", objective: "kills" } }
      ]
    });
    killer.runCommandAsync(`/titleraw @s actionbar ${raw}`);
  }
}
  // ─── Kill Coins Logic ────────────────────────────────────────────────────
  if (basicCounterConfigs.killCoins && killer?.typeId === "minecraft:player" &&
  deadEntity.typeId === "minecraft:player") {
    // 1) Increment the “Kill Coins” scoreboard
    const coinsObj = createScoreboardIfNotExists("kill_coins", "Kill Coins");
    const totalCoinsObj = createScoreboardIfNotExists("total_kill_coins", "Total Kill Coins");
    const newCoinsScore = getScoreSafe(killer, coinsObj.id) + 1;
    coinsObj.setScore(killer, newCoinsScore);
    totalCoinsObj.setScore("total_kill_coins", getScoreSafe("total_kill_coins", totalCoinsObj.id) + 1);

    // 2) Show Kill Coins action bar if enabled (and globalActionBar is off)
    if (basicCounterConfigs.killCoinsActionBar && !basicCounterConfigs.globalActionBar) {
      const coinFmtKey = basicCounterConfigs.killCoinsActionBarFormat || "";
      const coinPrefix = coinFmtKey.length === 1
        ? `§${coinFmtKey}`
        : coinFmtKey.startsWith("§")
          ? coinFmtKey
          : "";

      const coinRaw = JSON.stringify({
        rawtext: [
          { text: `${coinPrefix}Kill Coins: +1 - ` },
          { score: { name: "@s", objective: "kill_coins" } }
        ]
      });
      killer.runCommandAsync(`/titleraw @s actionbar ${coinRaw}`);
    }
  }

  // ─── Player Deaths ─────────────────────────────────────────────────────────
  if (
    basicCounterConfigs.death &&
    deadEntity.typeId === "minecraft:player"
  ) {
    const obj = createScoreboardIfNotExists("deaths", "Deaths");
    const totalDeathsObj = createScoreboardIfNotExists("total_deaths", "Total Deaths");
    obj.setScore(deadEntity, getScoreSafe(deadEntity, obj.id) + 1);
    totalDeathsObj.setScore("total_deaths", getScoreSafe("total_deaths", totalDeathsObj.id) + 1);
 if (basicCounterConfigs.deathActionBar && !basicCounterConfigs.globalActionBar) {
    const fmtKey = basicCounterConfigs.deathActionBarFormat || "";
    const prefix = fmtKey.length === 1
      ? `§${fmtKey}`
      : fmtKey.startsWith("§")
        ? fmtKey
        : "";

    const raw = JSON.stringify({
      rawtext: [
        { text: `${prefix}Deaths: +1 - ` },
        { score: { name: "@s", objective: "deaths" } }
      ]
    });

    deadEntity.runCommandAsync(`/titleraw @s actionbar ${raw}`);
  }
}
  // ─── Monster Kills ─────────────────────────────────────────────────────────
  const familyComp = deadEntity.getComponent("minecraft:type_family");
  if (
    basicCounterConfigs.monster &&
    killer?.typeId === "minecraft:player" &&
    familyComp?.hasTypeFamily("monster")
  ) {
    const obj = createScoreboardIfNotExists("monster_kills", "Monster Kills");
    const totalMonsterKillsObj = createScoreboardIfNotExists("total_monster_kills", "Total Monster Kills");
    obj.setScore(killer, getScoreSafe(killer, obj.id) + 1);
    totalMonsterKillsObj.setScore("total_monster_kills", getScoreSafe("total_monster_kills", totalMonsterKillsObj.id) + 1);

if (basicCounterConfigs.monsterActionBar && !basicCounterConfigs.globalActionBar) {
    const fmtKey = basicCounterConfigs.monsterActionBarFormat || "";
    const prefix = fmtKey.length === 1
      ? `§${fmtKey}`
      : fmtKey.startsWith("§")
        ? fmtKey
        : "";

    const raw = JSON.stringify({
      rawtext: [
        { text: `${prefix}Monster Kills: +1 - ` },
        { score: { name: "@s", objective: "monster_kills" } }
      ]
    });

    killer.runCommandAsync(`/titleraw @s actionbar ${raw}`);
  }
  }
  // ─── Mob Kills ──────────────────────────────────────────────────────────────
  if (
    basicCounterConfigs.mobs &&
    killer?.typeId === "minecraft:player" &&
    familyComp?.hasTypeFamily("mob")
  ) {
    const obj = createScoreboardIfNotExists("mob_kills", "Mob Kills");
    const totalMobKillsObj = createScoreboardIfNotExists("total_mob_kills", "Total Mob Kills");
    obj.setScore(killer, getScoreSafe(killer, obj.id) + 1);
    totalMobKillsObj.setScore("total_mob_kills", getScoreSafe("total_mob_kills", totalMobKillsObj.id) + 1);

  if (basicCounterConfigs.mobsActionBar && !basicCounterConfigs.globalActionBar) {
    const fmtKey = basicCounterConfigs.mobsActionBarFormat || "";
    const prefix = fmtKey.length === 1
      ? `§${fmtKey}`
      : fmtKey.startsWith("§")
        ? fmtKey
        : "";

    const raw = JSON.stringify({
      rawtext: [
        { text: `${prefix}Mob Kills: +1 - ` },
        { score: { name: "@s", objective: "mob_kills" } }
      ]
    });

    killer.runCommandAsync(`/titleraw @s actionbar ${raw}`);
  }
}
});

//--------------------Blocks Broken Event----------------------------

world.afterEvents.playerBreakBlock.subscribe(event => {
    const player = event.player;
    if (!player || !basicCounterConfigs.blocksBroken) return;
    const obj = createScoreboardIfNotExists("blocks_broken", "Blocks Broken");
    const totalBlocksBrokenObj = createScoreboardIfNotExists("total_blocks_broken", "Total Blocks Broken");
    obj.setScore(player, getScoreSafe(player, obj.id) + 1);
    totalBlocksBrokenObj.setScore("total_blocks_broken", getScoreSafe("total_blocks_broken", totalBlocksBrokenObj.id) + 1);
    if (basicCounterConfigs.blocksBrokenActionBar && !basicCounterConfigs.globalActionBar) {
      const fmtKey = basicCounterConfigs.blocksBrokenActionBarFormat || "";
      const prefix = fmtKey.length === 1
        ? `§${fmtKey}`
        : fmtKey.startsWith("§")
          ? fmtKey
          : "";

      const raw = JSON.stringify({
        rawtext: [
          { text: `${prefix}Blocks Broken: +1 - ` },
          { score: { name: "@s", objective: "blocks_broken" } }
        ]
      });

      player.runCommandAsync(`/titleraw @s actionbar ${raw}`);
}})

//----------------------------------------------------------------------------

//--------------------Blocks Placed Event-------------------------------------

world.afterEvents.playerPlaceBlock.subscribe(event => {
  const player = event.player;
  if (!player || !basicCounterConfigs.blocksPlaced) return;

  // — Blocks Placed —
  const obj = createScoreboardIfNotExists("blocks_placed", "Blocks Placed");
  const totalBlocksPlacedObj = createScoreboardIfNotExists("total_blocks_placed", "Total Blocks Placed");
  obj.setScore(player, getScoreSafe(player, obj.id) + 1);
  totalBlocksPlacedObj.setScore("total_blocks_placed", getScoreSafe("total_blocks_placed", totalBlocksPlacedObj.id) + 1);
  

  // — Action Bar —
  if (basicCounterConfigs.blocksPlacedActionBar && !basicCounterConfigs.globalActionBar) {
    const fmtKey = basicCounterConfigs.blocksPlacedActionBarFormat || "";
    const prefix = fmtKey.length === 1
      ? `§${fmtKey}`
      : fmtKey.startsWith("§")
        ? fmtKey
        : "";

    const raw = JSON.stringify({
      rawtext: [
        { text: `${prefix}Blocks Placed: +1 - ` },
        { score: { name: "@s", objective: "blocks_placed" } }
      ]
    });

    player.runCommandAsync(`/titleraw @s actionbar ${raw}`);
  }
});



//---------------------------------------------------------------------------

//--------------------Player Join Event--------------------------------------


world.afterEvents.playerJoin.subscribe(ev => {
  const name = ev.playerName;   // Minecraft username
  const xuid = ev.playerId;     // XUID (not used here)

  // ─── Unique Total-Players Count ─────────────────────────────────────────
  if (basicCounterConfigs.totalPlayers) {
    const firstJoinObj    = createScoreboardIfNotExists("first_join",    "First Join");
    const totalPlayersObj = createScoreboardIfNotExists("totalPlayers", "Total Players");

    const prevFirst = getScoreSafe(name, firstJoinObj.id) || 0;
    if (prevFirst < 1) {
      firstJoinObj.setScore(name, 1);

      const prevTotal = getScoreSafe("total_players", totalPlayersObj.id) || 0;
      totalPlayersObj.setScore("total_players", prevTotal + 1);

    }
  }

  // ─── Per-Player Join Counter ─────────────────────────────────────────────
  if (basicCounterConfigs.playerJoin) {
    const joinObj   = createScoreboardIfNotExists("playerJoin", "Joins");
    const totalJoinsObj = createScoreboardIfNotExists("total_players_joined", "Total Players Joined");
    const prevJoins = getScoreSafe(name, joinObj.id) || 0;
    joinObj.setScore(name, prevJoins + 1);
    totalJoinsObj.setScore("total_players_joined", getScoreSafe("total_players_joined", totalJoinsObj.id) + 1);
  }

  // ─── Seed Known Players for Ban Menu ────────────────────────────────────
  const adminConfig = loadAdminConfig() || defaultAdminConfig;
  if (!adminConfig.knownPlayers.includes(name)) {
    adminConfig.knownPlayers.push(name);
    saveAdminConfig(adminConfig);
  }

  // ─── Reset Playtime Counters on Rejoin (resetOnLogout) ─────────────────
  // Load all playtime counters into memory
  loadPlaytimeCounters();

  // Loop through each configured playtime counter
  for (const counterName in playtimeCounters) {
    const cfg = playtimeCounters[counterName];
    if (cfg.resetOnLogout) {
      // We want to reset only this player's score in each of the four time objectives
      const overworld = world.getDimension("overworld");

      // If an objective name is defined, reset that player's score on it
      if (cfg.secondsObjectiveName) {
        overworld.runCommand(
          `scoreboard players reset "${name}" ${cfg.secondsObjectiveName}`
        );
      }
      if (cfg.minutesObjectiveName) {
        overworld.runCommand(
          `scoreboard players reset "${name}" ${cfg.minutesObjectiveName}`
        );
      }
      if (cfg.hoursObjectiveName) {
        overworld.runCommand(
          `scoreboard players reset "${name}" ${cfg.hoursObjectiveName}`
        );
      }
      if (cfg.daysObjectiveName) {
        overworld.runCommand(
          `scoreboard players reset "${name}" ${cfg.daysObjectiveName}`
        );
      }
    }
  }

  // ─── Ban Scoreboard & Kick Logic ───────────────────────────────────────
  const banObj       = createScoreboardIfNotExists("ban",      "Ban");
  const banCountObj  = createScoreboardIfNotExists("ban_count","Ban Count");
  const overworld    = world.getDimension("overworld");

  if (
    adminConfig.banList.includes(name) &&
    !adminConfig.adminNameList.includes(name)
  ) {
    // Ban: set score to 1, increment ban_count, then kick
    banObj.setScore(name, 1);
    banCountObj.setScore(name, 1);
    checkBannedPlayers();
  } else {
    // Un-ban: ensure the "ban" scoreboard is cleared for this player
    overworld.runCommand(`scoreboard players reset "${name}" ban`);
  }
});




//----------------------------------------------------------------------------

//--------------------Playtime Counter----------------------------------------

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    if (!basicCounterConfigs.playtime) continue;

    const name = player.nameTag;
    // 1) fetch or create the "seconds" objective and bump it by +1
    const secObj   = createScoreboardIfNotExists("playtime_seconds", "Playtime Seconds");
    const totalPlaytimeObj = createScoreboardIfNotExists("total_playtime", "Total Playtime");
    const prevSec  = getScoreSafe(name, secObj.id) || 0;
    const totalSec = prevSec + 1;
    secObj.setScore(name, totalSec);
    totalPlaytimeObj.setScore("total_playtime", getScoreSafe("total_playtime", totalPlaytimeObj.id) + 1);

    // 2) derive and set minutes, hours, days
    const totalMin = Math.floor(totalSec / 60);
    const minObj   = createScoreboardIfNotExists("playtime_minutes", "Playtime Minutes");
    minObj.setScore(name, totalMin);

    const totalHrs = Math.floor(totalSec / 3600);
    const hrObj    = createScoreboardIfNotExists("playtime_hours", "Playtime Hours");
    hrObj.setScore(name, totalHrs);

    const totalDays = Math.floor(totalSec / 86400);
    const dayObj    = createScoreboardIfNotExists("playtime_days", "Playtime Days");
    dayObj.setScore(name, totalDays);

    // 3) optional: action-bar display using your existing format/config
    if (basicCounterConfigs.playtimeActionBar && !basicCounterConfigs.globalActionBar) {
      const fmtKey = basicCounterConfigs.playtimeActionBarFormat || "";
      const prefix = fmtKey.length === 1
        ? `§${fmtKey}`
        : fmtKey.startsWith("§")
          ? fmtKey
          : "";

      // build display string however you like; here’s days/hours/mins
      const hrs  = totalHrs % 24;
      const mins = totalMin % 60;
      const text = `${prefix}${totalDays}d ${hrs}h ${mins}m`;
      const raw  = JSON.stringify({ rawtext:[{ text }] });

      player.runCommandAsync(`/titleraw @s actionbar ${raw}`);
    }
  }
}, 20);  // 20 ticks ≈ 1s



//----------------------------------------------------------------------------



//-------------------- Container Opened Event -----------------------------


world.afterEvents.playerInteractWithBlock.subscribe((event) => {
  const player = event.player;
  const block  = event.block;

  // only proceed if this block really is a container
  const invComp = block.getComponent("minecraft:inventory");
  if (!invComp || !invComp.container.isValid) return;

  // ——— SKIP EMPTY (just-placed) CONTAINERS ———
  const container = invComp.container;
  let foundItem = false;
  for (let slot = 0; slot < container.size; slot++) {
    if (container.getItem(slot)) {
      foundItem = true;
      break;
    }
  }
  if (!foundItem) {
    // no items inside → maybe just placed
    // check player’s held item:
    const pInvComp = player.getComponent("minecraft:inventory");
    const heldItem = pInvComp?.container.getItem(player.selectedSlotIndex ?? 0);
    // if they’re holding the same block type, treat as placement
    if (heldItem && heldItem.typeId === block.type.id) {
      return;
    }
  }

  // respect your config toggle
  if (!basicCounterConfigs.containersOpened) return;

  // ——— scoreboard logic ———
  const obj   = createScoreboardIfNotExists("containers_opened", "Containers Opened");
  const totalContainersOpenedObj = createScoreboardIfNotExists("total_containers_opened", "Total Containers Opened");
  const prev  = getScoreSafe(player.nameTag, obj.id) || 0;
  obj.setScore(player.nameTag, prev + 1);
  totalContainersOpenedObj.setScore("total_containers_opened", getScoreSafe("total_containers_opened", totalContainersOpenedObj.id) + 1);

  // ——— action-bar popup (optional) ———
  if (basicCounterConfigs.containersOpenedActionBar && !basicCounterConfigs.globalActionBar) {
    const fmt    = basicCounterConfigs.containersOpenedActionBarFormat || "";
    const prefix = fmt.length === 1
      ? `§${fmt}`
      : fmt.startsWith("§")
        ? fmt
        : "";
    const text   = `${prefix}Containers Opened: ${prev + 1}`;
    player.runCommandAsync(
      `/titleraw @s actionbar ${JSON.stringify({ rawtext: [{ text }] })}`
    );
  }
});

//----------------------------------------------------------------------------

//-----------------------Action Bar Helpers---------------------------------


function getBlocksAndRatioLine(player) {
  // 1) Read scores & formats from the config
  const bpOn    = basicCounterConfigs.blocksPlacedActionBar;
  const bbOn    = basicCounterConfigs.blocksBrokenActionBar;
  const ratioOn = basicCounterConfigs.defaultBPBRatio;
  
  if (!bpOn && !bbOn && !ratioOn) return null;

  // 2) Fetch “placed” & “broken” scoreboard objectives
  const placedObj = createScoreboardIfNotExists("blocks_placed", "Blocks Placed");
  const placedScore = getScoreSafe(player, placedObj.id) || 0;
  const placedFmt = basicCounterConfigs.blocksPlacedActionBarFormat || "";
  let placedPrefix = "";
  if (placedFmt.length === 1) placedPrefix = `§${placedFmt}`;
  else if (placedFmt.startsWith("§")) placedPrefix = placedFmt;

  const brokenObj = createScoreboardIfNotExists("blocks_broken", "Blocks Broken");
  const brokenScore = getScoreSafe(player, brokenObj.id) || 0;
  const brokenFmt = basicCounterConfigs.blocksBrokenActionBarFormat || "";
  let brokenPrefix = "";
  if (brokenFmt.length === 1) brokenPrefix = `§${brokenFmt}`;
  else if (brokenFmt.startsWith("§")) brokenPrefix = brokenFmt;

  // 3) Compute B/P ratio if needed
  const bbValue = brokenScore > 0
    ? placedScore / brokenScore
    : placedScore;
  const bbFmt2 = basicCounterConfigs.defaultBPBRatioFormat || "";
  let bbPrefix2 = "";
  if (bbFmt2.length === 1) bbPrefix2 = `§${bbFmt2}`;
  else if (bbFmt2.startsWith("§")) bbPrefix2 = bbFmt2;

  // 4) Build one merged “BP/BB/BP‐Ratio” line
  const parts = [];
  if (bpOn)    parts.push(`${placedPrefix}BlocksPlaced: ${placedScore}`);
  if (bbOn)    parts.push(`${brokenPrefix}BlocksBroken: ${brokenScore}`);
  if (ratioOn) parts.push(`${bbPrefix2}B/P: ${bbValue.toFixed(2)}`);

  // Join with two spaces so it’s always one line in the action bar
  return parts.join("  ");
}


function getKillsAndRatioLine(player) {
  const showKills   = basicCounterConfigs.pvpKillActionBar;
  const showDeaths  = basicCounterConfigs.deathActionBar;
  const showKD      = basicCounterConfigs.defaultKDRatio;
  const showCoins   = basicCounterConfigs.killCoinsActionBar;

  if (!showKills && !showDeaths && !showKD && !showCoins) return null;

  // 1) Fetch Kills & Deaths
  const killsObj = createScoreboardIfNotExists("kills", "Kills");
  const killsScore = getScoreSafe(player, killsObj.id) || 0;
  const pvpFmt = basicCounterConfigs.pvpActionBarFormat || "";
  let pvpPrefix = "";
  if (pvpFmt.length === 1) pvpPrefix = `§${pvpFmt}`;
  else if (pvpFmt.startsWith("§")) pvpPrefix = pvpFmt;

  const deathsObj = createScoreboardIfNotExists("deaths", "Deaths");
  const deathsScore = getScoreSafe(player, deathsObj.id) || 0;
  const deathFmt = basicCounterConfigs.deathActionBarFormat || "";
  let deathPrefix = "";
  if (deathFmt.length === 1) deathPrefix = `§${deathFmt}`;
  else if (deathFmt.startsWith("§")) deathPrefix = deathFmt;

  // 2) Compute K/D if needed
  const kdValue = deathsScore > 0 ? (killsScore / deathsScore) : killsScore;
  const kdFmt2 = basicCounterConfigs.defaultKDRatioFormat || "";
  let kdPrefix2 = "";
  if (kdFmt2.length === 1) kdPrefix2 = `§${kdFmt2}`;
  else if (kdFmt2.startsWith("§")) kdPrefix2 = kdFmt2;

  // 3) Fetch Kill Coins if needed
  let coinsScore = 0;
  let coinPrefix = "";
  if (showCoins) {
    const coinsObj = createScoreboardIfNotExists("kill_coins", "Kill Coins");
    coinsScore = getScoreSafe(player, coinsObj.id) || 0;
    const coinFmt = basicCounterConfigs.killCoinsActionBarFormat || "";
    if (coinFmt.length === 1) coinPrefix = `§${coinFmt}`;
    else if (coinFmt.startsWith("§")) coinPrefix = coinFmt;
  }

  // 4) Build one merged line
  const parts = [];
  if (showKills)  parts.push(`${pvpPrefix}Kills: ${killsScore}`);
  if (showDeaths) parts.push(`${deathPrefix}Deaths: ${deathsScore}`);
  if (showKD)     parts.push(`${kdPrefix2}K/D: ${kdValue.toFixed(2)}`);
  if (showCoins)  parts.push(`${coinPrefix}kCoins: ${coinsScore}`);

  return parts.join("  ");
}


//-------------------- Global Action Bar Event -------------------------------

system.runInterval(() => {
  // ─── 1) Reload configs ─────────────────────────────────────────────
  loadBasicCounterConfigs();
  if (!basicCounterConfigs.globalActionBar) return;
  loadRatioConfigs();

  // ─── 2) Build & send action bar ───────────────────────────────────
  for (const player of world.getPlayers()) {
    // ─── 2.1) Apply filters before building action bar ───────────────
    //  • Tag filter
    const tagFilter = basicCounterConfigs.playerTagFilter || [];
    if (tagFilter.length > 0) {
      const playerTags = player.getTags(); // array of tags on the player
      const hasAllowedTag = playerTags.some(t => tagFilter.includes(t));
      if (!hasAllowedTag) continue; // skip if no matching tag
    }

    //  • Score filter
    const scoreFilter = basicCounterConfigs.playerScoreFilter || { objective: "none", min: 0, max: 0 };
    if (scoreFilter.objective && scoreFilter.objective !== "none") {
      // Create/get the scoreboard objective; treat missing as zero
      const obj = createScoreboardIfNotExists(scoreFilter.objective, scoreFilter.objective);
      const playerScore = getScoreSafe(player, obj.id) || 0;
      if (playerScore < scoreFilter.min || playerScore > scoreFilter.max) {
        continue; // skip if outside range
      }
    }

    //  • Location filter
    if (basicCounterConfigs.playerLocationFilterEnabled) {
      const locCfg = basicCounterConfigs.playerLocation || { x: { min: 0, max: 0 }, y: { min: 0, max: 0 }, z: { min: 0, max: 0 } };
      const pos = player.location; // { x, y, z }
      if (
        pos.x < locCfg.x.min || pos.x > locCfg.x.max ||
        pos.y < locCfg.y.min || pos.y > locCfg.y.max ||
        pos.z < locCfg.z.min || pos.z > locCfg.z.max
      ) {
        continue; // skip if outside allowed range
      }
    }

    // ─── 2.2) Build rawLines now that player passed filters ───────────
    const rawLines = [];
    const globalFmt = (basicCounterConfigs.globalActionBarFormat || "").trim();

    // — Player name line —
    if (basicCounterConfigs.globalActionBarPlayerName) {
      const nameCode = (basicCounterConfigs.globalActionBarPlayerNameFormat || "").trim();
      if (nameCode.length === 1) {
        rawLines.push(`§${nameCode}${player.nameTag}§r`);
      } else {
        rawLines.push(player.nameTag);
      }
    }

    // — Currency (human-friendly label) —
    if (basicCounterConfigs.currency && basicCounterConfigs.currencyActionBar) {
      const rawCurObj = basicCounterConfigs.currencyObjectiveName;
      const currencyName = rawCurObj
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      const curObj = createScoreboardIfNotExists(rawCurObj, currencyName);
      const curScore = getScoreSafe(player, curObj.id) || 0;
      const fmt = (basicCounterConfigs.currencyActionBarFormat || "").trim();
      let currencyPrefix = "";
      if (fmt.length === 1) currencyPrefix = `§${fmt}`;
      else if (fmt.startsWith("§")) currencyPrefix = fmt;
      rawLines.push(`${currencyPrefix}${currencyName}: ${curScore}`);
    }

    // ─── Kills/Deaths/KD/kCoins via helper ─────────────────────────────
    const kdLine = getKillsAndRatioLine(player);
    if (kdLine) {
      rawLines.push(kdLine);
    }

    // — Monster/Mob (with “Monster” label instead of “Mon”) —
    const monsterObj   = createScoreboardIfNotExists("monster_kills", "Monster Kills");
    const monsterScore = getScoreSafe(player, monsterObj.id) || 0;
    const monsterFmt   = (basicCounterConfigs.monsterActionBarFormat || "").trim();
    let monsterPrefix  = "";
    if (monsterFmt.length === 1) monsterPrefix = `§${monsterFmt}`;
    else if (monsterFmt.startsWith("§")) monsterPrefix = monsterFmt;

    const mobsObj   = createScoreboardIfNotExists("mob_kills", "Mob Kills");
    const mobsScore = getScoreSafe(player, mobsObj.id) || 0;
    const mobsFmt2  = (basicCounterConfigs.mobsActionBarFormat || "").trim();
    let mobsPrefix = "";
    if (mobsFmt2.length === 1) mobsPrefix = `§${mobsFmt2}`;
    else if (mobsFmt2.startsWith("§")) mobsPrefix = mobsFmt2;

    if (basicCounterConfigs.monsterActionBar || basicCounterConfigs.mobsActionBar) {
      if (basicCounterConfigs.monsterActionBar && basicCounterConfigs.mobsActionBar) {
        rawLines.push(
          `${monsterPrefix}Monster: ${monsterScore}  ${mobsPrefix}Mob: ${mobsScore}`
        );
      } else if (basicCounterConfigs.monsterActionBar) {
        rawLines.push(`${monsterPrefix}Monster: ${monsterScore}`);
      } else {
        rawLines.push(`${mobsPrefix}Mob: ${mobsScore}`);
      }
    }

    // ─── Blocks Placed/Broken/Ratio via helper ─────────────────────────
    const brLine = getBlocksAndRatioLine(player);
    if (brLine) {
      rawLines.push(brLine);
    }

    // — Playtime —
   let playLineIndex = -1;
if (basicCounterConfigs.playtime && basicCounterConfigs.playtimeActionBar) {
  // Ensure the single “playtime_minutes” objective exists, then read total minutes:
  const totalMinObj = createScoreboardIfNotExists("playtime_minutes", "Playtime Minutes");
  const totalMinutes = getScoreSafe(player.nameTag, totalMinObj.id) || 0;

  // Convert totalMinutes → days, hours, minutes
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;

  const playFmt = (basicCounterConfigs.playtimeActionBarFormat || "").trim();
  let playPrefix = "";
  if (playFmt.length === 1) playPrefix = `§${playFmt}`;
  else if (playFmt.startsWith("§")) playPrefix = playFmt;

  rawLines.push(`${playPrefix}Time: ${days}d ${hours}h ${mins}m`);
  playLineIndex = rawLines.length - 1;
}

    // — Distance & Coords (merged if both toggled) —
    let distPlayIndex = -1;
    const distOn  = basicCounterConfigs.distanceTraveledActionBar;
    const coordOn = basicCounterConfigs.coordinateScoreActionBar;
    if (distOn || coordOn) {
      const parts = [];
      if (distOn) {
        const distObj = createScoreboardIfNotExists("distance_traveled", "Distance Traveled");
        const distScore = getScoreSafe(player.nameTag, distObj.id) || 0;
        const distFmt = (basicCounterConfigs.distanceTraveledActionBarFormat || "").trim();
        let distPrefix = "";
        if (distFmt.length === 1) distPrefix = `§${distFmt}`;
        else if (distFmt.startsWith("§")) distPrefix = distFmt;
        parts.push(`${distPrefix}Dist: ${distScore}`);
      }
      if (coordOn) {
        const x = getScoreSafe(player.nameTag, "coord_x") || 0;
        const y = getScoreSafe(player.nameTag, "coord_y") || 0;
        const z = getScoreSafe(player.nameTag, "coord_z") || 0;
        const coordFmt = (basicCounterConfigs.coordinateScoreActionBarFormat || "").trim();
        let coordPrefix = "";
        if (coordFmt.length === 1) coordPrefix = `§${coordFmt}`;
        else if (coordFmt.startsWith("§")) coordPrefix = coordFmt;
        parts.push(`${coordPrefix}Coords: ${x},${y},${z}`);
      }
      rawLines.push(parts.join("  "));
      distPlayIndex = rawLines.length - 1;
    }

    // — Containers —
    let chestsLineIndex = -1;
    if (basicCounterConfigs.containersOpenedActionBar) {
      const contObj = createScoreboardIfNotExists("containers_opened", "Chests Opened");
      const contScore = getScoreSafe(player.nameTag, contObj.id) || 0;
      const contFmt = (basicCounterConfigs.containersOpenedActionBarFormat || "").trim();
      let contPrefix = "";
      if (contFmt.length === 1) contPrefix = `§${contFmt}`;
      else if (contFmt.startsWith("§")) contPrefix = contFmt;
      rawLines.push(`${contPrefix}ChestsOpen: ${contScore}`);
      chestsLineIndex = rawLines.length - 1;
    }

    // ─── 3) Merge Time & Chests immediately if both toggled & present ─────
    if (
      basicCounterConfigs.playtime && basicCounterConfigs.playtimeActionBar &&
      basicCounterConfigs.containersOpenedActionBar &&
      playLineIndex !== -1 && chestsLineIndex !== -1 && playLineIndex !== chestsLineIndex
    ) {
      rawLines[playLineIndex] = rawLines[playLineIndex] + `  ${rawLines[chestsLineIndex]}`;
      rawLines.splice(chestsLineIndex, 1);
      if (distPlayIndex > chestsLineIndex) distPlayIndex--;
    }

    // ─── 4) Combine lines if more than 7 ─────────────────────────────────
    while (rawLines.length > 7) {
      // (1) Merge K/D and kCoins only if on different lines
      const kdIndex    = rawLines.findIndex(l => l.includes("K: "));
      const coinsIndex = rawLines.findIndex(l => l.startsWith("kCoins:"));
      if (kdIndex !== -1 && coinsIndex !== -1 && kdIndex !== coinsIndex) {
        rawLines[kdIndex] = rawLines[kdIndex] + `  ${rawLines[coinsIndex]}`;
        rawLines.splice(coinsIndex, 1);
        continue;
      }
      // (2) Merge Monster and Mob if needed
      const monIndex = rawLines.findIndex(l => l.startsWith("Monster:"));
      const mobIndex = rawLines.findIndex(l => l.startsWith("Mob:"));
      if (monIndex !== -1 && mobIndex !== -1) {
        rawLines[monIndex] = rawLines[monIndex] + `  ${rawLines[mobIndex]}`;
        rawLines.splice(mobIndex, 1);
        continue;
      }
      break;
    }

    // ─── 5) Send action bar if any lines remain ───────────────────────────
    if (rawLines.length > 0) {
      const joined = rawLines
        .map(txt => {
          // Always prefix with globalFmt if it's a single character
          if (globalFmt && globalFmt.length === 1) {
            return `§${globalFmt}${txt}`;
          }
          return txt;
        })
        .join("\n");
      const rawJson = JSON.stringify({ rawtext: [{ text: joined }] });
      player.runCommandAsync(`/titleraw @s actionbar ${rawJson}`);
    }
  }
}, 20);





//----------------------------------------------------------------------------

//Coordinate Score System and Distance Traveled System are located in distanceCounter.js