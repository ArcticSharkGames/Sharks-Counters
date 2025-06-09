import { world, system } from "@minecraft/server";
import { ModalFormData, MessageFormData, ActionFormData } from "@minecraft/server-ui";
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



// ─── Default Ratio Configuration ────────────────────────────────────────────
export const defaultRatioConfig = {
  enabled: true,
  numeratorObjective: "",     
  denominatorObjective: "",
  displayName: "",
  ratioName: "",
  useActionBar: true,
  actionBarFormatCode: "r",
  actionBarLabel:      "",
  actionBarLabelFormat: "r",
  requiredActionBarTags: [],
  requiredActionBarScoreObjectives: [],
  requiredActionBarScoreRanges: [],
  displayRounded: true,
  numeratorFormat: "r",
  denominatorFormat: "r"
};

// Prefix for dynamic property keys
const RATIO_PREFIX = "ratio:";

// In-memory store of all loaded ratio configs
// Key = ratioName (the dynamic‐property suffix), Value = { numeratorObjective, denominatorObjective }
export let ratioConfigs = {};

export function loadRatioConfigs() {
  ratioConfigs = {};
  try {
    for (const key of world.getDynamicPropertyIds()) {
      if (!key.startsWith(RATIO_PREFIX)) continue;
      const ratioName = key.slice(RATIO_PREFIX.length);
      const raw = world.getDynamicProperty(key);
      try {
        const parsed = JSON.parse(raw);
        ratioConfigs[ratioName] = { ...defaultRatioConfig, ...parsed };
      } catch {
        // ignore malformed JSON
      }
    }
    // Optionally, add built-in defaults if flags are set and not already present:
    if (!ratioConfigs["kill_death"] && defaultRatioConfig.defaultKDRatio) {
      ratioConfigs["kill_death"] = {
         ...defaultRatioConfig,
        numeratorObjective: "kills",
        denominatorObjective: "deaths",
        displayName: "Kill/Death Ratio",
        ratioName: "kill_death",
        useActionBar: false,
        displayRounded: true
       
      };
    }
    if (!ratioConfigs["blocksplaced_broken"] && defaultRatioConfig.defaultBlocksPlacedBrokenRatio) {
      ratioConfigs["blocksplaced_broken"] = {
        ...defaultRatioConfig,
        numeratorObjective: "blocksPlaced",
        denominatorObjective: "blocksBroken",
        displayName: "Blocks Placed/Broken Ratio",
        ratioName: "blocksplaced_broken",
        useActionBar: false,
        displayRounded: true
        
      };
    }
  } catch (e) {
    console.error("[LoadRatios] Failed to load ratios:", e);
  }
}

/**
 * Save (or overwrite) a ratio definition under the given ratioName.
 */
export function saveRatioConfig(ratioName, config) {
  try {
    const merged = { ...defaultRatioConfig, ...config };
    world.setDynamicProperty(RATIO_PREFIX + ratioName, JSON.stringify(merged));
    ratioConfigs[ratioName] = merged;
  } catch (e) {
    console.error(`[SaveRatio] Failed to save ratio '${ratioName}':`, e);
  }
}

/**
 * Delete a ratio definition by its ratioName.
 */
export function deleteRatioConfig(ratioName) {
  try {
    world.setDynamicProperty(RATIO_PREFIX + ratioName, undefined);
    delete ratioConfigs[ratioName];
  } catch (e) {
    console.error(`[DeleteRatio] Failed to delete ratio '${ratioName}':`, e);
  }
}



// ----------------------------Ratio Management Menu-----------------------------
export async function showRatioListMenu(player) {
  // 1) Load all saved ratios into memory (including built-ins)
  loadRatioConfigs();

  // 2) Remove the two built-in IDs from what we actually display
  const entries = Object.entries(ratioConfigs).filter(
    ([name, cfg]) =>
      name !== "kill_death" &&
      name !== "blocksplaced_broken"
  );

  const form = new ActionFormData().title("Manage Ratios");

  // 3) One button per remaining ratio, showing enabled/disabled status
  for (const [ratioName, cfg] of entries) {
    const statusLabel = cfg.enabled
      ? "§a(Enabled)"
      : "§c(Disabled)";
    form.button(`${ratioName} - ${cfg.displayName} ${statusLabel}`);
  }

  // 4) “Add New Ratio” is always available at the bottom
  form.button("+ Add New Ratio");

  const res = await form.show(player);
  if (res.canceled) return;

  const choiceIdx = res.selection;
  if (choiceIdx === entries.length) {
    // “Add New” was pressed
    showEditRatioMenu(player, null);
  } else {
    // An existing (non-built-in) ratio was chosen
    const [ratioName] = entries[choiceIdx];
    showRatioActionMenu(player, ratioName);
  }
}



// ------------------
// Menu: After Selecting One Ratio → Edit or Delete
// ------------------
export async function showRatioActionMenu(player, ratioName) {
  loadRatioConfigs();
  const cfg = ratioConfigs[ratioName];
  if (!cfg) {
    player.sendMessage(`§cRatio '${ratioName}' not found.`);
    return;
  }

  // Determine toggle button label based on current enabled state
  const toggleLabel = cfg.enabled ? "§cDISABLE" : "§aENABLE";

  const form = new ActionFormData()
    .title(`“${ratioName}” → ${cfg.displayName}`)
    .button(toggleLabel) // index 0: toggle enabled/disabled
    .button("Edit")       // index 1
    .button("Delete")     // index 2
    .button("Back");      // index 3

  const res = await form.show(player);
  if (res.canceled) return;

  switch (res.selection) {
    case 0: {
      // Toggle enabled flag
      cfg.enabled = !cfg.enabled;
      saveRatioConfig(ratioName, cfg);
      const status = cfg.enabled ? "enabled" : "disabled";
      player.sendMessage(`§aRatio '${cfg.displayName}' is now ${status}.`);
      // Reopen this menu to reflect new state
      showRatioActionMenu(player, ratioName);
      break;
    }
    case 1:
      // Edit
      showEditRatioMenu(player, ratioName);
      break;

    case 2: {
      // Delete
      // 1) confirm deletion of the ratio itself
      const confirm = new MessageFormData()
        .title("Confirm Delete")
        .body(`Are you sure you want to delete ratio '${ratioName}'?`)
        .button1("Yes, delete")
        .button2("Cancel");

      const cRes = await confirm.show(player);
      if (cRes.canceled || cRes.selection !== 0) return;

      // 2) ask whether to delete the associated scoreboard objective
      const second = new MessageFormData()
        .title("Delete Associated Scoreboard?")
        .body(
          `Ratio '${ratioName}' will be removed.\n` +
          `Do you also want to delete its "${ratioName}_display" objective?`
        )
        .button1("Yes, delete objective")
        .button2("No, keep objective");

      const sRes = await second.show(player);
      if (sRes.canceled) return;

      // Remove the ratio definition
      deleteRatioConfig(ratioName);

      // If requested, remove the "<ratioName>_display" objective
      if (sRes.selection === 0) {
        try {
          world.scoreboard.removeObjective(`${ratioName}_display`);
        } catch {
          // ignore if it doesn’t exist
        }
        player.sendMessage(
          `§aRatio '${ratioName}' and its "${ratioName}_display" objective deleted.`
        );
      } else {
        player.sendMessage(
          `§aRatio '${ratioName}' deleted. Objective was kept.`
        );
      }

      // Refresh the list menu so the deleted ratio no longer appears
      showRatioListMenu(player);
      break;
    }

    case 3:
      // Back
      showRatioListMenu(player);
      break;
  }
}








//---------------------------Add/Edit Ratio-----------------------------------
export async function showEditRatioMenu(player, existingRatioName = null) {
  loadRatioConfigs();
  const isEdit = existingRatioName !== null && ratioConfigs[existingRatioName];

  // 1) Prepare initial (prefill) values
  let initialEnabled                  = defaultRatioConfig.enabled;
  let initialNumerator                = "";
  let initialDenominator              = "";
  let initialDisplayName              = "";
  let initialRatioName                = "";
  let initialDisplayRounded           = defaultRatioConfig.displayRounded;
  let initialUseActionBar             = defaultRatioConfig.useActionBar;
  let initialActionBarFormat          = defaultRatioConfig.actionBarFormatCode;
  let initialActionBarLabel           = defaultRatioConfig.actionBarLabel;
  let initialActionBarLabelFormat     = defaultRatioConfig.actionBarLabelFormat;
  let initialNumeratorFormat          = defaultRatioConfig.numeratorFormat;
  let initialDenominatorFormat        = defaultRatioConfig.denominatorFormat;
  let initialRequiredTags             = "";
  let initialRequiredScoreObjectives  = "";
  let initialRequiredScoreRanges      = "";

  if (isEdit) {
    const cfg = ratioConfigs[existingRatioName];
    initialEnabled                  = Boolean(cfg.enabled);
    initialNumerator                = cfg.numeratorObjective;
    initialDenominator              = cfg.denominatorObjective;
    initialDisplayName              = cfg.displayName;
    initialRatioName                = cfg.ratioName;
    initialDisplayRounded           = Boolean(cfg.displayRounded);
    initialUseActionBar             = Boolean(cfg.useActionBar);
    initialNumeratorFormat          = cfg.numeratorFormat || defaultRatioConfig.numeratorFormat;
    initialDenominatorFormat        = cfg.denominatorFormat || defaultRatioConfig.denominatorFormat;
    initialActionBarFormat          = cfg.actionBarFormatCode || defaultRatioConfig.actionBarFormatCode;
    initialActionBarLabel           = cfg.actionBarLabel || "";
    initialActionBarLabelFormat     = cfg.actionBarLabelFormat || defaultRatioConfig.actionBarLabelFormat;
    initialRequiredTags             = Array.isArray(cfg.requiredActionBarTags)
                                        ? cfg.requiredActionBarTags.join(", ")
                                        : "";
    initialRequiredScoreObjectives  = Array.isArray(cfg.requiredActionBarScoreObjectives)
                                        ? cfg.requiredActionBarScoreObjectives.join(", ")
                                        : "";
    initialRequiredScoreRanges      = Array.isArray(cfg.requiredActionBarScoreRanges)
                                        ? cfg.requiredActionBarScoreRanges.join(", ")
                                        : "";
  }

  // 2) Build the form, in the order below:
  const formTitle = isEdit
    ? `Edit Ratio: ${existingRatioName}`
    : "Add New Ratio";

  const form = new ModalFormData()
    .title(formTitle)

    // 0) Enabled toggle
    .toggle("Enabled", initialEnabled)

    // 1) Core ratio fields
    .textField("Numerator Objective (e.g. kills)",      initialNumerator)
    .textField("Denominator Objective (e.g. deaths)",   initialDenominator)
    .textField("Display Name (e.g. Kill/Death Ratio)",  initialDisplayName)
    .textField("Ratio ID (no spaces, e.g. kill_death)", initialRatioName)

    // 5) Toggles
    .toggle("Display Rounded (scoreboard)",             initialDisplayRounded)
    .toggle("Use ActionBar (decimal)",                  initialUseActionBar)

    // 7) ActionBar Label
    .textField("ActionBar Label (top line)",                 initialActionBarLabel)

    // 8) ActionBar Label Format
    .textField("ActionBar Label Format Code (a-u or 0-9)", initialActionBarLabelFormat)

    // 9) Numerator Format Code
    .textField("Numerator Format Code (a-u or 0-9)",       initialNumeratorFormat)

    // 10) Denominator Format Code
    .textField("Denominator Format Code (a-u or 0-9)",     initialDenominatorFormat)

    // 11) ActionBar Ratio Format Code
    .textField("ActionBar Ratio Format Code (a-u or 0-9)", initialActionBarFormat)

    // 12) Filters: Tags
    .textField(
      "ActionBar: Required Tags (comma-separated, e.g. !admin,!mod)",
      initialRequiredTags
    )

    // 13) Filters: Score Objectives
    .textField(
      "ActionBar: Required Score Objectives (comma-separated, e.g. kills,deaths)",
      initialRequiredScoreObjectives
    )

    // 14) Filters: Score Ranges
    .textField(
      "ActionBar: Required Score Ranges (comma-separated, e.g. 10..100,1..10)",
      initialRequiredScoreRanges
    );

  const res = await form.show(player);
  if (res.canceled || !res.formValues) return;

  // 3) Unpack form values in exactly the same order:
  const [
    enabledRaw,            // 0
    numeratorRaw,          // 1
    denominatorRaw,        // 2
    displayNameRaw,        // 3
    ratioNameRaw,          // 4
    displayRoundedRaw,     // 5
    useActionBarRaw,       // 6
    actionBarLabelRaw,     // 7
    actionBarLabelFormatRaw, // 8
    numeratorFormatRaw,    // 9
    denominatorFormatRaw,  // 10
    actionBarFormatRaw,    // 11
    tagsRaw,               // 12
    scoreObjsRaw,          // 13
    scoreRangesRaw         // 14
  ] = res.formValues;

  // 4) Trim & fallback to initial if blank
  const enabled = Boolean(enabledRaw);

  const numeratorObjective = numeratorRaw.trim() !== ""
    ? numeratorRaw.trim()
    : initialNumerator;
  const denominatorObjective = denominatorRaw.trim() !== ""
    ? denominatorRaw.trim()
    : initialDenominator;
  const displayName = displayNameRaw.trim() !== ""
    ? displayNameRaw.trim()
    : initialDisplayName;
  const ratioName = ratioNameRaw.trim() !== ""
    ? ratioNameRaw.trim()
    : initialRatioName;

  const displayRounded = Boolean(displayRoundedRaw);
  const useActionBar   = Boolean(useActionBarRaw);

  // Validate Numerator format code
  let numeratorFormat = numeratorFormatRaw.trim();
  if (!/^[a-u0-9]$/.test(numeratorFormat)) {
    if (!numeratorFormat.startsWith("§")) {
      numeratorFormat = initialNumeratorFormat;
    }
  }

  // Validate Denominator format code
  let denominatorFormat = denominatorFormatRaw.trim();
  if (!/^[a-u0-9]$/.test(denominatorFormat)) {
    if (!denominatorFormat.startsWith("§")) {
      denominatorFormat = initialDenominatorFormat;
    }
  }

  // Validate ActionBar ratio format code
  let actionBarFormatCode = actionBarFormatRaw.trim();
  if (!/^[a-u0-9]$/.test(actionBarFormatCode)) {
    if (!actionBarFormatCode.startsWith("§")) {
      actionBarFormatCode = initialActionBarFormat;
    }
  }

  // ActionBar label text
  const actionBarLabel = actionBarLabelRaw.trim() !== ""
    ? actionBarLabelRaw.trim()
    : initialActionBarLabel;

  // Validate ActionBar label format code
  let actionBarLabelFormat = actionBarLabelFormatRaw.trim();
  if (!/^[a-u0-9]$/.test(actionBarLabelFormat)) {
    if (!actionBarLabelFormat.startsWith("§")) {
      actionBarLabelFormat = initialActionBarLabelFormat;
    }
  }

  // Filters: split or fallback to previous
  const requiredActionBarTags = tagsRaw.trim()
    ? tagsRaw.split(",").map(s => s.trim()).filter(s => s.length > 0)
    : (isEdit ? ratioConfigs[existingRatioName].requiredActionBarTags : []);

  const requiredActionBarScoreObjectives = scoreObjsRaw.trim()
    ? scoreObjsRaw.split(",").map(s => s.trim()).filter(s => s.length > 0)
    : (isEdit ? ratioConfigs[existingRatioName].requiredActionBarScoreObjectives : []);

  const requiredActionBarScoreRanges = scoreRangesRaw.trim()
    ? scoreRangesRaw.split(",").map(s => s.trim()).filter(s => s.length > 0)
    : (isEdit ? ratioConfigs[existingRatioName].requiredActionBarScoreRanges : []);

  // 5) Validate core fields
  if (
    !numeratorObjective ||
    !denominatorObjective ||
    !displayName ||
    !ratioName
  ) {
    player.sendMessage("§cNumerator, Denominator, Display Name, and Ratio ID are required.");
    return;
  }

  // 6) Prevent duplicate IDs
  if (!isEdit && ratioConfigs[ratioName]) {
    player.sendMessage(`§cA ratio with ID '${ratioName}' already exists.`);
    return;
  }
  if (isEdit && ratioName !== existingRatioName && ratioConfigs[ratioName]) {
    player.sendMessage(`§cCannot rename to '${ratioName}': already exists.`);
    return;
  }

  // 7) If renaming, delete old entry
  if (isEdit && ratioName !== existingRatioName) {
    deleteRatioConfig(existingRatioName);
  }

  // 8) Save updated config including the new enabled field
  saveRatioConfig(ratioName, {
    enabled,
    numeratorObjective,
    denominatorObjective,
    displayName,
    ratioName,
    displayRounded,
    useActionBar,
    actionBarFormatCode,
    actionBarLabel,
    actionBarLabelFormat,
    numeratorFormat,
    denominatorFormat,
    requiredActionBarTags,
    requiredActionBarScoreObjectives,
    requiredActionBarScoreRanges
  });

  const action = isEdit ? "updated" : "added";
  player.sendMessage(`§aRatio '${displayName}' (ID: ${ratioName}) ${action} successfully.`);
}



// ----------------------------Update All Ratios-----------------------------
//this function is called for on a runInterval in defaultCounters.js

function friendlyName(objectiveId) {
  return objectiveId
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

export function updateAllRatios() {
  loadRatioConfigs();
  const overworld = world.getDimension("overworld");
  const scale = 100; // two decimal places
  const builtIns = new Set(["kill_death", "blocksplaced_broken"]);

  for (const [ratioName, cfg] of Object.entries(ratioConfigs)) {
    const {
      enabled,
      numeratorObjective,
      denominatorObjective,
      displayName,
      displayRounded,
      useActionBar,
      actionBarFormatCode,
      actionBarLabel,
      actionBarLabelFormat,
      numeratorFormat,
      denominatorFormat,
      requiredActionBarTags,
      requiredActionBarScoreObjectives,
      requiredActionBarScoreRanges
    } = cfg;

    // Skip if this ratio is disabled
    if (!enabled) continue;

    if (
      !numeratorObjective ||
      !denominatorObjective ||
      !displayName ||
      !ratioName
    ) {
      continue;
    }

    // 1) Ensure raw objectives exist
    createScoreboardIfNotExists(numeratorObjective, numeratorObjective);
    createScoreboardIfNotExists(denominatorObjective, denominatorObjective);

    let ratioObj = null;
    if (displayRounded) {
      const ratioObjId = `${ratioName}_display`;
      ratioObj = createScoreboardIfNotExists(
        ratioObjId,
        `${displayName} (×${scale})`
      );
    }

    // Precompute human-friendly labels once per ratio
    const numLabel = friendlyName(numeratorObjective);
    const denLabel = friendlyName(denominatorObjective);

    for (const player of world.getPlayers()) {
      const numScore = getScoreSafe(player, numeratorObjective) || 0;
      const denScore = getScoreSafe(player, denominatorObjective) || 0;
      const rawRatio = denScore > 0 ? numScore / denScore : numScore;

      // 2) If displayRounded: write scaled integer
      if (displayRounded && ratioObj) {
        const scaled = Math.floor(rawRatio * scale);
        ratioObj.setScore(player, scaled);
      }

      // 3) Only show action‐bar if this isn’t one of the two built‐ins:
      if (useActionBar && enabled && !builtIns.has(ratioName)) {
        // Tag filter
        const passesTag =
          !Array.isArray(requiredActionBarTags) ||
          requiredActionBarTags.length === 0 ||
          requiredActionBarTags.some(tag => player.hasTag(tag));

        // Score filters
        let passesScore = true;
        if (
          Array.isArray(requiredActionBarScoreObjectives) &&
          Array.isArray(requiredActionBarScoreRanges) &&
          requiredActionBarScoreObjectives.length ===
            requiredActionBarScoreRanges.length
        ) {
          for (let i = 0; i < requiredActionBarScoreObjectives.length; i++) {
            const obj = requiredActionBarScoreObjectives[i];
            const rangeStr = requiredActionBarScoreRanges[i];
            try {
              const { min, max } = parseRangeInput(rangeStr);
              const sc = getScoreSafe(player, obj) || 0;
              if (sc < min || sc > max) {
                passesScore = false;
                break;
              }
            } catch {
              passesScore = false;
              break;
            }
          }
        }

        if (passesTag && passesScore) {
          // Build format codes:
          let numeratorPrefix = "";
          if (numeratorFormat) {
            numeratorPrefix = numeratorFormat.length === 1
              ? `§${numeratorFormat}`
              : numeratorFormat.startsWith("§")
                ? numeratorFormat
                : "";
          }

          let denominatorPrefix = "";
          if (denominatorFormat) {
            denominatorPrefix = denominatorFormat.length === 1
              ? `§${denominatorFormat}`
              : denominatorFormat.startsWith("§")
                ? denominatorFormat
                : "";
          }

          let ratioPrefix = "";
          if (actionBarFormatCode) {
            ratioPrefix = actionBarFormatCode.length === 1
              ? `§${actionBarFormatCode}`
              : actionBarFormatCode.startsWith("§")
                ? actionBarFormatCode
                : "";
          }

          let labelFmtPrefix = "";
          if (actionBarLabelFormat) {
            labelFmtPrefix = actionBarLabelFormat.length === 1
              ? `§${actionBarLabelFormat}`
              : actionBarLabelFormat.startsWith("§")
                ? actionBarLabelFormat
                : "";
          }

          const labelText = actionBarLabel.trim() !== ""
            ? actionBarLabel
            : "";

          // Construct four lines:
          const line1 = `${labelFmtPrefix}${labelText}`;
          const line2 = `${numeratorPrefix}${numLabel}: ${numScore}`;
          const line3 = `${denominatorPrefix}${denLabel}: ${denScore}`;
          const line4 = `${ratioPrefix}${displayName}: ${rawRatio.toFixed(2)}`;

          const rawJson = JSON.stringify({
            rawtext: [
              { text: line1 + "\n" },
              { text: line2 + "\n" },
              { text: line3 + "\n" },
              { text: line4 }
            ]
          });

          player.runCommandAsync(`/titleraw @s actionbar ${rawJson}`);
        }
      }
    }
  }
}
