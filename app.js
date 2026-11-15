/**
 * SAIL - Scenario & Intelligence for Liners
 * Main Application Controller & UI Logic
 * 
 * Orchestrates:
 * - Scenario state management & localStorage persistence
 * - Two-way data binding for input sliders & numeric fields
 * - Deterministic recalculation & real-time UI rendering
 * - Capacity reconciliation and Gantt roadmap visualization
 * - Dynamic Strategy Brief generation & document export
 */

(function () {
  "use strict";

  // -------------------------------------------------------------
  // STATE MANAGEMENT
  // -------------------------------------------------------------
  let scenariosList = [];
  let activeScenarioId = "scenario-a";
  let currentInputs = {};
  let currentModel = null;

  // LocalStorage Key for custom user scenarios
  const STORAGE_KEY = "SAIL_USER_SAVED_SCENARIOS_V1";

  // Input Field Definitions for two-way binding
  const INPUT_FIELDS = [
    { key: "marketDemandGrowth", sliderId: "inputMarketGrowth", numId: "numMarketGrowth", valId: "valMarketGrowth", suffix: "%", sign: true, decimals: 1 },
    { key: "businessAmbitionGrowth", sliderId: "inputAmbitionGrowth", numId: "numAmbitionGrowth", valId: "valAmbitionGrowth", suffix: "%", sign: true, decimals: 1 },
    { key: "competitorCapacityGrowth", sliderId: "inputCompGrowth", numId: "numCompGrowth", valId: "valCompGrowth", suffix: "%", sign: true, decimals: 1 },
    { key: "currentFleetCapacity", sliderId: "inputCurrentCap", numId: "numCurrentCap", valId: "valCurrentCap", suffix: " TEU", commas: true },
    { key: "existingFleetUtilisation", sliderId: "inputCurrentUtil", numId: "numCurrentUtil", valId: "valCurrentUtil", suffix: "%", decimals: 1 },
    { key: "planningHorizon", sliderId: "inputHorizon", numId: "numHorizon", valId: "valHorizon", suffix: " Years" },
    { key: "targetCapacityBuffer", sliderId: "inputBuffer", numId: "numBuffer", valId: "valBuffer", suffix: "%", decimals: 1 },
    { key: "averageVesselProductivity", sliderId: "inputVesselProd", numId: "numVesselProd", valId: "valVesselProd", suffix: " TEU", commas: true },
    { key: "annualVesselOpCost", sliderId: "inputOpCost", numId: "numOpCost", valId: "valOpCost", prefix: "$", commas: true }
  ];

  // -------------------------------------------------------------
  // INITIALIZATION
  // -------------------------------------------------------------
  function init() {
    loadScenarios();
    setupVesselClassSelect();
    setupEventListeners();
    selectScenario(activeScenarioId);
  }

  /**
   * Load predefined scenarios and combine with saved user scenarios from localStorage
   */
  function loadScenarios() {
    // Deep clone predefined scenarios
    scenariosList = PREDEFINED_SCENARIOS.map(s => JSON.parse(JSON.stringify(s)));

    // Load custom scenarios from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          scenariosList = scenariosList.concat(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not load stored scenarios from localStorage:", e);
    }

    renderScenarioDropdown();
  }

  /**
   * Populate scenario dropdown options
   */
  function renderScenarioDropdown() {
    const sel = document.getElementById("scenarioSelect");
    if (!sel) return;

    let html = `<optgroup label="Standard Strategic Scenarios">`;
    scenariosList.filter(s => s.category === "predefined").forEach(s => {
      html += `<option value="${s.id}">${s.name}</option>`;
    });
    html += `</optgroup>`;

    const custom = scenariosList.filter(s => s.category === "custom");
    if (custom.length > 0) {
      html += `<optgroup label="Saved Custom Scenarios">`;
      custom.forEach(s => {
        html += `<option value="${s.id}">★ ${s.name}</option>`;
      });
      html += `</optgroup>`;
    }

    sel.innerHTML = html;
    sel.value = activeScenarioId;
  }

  /**
   * Setup vessel class benchmark dropdown
   */
  function setupVesselClassSelect() {
    const sel = document.getElementById("vesselClassSelect");
    if (!sel) return;

    sel.innerHTML = VESSEL_CLASSES.map(v => 
      `<option value="${v.id}">${v.name} (${v.nominalTEU.toLocaleString()} TEU)</option>`
    ).join("");
  }

  /**
   * Select a scenario by ID and apply inputs
   */
  function selectScenario(scenarioId) {
    const found = scenariosList.find(s => s.id === scenarioId) || scenariosList[0];
    activeScenarioId = found.id;

    // Clone inputs to working state
    currentInputs = JSON.parse(JSON.stringify(found.inputs));

    // Update Dropdown UI
    const sel = document.getElementById("scenarioSelect");
    if (sel) sel.value = activeScenarioId;

    // Show / Hide Delete button based on whether it is a custom scenario
    const btnDelete = document.getElementById("btnDeleteScenario");
    if (btnDelete) {
      btnDelete.style.display = found.category === "custom" ? "inline-flex" : "none";
    }

    // Update Scenario situation card
    updateScenarioSituationBox(found);

    // Apply values to input controls
    syncInputsToUI();

    // Recalculate and update the dashboard
    recalculateAndUpdate();
  }

  /**
   * Update the scenario situation & strategic move display box
   */
  function updateScenarioSituationBox(scenario) {
    const box = document.getElementById("scenarioDescriptionBox");
    if (!box) return;

    if (scenario.situation && scenario.strategicMove) {
      box.innerHTML = `
        <div style="font-weight:700; color:var(--navy-darkest); margin-bottom:4px;">
          ${scenario.name}
        </div>
        <div style="margin-bottom:6px;">
          <strong>Situation:</strong> ${scenario.situation.demandGrowthDesc}; ${scenario.situation.ambitionDesc}; ${scenario.situation.competitorDesc}.
        </div>
        <div>
          <strong>Strategic Move:</strong> ${scenario.strategicMove.summary}
        </div>
      `;
    } else {
      box.innerHTML = `
        <div style="font-weight:700; color:var(--navy-darkest); margin-bottom:4px;">
          ${scenario.name} (Custom Scenario)
        </div>
        <div>Active user-defined planning parameters.</div>
      `;
    }
  }

  /**
   * Sync current input state to sliders and numeric inputs
   */
  function syncInputsToUI() {
    INPUT_FIELDS.forEach(f => {
      const val = currentInputs[f.key];
      const slider = document.getElementById(f.sliderId);
      const numInput = document.getElementById(f.numId);
      const valDisplay = document.getElementById(f.valId);

      if (slider) slider.value = val;
      if (numInput) numInput.value = val;

      if (valDisplay) {
        valDisplay.textContent = formatFieldValue(val, f);
      }
    });

    const vesselSel = document.getElementById("vesselClassSelect");
    if (vesselSel && currentInputs.selectedVesselClass) {
      vesselSel.value = currentInputs.selectedVesselClass;
    }
  }

  /**
   * Format input values for live display beside field headers
   */
  function formatFieldValue(val, def) {
    let numStr = "";
    if (def.decimals !== undefined) {
      numStr = Number(val).toFixed(def.decimals);
    } else if (def.commas) {
      numStr = Math.round(Number(val)).toLocaleString("en-US");
    } else {
      numStr = String(val);
    }

    const prefix = def.prefix || "";
    const suffix = def.suffix || "";
    const sign = (def.sign && Number(val) > 0) ? "+" : "";

    return `${sign}${prefix}${numStr}${suffix}`;
  }

  /**
   * Wire up all event listeners for inputs, buttons, and modals
   */
  function setupEventListeners() {
    // Dropdown change
    const sel = document.getElementById("scenarioSelect");
    if (sel) {
      sel.addEventListener("change", (e) => {
        selectScenario(e.target.value);
      });
    }

    // Vessel class benchmark selection
    const vesselSel = document.getElementById("vesselClassSelect");
    if (vesselSel) {
      vesselSel.addEventListener("change", (e) => {
        const classId = e.target.value;
        currentInputs.selectedVesselClass = classId;
        const vesselDef = VESSEL_CLASSES.find(v => v.id === classId);
        if (vesselDef) {
          // Update productivity and annual opex to benchmark values
          currentInputs.averageVesselProductivity = vesselDef.annualProductivityTEU;
          currentInputs.annualVesselOpCost = vesselDef.annualOpCostUSD;
          syncInputsToUI();
          recalculateAndUpdate();
          showToast(`Updated parameters to ${vesselDef.name} benchmark.`, "info");
        }
      });
    }

    // Two-way binding for all inputs
    INPUT_FIELDS.forEach(f => {
      const slider = document.getElementById(f.sliderId);
      const numInput = document.getElementById(f.numId);
      const valDisplay = document.getElementById(f.valId);

      if (slider) {
        slider.addEventListener("input", (e) => {
          const val = Number(e.target.value);
          currentInputs[f.key] = val;
          if (numInput) numInput.value = val;
          if (valDisplay) valDisplay.textContent = formatFieldValue(val, f);
          recalculateAndUpdate();
        });
      }

      if (numInput) {
        numInput.addEventListener("input", (e) => {
          const val = Number(e.target.value);
          currentInputs[f.key] = val;
          if (slider) slider.value = val;
          if (valDisplay) valDisplay.textContent = formatFieldValue(val, f);
          recalculateAndUpdate();
        });
      }
    });

    // Reset button
    const btnReset = document.getElementById("btnResetScenario");
    if (btnReset) {
      btnReset.addEventListener("click", () => {
        const found = scenariosList.find(s => s.id === activeScenarioId);
        if (found) {
          currentInputs = JSON.parse(JSON.stringify(found.inputs));
          syncInputsToUI();
          recalculateAndUpdate();
          showToast("Reset scenario assumptions to baseline.", "info");
        }
      });
    }

    // Save As Custom Scenario Modal triggers
    const btnSaveModal = document.getElementById("btnSaveScenarioModal");
    const btnSaveTop = document.getElementById("btnSaveCustomTop");
    const saveModal = document.getElementById("saveScenarioModal");
    const btnCancelSave = document.getElementById("btnCancelSaveScenario");
    const btnConfirmSave = document.getElementById("btnConfirmSaveScenario");
    const customNameInput = document.getElementById("customScenarioNameInput");

    function openSaveModal() {
      if (customNameInput) {
        const activeScenario = scenariosList.find(s => s.id === activeScenarioId);
        const defaultName = activeScenario ? `${activeScenario.name} (Custom)` : "My Fleet Strategy Scenario";
        customNameInput.value = defaultName;
      }
      if (saveModal) saveModal.style.display = "flex";
      setTimeout(() => customNameInput && customNameInput.focus(), 50);
    }

    if (btnSaveModal) btnSaveModal.addEventListener("click", openSaveModal);
    if (btnSaveTop) btnSaveTop.addEventListener("click", openSaveModal);

    if (btnCancelSave) {
      btnCancelSave.addEventListener("click", () => {
        if (saveModal) saveModal.style.display = "none";
      });
    }

    if (btnConfirmSave) {
      btnConfirmSave.addEventListener("click", handleSaveCustomScenario);
    }

    // Delete custom scenario
    const btnDelete = document.getElementById("btnDeleteScenario");
    if (btnDelete) {
      btnDelete.addEventListener("click", handleDeleteCustomScenario);
    }

    // Methodology Modal triggers
    const btnMethodology = document.getElementById("btnMethodology");
    const methodologyModal = document.getElementById("methodologyModal");
    const btnCloseMethodology = document.getElementById("btnCloseMethodology");

    if (btnMethodology) {
      btnMethodology.addEventListener("click", () => {
        if (methodologyModal) methodologyModal.style.display = "flex";
      });
    }

    if (btnCloseMethodology) {
      btnCloseMethodology.addEventListener("click", () => {
        if (methodologyModal) methodologyModal.style.display = "none";
      });
    }

    // Close modals on outside click or ESC key
    window.addEventListener("click", (e) => {
      if (e.target === saveModal) saveModal.style.display = "none";
      if (e.target === methodologyModal) methodologyModal.style.display = "none";
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (saveModal) saveModal.style.display = "none";
        if (methodologyModal) methodologyModal.style.display = "none";
      }
    });

    // Brief Export Actions
    const btnCopyBrief = document.getElementById("btnCopyBrief");
    const btnDownloadBriefTxt = document.getElementById("btnDownloadBriefTxt");
    const btnPrintBrief = document.getElementById("btnPrintBrief");
    const btnExportTop = document.getElementById("btnExportBriefTop");

    if (btnCopyBrief) {
      btnCopyBrief.addEventListener("click", () => {
        if (!currentModel) return;
        const activeScenario = scenariosList.find(s => s.id === activeScenarioId);
        const name = activeScenario ? activeScenario.name : "Custom Scenario";
        const briefMd = SailCalcEngine.generateStrategyBrief(currentModel, name);
        navigator.clipboard.writeText(briefMd).then(() => {
          showToast("Strategy brief copied to clipboard!", "success");
        }).catch(() => {
          showToast("Failed to copy brief automatically. Please copy manually.", "error");
        });
      });
    }

    if (btnDownloadBriefTxt) {
      btnDownloadBriefTxt.addEventListener("click", downloadBriefFile);
    }
    if (btnExportTop) {
      btnExportTop.addEventListener("click", downloadBriefFile);
    }

    if (btnPrintBrief) {
      btnPrintBrief.addEventListener("click", () => {
        window.print();
      });
    }

    // Smooth scroll for pipeline breadcrumb steps
    document.querySelectorAll(".pipeline-step").forEach(step => {
      step.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = step.getAttribute("href");
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
          document.querySelectorAll(".pipeline-step").forEach(s => s.classList.remove("active"));
          step.classList.add("active");
        }
      });
    });
  }

  /**
   * Save custom scenario to state & localStorage
   */
  function handleSaveCustomScenario() {
    const customNameInput = document.getElementById("customScenarioNameInput");
    const name = customNameInput ? customNameInput.value.trim() : "";
    if (!name) {
      alert("Please provide a name for your custom scenario.");
      return;
    }

    const newScenarioId = `custom-${Date.now()}`;
    const newScenario = {
      id: newScenarioId,
      name: name,
      badge: "Custom Scenario",
      category: "custom",
      situation: null,
      strategicMove: null,
      inputs: JSON.parse(JSON.stringify(currentInputs))
    };

    scenariosList.push(newScenario);

    // Save to localStorage
    try {
      const customOnly = scenariosList.filter(s => s.category === "custom");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
    } catch (e) {
      console.warn("Could not save custom scenario to localStorage:", e);
    }

    renderScenarioDropdown();
    selectScenario(newScenarioId);

    const saveModal = document.getElementById("saveScenarioModal");
    if (saveModal) saveModal.style.display = "none";

    showToast(`Saved custom scenario: "${name}"`, "success");
  }

  /**
   * Delete active custom scenario
   */
  function handleDeleteCustomScenario() {
    const activeScenario = scenariosList.find(s => s.id === activeScenarioId);
    if (!activeScenario || activeScenario.category !== "custom") return;

    if (!confirm(`Are you sure you want to delete the custom scenario "${activeScenario.name}"?`)) {
      return;
    }

    // Filter out scenario
    scenariosList = scenariosList.filter(s => s.id !== activeScenarioId);

    // Update localStorage
    try {
      const customOnly = scenariosList.filter(s => s.category === "custom");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
    } catch (e) {
      console.warn("Could not update localStorage:", e);
    }

    showToast(`Deleted scenario "${activeScenario.name}".`, "info");
    renderScenarioDropdown();
    selectScenario(scenariosList[0].id);
  }

  /**
   * Trigger text file download of the strategy brief
   */
  function downloadBriefFile() {
    if (!currentModel) return;
    const activeScenario = scenariosList.find(s => s.id === activeScenarioId);
    const name = activeScenario ? activeScenario.name : "Custom Scenario";
    const briefMd = SailCalcEngine.generateStrategyBrief(currentModel, name);

    const blob = new Blob([briefMd], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SAIL_Strategy_Brief_${name.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded strategy brief as text file.", "success");
  }

  // -------------------------------------------------------------
  // RECALCULATION & UI RENDERING PIPELINE
  // -------------------------------------------------------------
  /**
   * Primary deterministic execution loop.
   * Invoked on any slider change, number input, scenario switch, or vessel select.
   */
  function recalculateAndUpdate() {
    // 1. Run deterministic calculation engine
    currentModel = SailCalcEngine.calculateModel(currentInputs);

    // 2. Render all UI modules
    renderStrategicPosture(currentModel.posture);
    renderKPICards(currentModel);
    renderCapacityBars(currentModel);
    renderThreeLayerCommitment(currentModel.commitmentLayers, currentModel.capacity);
    renderVesselSpecsTable(currentModel);
    renderCostSensitivity(currentModel.costBands);
    renderRoadmapSchedule(currentModel.roadmapSchedule);
    renderStrategyBrief(currentModel);
  }

  /**
   * Render Strategic Posture & Decision Interpretation Banner
   */
  function renderStrategicPosture(posture) {
    const badgeContainer = document.getElementById("postureBadgeContainer");
    const titleEl = document.getElementById("postureTitle");
    const rationaleEl = document.getElementById("postureRationale");
    const signalsListEl = document.getElementById("postureSignalsList");

    if (badgeContainer) {
      badgeContainer.className = `posture-badge-container ${posture.badgeClass}`;
    }
    if (titleEl) {
      titleEl.textContent = posture.posture.toUpperCase();
    }
    if (rationaleEl) {
      rationaleEl.textContent = posture.rationale;
    }
    if (signalsListEl) {
      signalsListEl.innerHTML = posture.keySignals.map(s => 
        `<div class="signal-item">${s}</div>`
      ).join("");
    }
  }

  /**
   * Render Executive KPI Cards
   */
  function renderKPICards(model) {
    const { inputs, demand, capacity, costBands } = model;

    // Horizon year in KPI
    const kpiHorizonYear = document.getElementById("kpiHorizonYear");
    if (kpiHorizonYear) kpiHorizonYear.textContent = inputs.planningHorizon;

    // KPI 1: Projected Demand
    const kpiProjectedDemand = document.getElementById("kpiProjectedDemand");
    const kpiInitialDemand = document.getElementById("kpiInitialDemand");
    const kpiDemandGrowthBadge = document.getElementById("kpiDemandGrowthBadge");

    if (kpiProjectedDemand) kpiProjectedDemand.textContent = `${SailCalcEngine.formatNumber(demand.baseDemand)} TEU`;
    if (kpiInitialDemand) kpiInitialDemand.textContent = `${SailCalcEngine.formatNumber(demand.initialDemandTEU)} TEU`;
    if (kpiDemandGrowthBadge) {
      const isPositive = inputs.businessAmbitionGrowth >= 0;
      kpiDemandGrowthBadge.className = isPositive ? "badge-trend-up" : "badge-trend-down";
      kpiDemandGrowthBadge.textContent = SailCalcEngine.formatPercent(inputs.businessAmbitionGrowth) + " p.a.";
    }

    // KPI 2: Required Capacity
    const kpiRequiredCap = document.getElementById("kpiRequiredCap");
    const kpiBufferPct = document.getElementById("kpiBufferPct");
    if (kpiRequiredCap) kpiRequiredCap.textContent = `${SailCalcEngine.formatNumber(capacity.requiredCapacityBase)} TEU`;
    if (kpiBufferPct) kpiBufferPct.textContent = `${inputs.targetCapacityBuffer}%`;

    // KPI 3: Required Vessels
    const kpiVesselCount = document.getElementById("kpiVesselCount");
    const kpiAddVessels = document.getElementById("kpiAddVessels");
    const kpiCurrentVessels = document.getElementById("kpiCurrentVessels");

    if (kpiVesselCount) kpiVesselCount.textContent = `${capacity.totalRequiredVessels} Vessels`;
    if (kpiAddVessels) kpiAddVessels.textContent = `+${capacity.additionalVessels} Additional`;
    if (kpiCurrentVessels) kpiCurrentVessels.textContent = `${capacity.currentVessels} vessels`;

    // KPI 4: Indicative Fleet Cost (Base)
    const kpiFleetCost = document.getElementById("kpiFleetCost");
    const kpiIncrCost = document.getElementById("kpiIncrCost");

    if (kpiFleetCost) kpiFleetCost.textContent = SailCalcEngine.formatCurrency(costBands.base.totalFleetCostUSD, true);
    if (kpiIncrCost) kpiIncrCost.textContent = `${SailCalcEngine.formatCurrency(costBands.base.incrementalFleetCostUSD, true)} / yr`;
  }

  /**
   * Render Capacity Position Bars & Gap Callout
   */
  function renderCapacityBars(model) {
    const container = document.getElementById("capacityBarsContainer");
    if (!container) return;

    const { capacity, demand } = model;

    // Determine scale max for responsive relative bar widths
    const maxVal = Math.max(
      capacity.currentCap,
      demand.baseDemand,
      capacity.requiredCapacityHigh,
      capacity.requiredCapacityBase
    ) * 1.08;

    const bars = [
      {
        label: "Current Fleet Supply",
        val: capacity.currentCap,
        cls: "fill-current",
        hint: "Existing capacity baseline"
      },
      {
        label: "Projected Demand (Base)",
        val: demand.baseDemand,
        cls: "fill-demand",
        hint: "Volume to carry in Year " + model.inputs.planningHorizon
      },
      {
        label: "Required Cap (Low Case)",
        val: capacity.requiredCapacityLow,
        cls: "fill-required-low",
        hint: "Conservative down-cycle requirement"
      },
      {
        label: "Required Cap (Base Case)",
        val: capacity.requiredCapacityBase,
        cls: "fill-required-base",
        hint: "Target capacity incl. " + model.inputs.targetCapacityBuffer + "% buffer"
      },
      {
        label: "Required Cap (High Case)",
        val: capacity.requiredCapacityHigh,
        cls: "fill-required-high",
        hint: "Upside surge protection requirement"
      }
    ];

    container.innerHTML = bars.map(b => {
      const pct = Math.min(100, Math.max(5, (b.val / maxVal) * 100));
      return `
        <div class="cap-bar-item">
          <div class="cap-bar-label" title="${b.hint}">${b.label}</div>
          <div class="cap-track">
            <div class="cap-fill ${b.cls}" style="width: ${pct}%;">
              ${pct > 25 ? SailCalcEngine.formatNumber(b.val) + " TEU" : ""}
            </div>
          </div>
          <div class="cap-value">${SailCalcEngine.formatNumber(b.val)} TEU</div>
        </div>
      `;
    }).join("");

    // Update Callout Box
    const calloutBox = document.getElementById("capacityCalloutBox");
    const calloutTitle = document.getElementById("calloutTitle");
    const calloutDesc = document.getElementById("calloutDesc");
    const calloutStats = document.getElementById("calloutStats");

    if (calloutBox) {
      if (capacity.isShortfall) {
        calloutBox.className = "capacity-callout callout-shortfall";
        if (calloutTitle) calloutTitle.textContent = "Capacity Shortfall Detected";
        if (calloutDesc) {
          calloutDesc.textContent = `Forecast required base capacity exceeds existing fleet by ${SailCalcEngine.formatNumber(capacity.additionalCapacity)} TEU/year (${capacity.additionalVessels} additional vessel equivalents needed).`;
        }
        if (calloutStats) {
          calloutStats.innerHTML = `<span style="color:var(--color-danger);">Shortfall: -${SailCalcEngine.formatNumber(capacity.additionalCapacity)} TEU</span>`;
        }
      } else {
        calloutBox.className = "capacity-callout callout-surplus";
        if (calloutTitle) calloutTitle.textContent = "Capacity Surplus Available";
        if (calloutDesc) {
          calloutDesc.textContent = `Current fleet capacity has a surplus buffer of +${SailCalcEngine.formatNumber(capacity.capacitySurplusShortfall)} TEU/year above base requirements. Focus on route optimization and yield management.`;
        }
        if (calloutStats) {
          calloutStats.innerHTML = `<span style="color:var(--color-success);">Surplus: +${SailCalcEngine.formatNumber(capacity.capacitySurplusShortfall)} TEU</span>`;
        }
      }
    }
  }

  /**
   * Render Three-Layer Capacity Commitment Strategy & Mathematical Reconciliation Waterfall
   */
  function renderThreeLayerCommitment(layers, capacity) {
    const { locked, flexible, watchZone, totalIncrementalCapacityTEU } = layers;

    // 1. Locked Layer Card
    const layerLockedTEU = document.getElementById("layerLockedTEU");
    const layerLockedVessels = document.getElementById("layerLockedVessels");
    const layerLockedShare = document.getElementById("layerLockedShare");
    const layerLockedApproach = document.getElementById("layerLockedApproach");
    const layerLockedRationale = document.getElementById("layerLockedRationale");

    if (layerLockedTEU) layerLockedTEU.textContent = `${SailCalcEngine.formatNumber(locked.teu)} TEU`;
    if (layerLockedVessels) layerLockedVessels.textContent = `${locked.vessels} Vessel Equivalents`;
    if (layerLockedShare) layerLockedShare.textContent = `${SailCalcEngine.formatDecimal(locked.sharePct)}%`;
    if (layerLockedApproach) layerLockedApproach.textContent = locked.commitmentApproach;
    if (layerLockedRationale) layerLockedRationale.textContent = locked.rationale;

    // 2. Flexible Layer Card
    const layerFlexTEU = document.getElementById("layerFlexTEU");
    const layerFlexVessels = document.getElementById("layerFlexVessels");
    const layerFlexShare = document.getElementById("layerFlexShare");
    const layerFlexApproach = document.getElementById("layerFlexApproach");
    const layerFlexRationale = document.getElementById("layerFlexRationale");

    if (layerFlexTEU) layerFlexTEU.textContent = `${SailCalcEngine.formatNumber(flexible.teu)} TEU`;
    if (layerFlexVessels) layerFlexVessels.textContent = `${flexible.vessels} Vessel Equivalents`;
    if (layerFlexShare) layerFlexShare.textContent = `${SailCalcEngine.formatDecimal(flexible.sharePct)}%`;
    if (layerFlexApproach) layerFlexApproach.textContent = flexible.commitmentApproach;
    if (layerFlexRationale) layerFlexRationale.textContent = flexible.rationale;

    // 3. Watch Zone Layer Card
    const layerWatchTEU = document.getElementById("layerWatchTEU");
    const layerWatchVessels = document.getElementById("layerWatchVessels");
    const layerWatchShare = document.getElementById("layerWatchShare");
    const layerWatchApproach = document.getElementById("layerWatchApproach");
    const layerWatchRationale = document.getElementById("layerWatchRationale");

    if (layerWatchTEU) layerWatchTEU.textContent = `${SailCalcEngine.formatNumber(watchZone.teu)} TEU`;
    if (layerWatchVessels) layerWatchVessels.textContent = `${watchZone.vessels} Vessel Equivalents`;
    if (layerWatchShare) layerWatchShare.textContent = `${SailCalcEngine.formatDecimal(watchZone.sharePct)}%`;
    if (layerWatchApproach) layerWatchApproach.textContent = watchZone.commitmentApproach;
    if (layerWatchRationale) layerWatchRationale.textContent = watchZone.rationale;

    // 4. Mathematical Reconciliation Stacked Bar
    const stackedBar = document.getElementById("reconcileStackedBar");
    const totalLabel = document.getElementById("reconcileTotalLabel");

    const totalHighCap = Math.max(1, capacity.requiredCapacityHigh);
    if (totalLabel) {
      totalLabel.textContent = `Total High Requirement: ${SailCalcEngine.formatNumber(totalHighCap)} TEU (100% Reconciled)`;
    }

    if (stackedBar) {
      // Calculate share of Total High Requirement
      const currShare = (capacity.currentCap / totalHighCap) * 100;
      const lockedShare = (locked.teu / totalHighCap) * 100;
      const flexShare = (flexible.teu / totalHighCap) * 100;
      const watchShare = (watchZone.teu / totalHighCap) * 100;

      let html = "";
      if (currShare > 0) {
        html += `<div class="stack-slice slice-current" style="width:${currShare}%;" title="Current Fleet: ${SailCalcEngine.formatNumber(capacity.currentCap)} TEU">${currShare > 12 ? 'Current Fleet (' + Math.round(currShare) + '%)' : ''}</div>`;
      }
      if (lockedShare > 0) {
        html += `<div class="stack-slice slice-locked" style="width:${lockedShare}%;" title="Locked Capacity: ${SailCalcEngine.formatNumber(locked.teu)} TEU">${lockedShare > 10 ? 'Locked (' + Math.round(lockedShare) + '%)' : ''}</div>`;
      }
      if (flexShare > 0) {
        html += `<div class="stack-slice slice-flexible" style="width:${flexShare}%;" title="Flexible Capacity: ${SailCalcEngine.formatNumber(flexible.teu)} TEU">${flexShare > 10 ? 'Flex (' + Math.round(flexShare) + '%)' : ''}</div>`;
      }
      if (watchShare > 0) {
        html += `<div class="stack-slice slice-watch" style="width:${watchShare}%;" title="Watch Zone Capacity: ${SailCalcEngine.formatNumber(watchZone.teu)} TEU">${watchShare > 10 ? 'Watch (' + Math.round(watchShare) + '%)' : ''}</div>`;
      }

      stackedBar.innerHTML = html;
    }
  }

  /**
   * Render Vessel Fleet Specification Table
   */
  function renderVesselSpecsTable(model) {
    const tbody = document.getElementById("vesselSpecsTableBody");
    if (!tbody) return;

    const { capacity, inputs } = model;

    tbody.innerHTML = VESSEL_CLASSES.map(v => {
      const isSelected = v.id === inputs.selectedVesselClass;
      // Calculate hypothetical vessel equivalents if this specific class were chosen exclusively
      const reqVesselsForClass = Math.ceil(capacity.requiredCapacityBase / v.annualProductivityTEU);

      return `
        <tr class="${isSelected ? 'selected-vessel-row' : ''}">
          <td>
            <strong>${v.name}</strong>
            ${isSelected ? ' <span class="system-badge" style="background:var(--primary); color:#fff; font-size:9px; padding:2px 6px;">SELECTED</span>' : ''}
          </td>
          <td>${SailCalcEngine.formatNumber(v.nominalTEU)} TEU</td>
          <td>${SailCalcEngine.formatNumber(v.effectiveTEU)} TEU</td>
          <td>${SailCalcEngine.formatNumber(v.annualProductivityTEU)} TEU/yr</td>
          <td>${SailCalcEngine.formatCurrency(v.annualOpCostUSD, true)} / yr</td>
          <td><strong>${reqVesselsForClass}</strong> vessels</td>
          <td style="color:var(--text-muted); font-size:11px;">${v.deploymentSuitability}</td>
        </tr>
      `;
    }).join("");
  }

  /**
   * Render Cost Sensitivity Analysis
   */
  function renderCostSensitivity(costBands) {
    // Low Band
    document.getElementById("costLowTotal").textContent = SailCalcEngine.formatCurrency(costBands.low.totalFleetCostUSD, true);
    document.getElementById("costLowUnit").textContent = SailCalcEngine.formatCurrency(costBands.low.unitOpCostUSD, true);
    document.getElementById("costLowIncr").textContent = SailCalcEngine.formatCurrency(costBands.low.incrementalFleetCostUSD, true);
    document.getElementById("costLowPerTEU").textContent = `${SailCalcEngine.formatCurrency(costBands.low.costPerTEU)} / TEU`;
    document.getElementById("costLowLocked").textContent = SailCalcEngine.formatCurrency(costBands.low.lockedCostUSD, true);
    document.getElementById("costLowFlex").textContent = SailCalcEngine.formatCurrency(costBands.low.flexibleCostUSD, true);

    // Base Band
    document.getElementById("costBaseTotal").textContent = SailCalcEngine.formatCurrency(costBands.base.totalFleetCostUSD, true);
    document.getElementById("costBaseUnit").textContent = SailCalcEngine.formatCurrency(costBands.base.unitOpCostUSD, true);
    document.getElementById("costBaseIncr").textContent = SailCalcEngine.formatCurrency(costBands.base.incrementalFleetCostUSD, true);
    document.getElementById("costBasePerTEU").textContent = `${SailCalcEngine.formatCurrency(costBands.base.costPerTEU)} / TEU`;
    document.getElementById("costBaseLocked").textContent = SailCalcEngine.formatCurrency(costBands.base.lockedCostUSD, true);
    document.getElementById("costBaseFlex").textContent = SailCalcEngine.formatCurrency(costBands.base.flexibleCostUSD, true);

    // High Band
    document.getElementById("costHighTotal").textContent = SailCalcEngine.formatCurrency(costBands.high.totalFleetCostUSD, true);
    document.getElementById("costHighUnit").textContent = SailCalcEngine.formatCurrency(costBands.high.unitOpCostUSD, true);
    document.getElementById("costHighIncr").textContent = SailCalcEngine.formatCurrency(costBands.high.incrementalFleetCostUSD, true);
    document.getElementById("costHighPerTEU").textContent = `${SailCalcEngine.formatCurrency(costBands.high.costPerTEU)} / TEU`;
    document.getElementById("costHighLocked").textContent = SailCalcEngine.formatCurrency(costBands.high.lockedCostUSD, true);
    document.getElementById("costHighFlex").textContent = SailCalcEngine.formatCurrency(costBands.high.flexibleCostUSD, true);
  }

  /**
   * Render Gantt-style Investment and Deployment Roadmap
   */
  function renderRoadmapSchedule(schedule) {
    const chart = document.getElementById("ganttChart");
    const countEl = document.getElementById("roadmapQuarterCount");
    if (!chart) return;

    if (countEl) countEl.textContent = schedule.totalQuarters;

    // Render header quarters
    let headerQuartersHtml = "";
    for (let q = 1; q <= schedule.totalQuarters; q++) {
      headerQuartersHtml += `<div>Q${q}</div>`;
    }

    let rowsHtml = `
      <div class="gantt-header">
        <div>Milestone / Activity Phase</div>
        <div class="gantt-quarter-cols" style="grid-template-columns: repeat(${schedule.totalQuarters}, 1fr);">
          ${headerQuartersHtml}
        </div>
      </div>
    `;

    // Render phase rows
    schedule.phases.forEach(p => {
      // Calculate CSS percentage left and width based on total quarters
      const startQuarter = Math.max(1, p.startQuarter);
      const duration = Math.min(schedule.totalQuarters - startQuarter + 1, p.durationQuarters);
      const leftPct = ((startQuarter - 1) / schedule.totalQuarters) * 100;
      const widthPct = (duration / schedule.totalQuarters) * 100;

      let barClass = "gantt-bar-planning";
      if (p.category === "Locked") barClass = "gantt-bar-locked";
      else if (p.category === "Flexible") barClass = "gantt-bar-flexible";
      else if (p.category === "Watch") barClass = "gantt-bar-watch";
      else if (p.category === "Deployment") barClass = "gantt-bar-execution";

      rowsHtml += `
        <div class="gantt-row">
          <div class="gantt-label">
            <span class="gantt-phase-name">${p.name}</span>
            <span class="gantt-phase-meta">${p.milestoneText}</span>
          </div>
          <div class="gantt-timeline-area" style="grid-template-columns: repeat(${schedule.totalQuarters}, 1fr);">
            <div class="gantt-bar ${barClass}" style="left:${leftPct}%; width:${widthPct}%;" title="${p.name} (Q${startQuarter}-Q${startQuarter + duration - 1}): ${p.milestoneText}">
              ${p.status}
            </div>
          </div>
        </div>
      `;
    });

    chart.innerHTML = rowsHtml;
  }

  /**
   * Render Strategy Brief preview
   */
  function renderStrategyBrief(model) {
    const container = document.getElementById("briefContainer");
    if (!container) return;

    const activeScenario = scenariosList.find(s => s.id === activeScenarioId);
    const scenarioName = activeScenario ? activeScenario.name : "Active Working Scenario";
    const briefMarkdown = SailCalcEngine.generateStrategyBrief(model, scenarioName);

    // Render lightweight formatted HTML from markdown
    container.innerHTML = formatMarkdownToHTML(briefMarkdown);
  }

  /**
   * Simple, reliable markdown to clean HTML converter for Strategy Brief rendering
   */
  function formatMarkdownToHTML(md) {
    let html = md
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^---$/gim, '<hr style="border:0; border-top:1px solid var(--border-light); margin:16px 0;">')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>');

    // Parse simple markdown tables
    const tableRegex = /\|(.+)\|\n\|[-:| ]+\|\n((\|.*\|\n?)+)/g;
    html = html.replace(tableRegex, (match, headerLine, bodyLines) => {
      const headers = headerLine.split('|').map(h => h.trim()).filter(h => h);
      const ths = headers.map(h => `<th>${h}</th>`).join('');

      const rows = bodyLines.trim().split('\n').map(row => {
        const cells = row.split('|').map(c => c.trim()).filter(c => c);
        const tds = cells.map(c => `<td>${c}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');

      return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
    });

    // Parse bullet lists
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/gm, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Paragraphs
    html = html.split('\n\n').map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<h') || p.startsWith('<table') || p.startsWith('<ul') || p.startsWith('<hr')) {
        return p;
      }
      return `<p>${p}</p>`;
    }).join('\n');

    return html;
  }

  /**
   * Toast notification utility
   */
  function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span>●</span> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => toast.remove(), 350);
    }, 2800);
  }

  // Run initialization on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
