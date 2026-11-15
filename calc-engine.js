/**
 * SAIL - Scenario & Intelligence for Liners
 * Strategic Calculation Engine & Rule-Based Decision Logic
 * 
 * Implements deterministic, rule-based calculations for:
 * 1. Demand projections across planning horizons
 * 2. Required fleet capacity & vessel equivalents
 * 3. Rule-based strategic posture determination & explanations
 * 4. Three-layer capacity commitment allocation (Locked, Flexible, Watch Zone)
 * 5. Cost sensitivity analysis (Low, Base, High cost bands)
 * 6. Dynamic Gantt-style investment roadmap scheduling
 * 7. Executive Strategy Brief generation
 */

const SailCalcEngine = {
  /**
   * Helper formatting functions
   */
  formatNumber(val) {
    if (isNaN(val) || val === null || val === undefined) return "0";
    return Math.round(val).toLocaleString("en-US");
  },

  formatDecimal(val, places = 1) {
    if (isNaN(val) || val === null || val === undefined) return "0.0";
    return Number(val).toLocaleString("en-US", {
      minimumFractionDigits: places,
      maximumFractionDigits: places
    });
  },

  formatCurrency(val, compact = false) {
    if (isNaN(val) || val === null || val === undefined) return "$0";
    if (compact) {
      if (Math.abs(val) >= 1e9) {
        return `$${(val / 1e9).toFixed(2)}B`;
      }
      if (Math.abs(val) >= 1e6) {
        return `$${(val / 1e6).toFixed(1)}M`;
      }
      if (Math.abs(val) >= 1e3) {
        return `$${(val / 1e3).toFixed(0)}K`;
      }
    }
    return `$${Math.round(val).toLocaleString("en-US")}`;
  },

  formatPercent(val, places = 1) {
    if (isNaN(val) || val === null || val === undefined) return "0.0%";
    const sign = val > 0 ? "+" : "";
    return `${sign}${Number(val).toFixed(places)}%`;
  },

  /**
   * Core Calculation Routine
   * Takes user input parameters and executes the full deterministic pipeline.
   * 
   * @param {Object} inputs User planning inputs
   * @returns {Object} Comprehensive calculation model
   */
  calculateModel(inputs) {
    // -------------------------------------------------------------
    // 1. EXTRACT & SANITIZE INPUT PARAMETERS
    // -------------------------------------------------------------
    const mktGrowth = Number(inputs.marketDemandGrowth) || 0;       // % p.a.
    const ambitionGrowth = Number(inputs.businessAmbitionGrowth) || 0; // % p.a.
    const compGrowth = Number(inputs.competitorCapacityGrowth) || 0;   // % p.a.
    const currentCap = Math.max(1000, Number(inputs.currentFleetCapacity) || 160000); // TEU
    const currentUtil = Math.min(100, Math.max(30, Number(inputs.existingFleetUtilisation) || 85)); // %
    const horizon = Math.min(5, Math.max(1, Math.round(Number(inputs.planningHorizon) || 3))); // Years
    const bufferPct = Math.min(30, Math.max(0, Number(inputs.targetCapacityBuffer) || 10)); // %
    const vesselProd = Math.max(1000, Number(inputs.averageVesselProductivity) || 32000); // TEU / vessel / yr
    const baseOpCost = Math.max(500000, Number(inputs.annualVesselOpCost) || 8500000); // $ / vessel / yr
    const vesselClassId = inputs.selectedVesselClass || "panamax";

    // Lookup vessel class definition
    const vesselSpec = VESSEL_CLASSES.find(v => v.id === vesselClassId) || VESSEL_CLASSES[1];

    // -------------------------------------------------------------
    // 2. DEMAND FORECASTING (LOW, BASE, HIGH CASES)
    // -------------------------------------------------------------
    // Initial active volume carried today = Current capacity * current utilisation
    // Rationale: Demonstrates actual cargo moved in the base year
    const initialDemandTEU = currentCap * (currentUtil / 100);

    // Baseline demand growth trajectory:
    // Base Case compound growth rate is driven by strategic ambition
    const baseGrowthRate = ambitionGrowth / 100;
    const baseDemand = initialDemandTEU * Math.pow(1 + baseGrowthRate, horizon);

    // Low Case growth rate: Conservative down-cycle sensitivity
    // Reflects slower demand growth (either market down-trend or 65% of ambition)
    const lowGrowthRate = Math.min(mktGrowth - 3.5, ambitionGrowth * 0.65) / 100;
    const lowDemand = initialDemandTEU * Math.pow(Math.max(0.5, 1 + lowGrowthRate), horizon);

    // High Case growth rate: Upside surge market sensitivity
    // Reflects cargo expansion above ambition (or high market growth + 3%)
    const highGrowthRate = Math.max(mktGrowth + 3.0, ambitionGrowth * 1.25) / 100;
    const highDemand = initialDemandTEU * Math.pow(1 + highGrowthRate, horizon);

    // -------------------------------------------------------------
    // 3. REQUIRED CAPACITY CALCULATIONS
    // -------------------------------------------------------------
    // Required Capacity = [Forecast Demand * (1 + Safety Buffer)] / Operational Target Utilisation
    // We assume a healthy operational target utilisation of 88% to prevent network congestion
    const targetUtilRate = 0.88;
    const safetyBufferFactor = 1 + (bufferPct / 100);

    // Base required capacity
    const requiredCapacityBase = (baseDemand * safetyBufferFactor) / targetUtilRate;
    
    // Low case required capacity
    const requiredCapacityLow = (lowDemand * safetyBufferFactor) / targetUtilRate;

    // High case required capacity
    const requiredCapacityHigh = (highDemand * safetyBufferFactor) / targetUtilRate;

    // Additional capacity required (incremental over existing fleet)
    const additionalCapacity = Math.max(0, requiredCapacityBase - currentCap);
    
    // Capacity surplus or shortfall
    const capacitySurplusShortfall = currentCap - requiredCapacityBase;
    const isShortfall = capacitySurplusShortfall < 0;

    // -------------------------------------------------------------
    // 4. VESSEL EQUIVALENTS & FLEET REQUIREMENTS
    // -------------------------------------------------------------
    // Current fleet vessel equivalents = Current capacity / Vessel productivity
    const currentVessels = Math.ceil(currentCap / vesselProd);

    // Total required vessel equivalents under Base Case
    const totalRequiredVessels = Math.ceil(requiredCapacityBase / vesselProd);

    // Additional vessels needed = ceil(additional capacity / vessel productivity)
    const additionalVessels = Math.max(0, Math.ceil(additionalCapacity / vesselProd));

    // Projected future fleet utilisation under Base Case
    // Utilisation = Forecast Demand / Effective Future Capacity
    const effectiveFutureCapacity = totalRequiredVessels * vesselProd;
    const projectedFutureUtilisation = effectiveFutureCapacity > 0 
      ? Math.min(100, (baseDemand / effectiveFutureCapacity) * 100) 
      : 0;

    // -------------------------------------------------------------
    // 5. STRATEGIC DECISION ENGINE (RULE-BASED POSTURE)
    // -------------------------------------------------------------
    // Evaluates market signals: Market Demand Growth, Ambition, Competitor Growth, Capacity Gap
    const postureResult = this.evaluateStrategicPosture({
      mktGrowth,
      ambitionGrowth,
      compGrowth,
      capacityGap: additionalCapacity,
      currentCap,
      isShortfall
    });

    // -------------------------------------------------------------
    // 6. THREE-LAYER CAPACITY COMMITMENT STRATEGY (RECONCILED)
    // -------------------------------------------------------------
    // Layer 1: LOCKED CAPACITY (Firm commitment)
    // Capacity required even under the lower-demand scenario.
    // Represents safe floor volume that will be fully absorbed even in a down-cycle.
    const lockedCapacityTEU = Math.max(0, requiredCapacityLow - currentCap);
    const lockedVessels = Math.ceil(lockedCapacityTEU / vesselProd);

    // Layer 2: FLEXIBLE CAPACITY (Adjustable commitment)
    // Incremental capacity required between low-case and base-case.
    // Handles expected growth while maintaining agility to de-hire if demand softens.
    const flexibleCapacityTEU = Math.max(0, requiredCapacityBase - Math.max(currentCap, requiredCapacityLow));
    const flexibleVessels = Math.ceil(flexibleCapacityTEU / vesselProd);

    // Layer 3: WATCH ZONE CAPACITY (Contingent capacity)
    // Incremental capacity required only if market surges to high-demand case.
    // Monitored via options, slot charters, and broker watchlists without fixed capex.
    const watchZoneCapacityTEU = Math.max(0, requiredCapacityHigh - Math.max(currentCap, requiredCapacityBase));
    const watchZoneVessels = Math.ceil(watchZoneCapacityTEU / vesselProd);

    // Reconciliation check:
    // Total Incremental Commitment Pool = Locked + Flexible + Watch Zone
    const totalIncrementalCapacityTEU = lockedCapacityTEU + flexibleCapacityTEU + watchZoneCapacityTEU;
    
    // Percent allocation of the incremental commitment pool
    const lockedSharePct = totalIncrementalCapacityTEU > 0 ? (lockedCapacityTEU / totalIncrementalCapacityTEU) * 100 : 0;
    const flexibleSharePct = totalIncrementalCapacityTEU > 0 ? (flexibleCapacityTEU / totalIncrementalCapacityTEU) * 100 : 0;
    const watchZoneSharePct = totalIncrementalCapacityTEU > 0 ? (watchZoneCapacityTEU / totalIncrementalCapacityTEU) * 100 : 0;

    // -------------------------------------------------------------
    // 7. COST & RETURN SENSITIVITY ANALYSIS (LOW, BASE, HIGH BANDS)
    // -------------------------------------------------------------
    // Financial assumptions as specified:
    // - Low Case Cost: 90% of base operating cost
    // - Base Case Cost: 100% of base operating cost
    // - High Case Cost: 115% of base operating cost (reflects bunker/inflation spikes)
    const costBands = {
      low: {
        multiplier: 0.90,
        label: "Low Case (-10%)",
        unitOpCostUSD: baseOpCost * 0.90,
        totalFleetCostUSD: totalRequiredVessels * (baseOpCost * 0.90),
        incrementalFleetCostUSD: additionalVessels * (baseOpCost * 0.90),
        costPerTEU: baseDemand > 0 ? (totalRequiredVessels * (baseOpCost * 0.90)) / baseDemand : 0,
        // Commitment layer cost implications
        lockedCostUSD: lockedVessels * (baseOpCost * 0.90),
        flexibleCostUSD: flexibleVessels * (baseOpCost * 0.90 * 1.05), // +5% flexibility premium
        watchZoneHoldingCostUSD: watchZoneVessels * (baseOpCost * 0.90 * 0.05) // 5% option holding fee
      },
      base: {
        multiplier: 1.00,
        label: "Base Case (100%)",
        unitOpCostUSD: baseOpCost * 1.00,
        totalFleetCostUSD: totalRequiredVessels * baseOpCost,
        incrementalFleetCostUSD: additionalVessels * baseOpCost,
        costPerTEU: baseDemand > 0 ? (totalRequiredVessels * baseOpCost) / baseDemand : 0,
        lockedCostUSD: lockedVessels * baseOpCost,
        flexibleCostUSD: flexibleVessels * (baseOpCost * 1.05),
        watchZoneHoldingCostUSD: watchZoneVessels * (baseOpCost * 0.05)
      },
      high: {
        multiplier: 1.15,
        label: "High Case (+15%)",
        unitOpCostUSD: baseOpCost * 1.15,
        totalFleetCostUSD: totalRequiredVessels * (baseOpCost * 1.15),
        incrementalFleetCostUSD: additionalVessels * (baseOpCost * 1.15),
        costPerTEU: baseDemand > 0 ? (totalRequiredVessels * (baseOpCost * 1.15)) / baseDemand : 0,
        lockedCostUSD: lockedVessels * (baseOpCost * 1.15),
        flexibleCostUSD: flexibleVessels * (baseOpCost * 1.15 * 1.05),
        watchZoneHoldingCostUSD: watchZoneVessels * (baseOpCost * 1.15 * 0.05)
      }
    };

    // -------------------------------------------------------------
    // 8. FLEET INVESTMENT & DEPLOYMENT ROADMAP GENERATION
    // -------------------------------------------------------------
    const roadmapSchedule = this.generateRoadmapSchedule({
      posture: postureResult.posture,
      horizon,
      lockedVessels,
      flexibleVessels,
      watchZoneVessels,
      additionalVessels
    });

    // -------------------------------------------------------------
    // 9. RETURN CONSOLIDATED MODEL
    // -------------------------------------------------------------
    return {
      inputs: {
        marketDemandGrowth: mktGrowth,
        businessAmbitionGrowth: ambitionGrowth,
        competitorCapacityGrowth: compGrowth,
        currentFleetCapacity: currentCap,
        existingFleetUtilisation: currentUtil,
        planningHorizon: horizon,
        targetCapacityBuffer: bufferPct,
        averageVesselProductivity: vesselProd,
        annualVesselOpCost: baseOpCost,
        selectedVesselClass: vesselClassId
      },
      vesselSpec,
      demand: {
        initialDemandTEU,
        baseDemand,
        lowDemand,
        highDemand,
        baseGrowthRate,
        lowGrowthRate,
        highGrowthRate
      },
      capacity: {
        currentCap,
        requiredCapacityBase,
        requiredCapacityLow,
        requiredCapacityHigh,
        additionalCapacity,
        capacitySurplusShortfall,
        isShortfall,
        currentVessels,
        totalRequiredVessels,
        additionalVessels,
        projectedFutureUtilisation
      },
      posture: postureResult,
      commitmentLayers: {
        locked: {
          teu: lockedCapacityTEU,
          vessels: lockedVessels,
          sharePct: lockedSharePct,
          commitmentApproach: "Owned newbuilds / Long-term firm charters (3-5+ years)",
          rationale: "Represents non-negotiable floor demand required even in a severe market downturn. Eliminates risk of costly idle tonnage.",
          riskRating: "Low Risk (Volume Guaranteed)",
          badgeColor: "locked"
        },
        flexible: {
          teu: flexibleCapacityTEU,
          vessels: flexibleVessels,
          sharePct: flexibleSharePct,
          commitmentApproach: "Short & medium-term charters (6-18 months), index-linked fixtures, slot swaps",
          rationale: "Covers incremental requirement to meet baseline growth. Preserves right-sizing agility should trade volume cool.",
          riskRating: "Moderate Risk (Flexible Exposure)",
          badgeColor: "flexible"
        },
        watchZone: {
          teu: watchZoneCapacityTEU,
          vessels: watchZoneVessels,
          sharePct: watchZoneSharePct,
          commitmentApproach: "Standby options, contingent charter slots, broker speed-dial alerts",
          rationale: "Protects high-demand upside. Pre-qualifies vessel supply without incurring binding capital expenditure until triggered.",
          riskRating: "Contingent Risk (Call Options Only)",
          badgeColor: "watch"
        },
        totalIncrementalCapacityTEU,
        reconciled: true
      },
      costBands,
      roadmapSchedule
    };
  },

  /**
   * Evaluates Strategic Posture using deterministic maritime business logic
   */
  evaluateStrategicPosture({ mktGrowth, ambitionGrowth, compGrowth, capacityGap, currentCap, isShortfall }) {
    let posture = "Flexible Expansion";
    let badgeClass = "badge-flexible";
    let rationale = "";
    let keySignals = [];

    // Condition 1: AGGRESSIVE GROWTH
    // Criteria: High market growth, high ambition, competitors slow to react
    if (
      (mktGrowth >= 8.0 && ambitionGrowth >= 10.0 && compGrowth <= 6.0) ||
      (ambitionGrowth - compGrowth >= 8.0 && mktGrowth >= 5.0)
    ) {
      posture = "Aggressive Growth";
      badgeClass = "badge-aggressive";
      rationale = "High market demand combined with robust business ambition and sluggish competitor fleet expansion presents an immediate strategic window to secure market share ahead of the industry.";
      keySignals = [
        `High market demand growth (+${mktGrowth.toFixed(1)}% p.a.) demonstrates strong baseline cargo absorption.`,
        `High business growth ambition (+${ambitionGrowth.toFixed(1)}% p.a.) mandates swift capacity additions.`,
        `Sluggish competitor expansion (+${compGrowth.toFixed(1)}% p.a.) guarantees minimal risk of immediate rate wars.`
      ];
    }
    // Condition 2: DEFENSIVE GROWTH
    // Criteria: Competitors expanding aggressively, threatening route share
    else if (
      (compGrowth >= 8.0 && ambitionGrowth >= 4.0) ||
      (compGrowth > mktGrowth + 4.0 && ambitionGrowth >= 3.0)
    ) {
      posture = "Defensive Growth";
      badgeClass = "badge-defensive";
      rationale = "Competitors are rapidly injecting capacity (+ " + compGrowth.toFixed(1) + "% p.a.), threatening service frequency and customer retention. The fleet must defend market position without getting trapped in irreversible oversupply.";
      keySignals = [
        `Competitors are deploying tonnage aggressively (+${compGrowth.toFixed(1)}% p.a.), threatening slot dominance.`,
        `Business ambition (+${ambitionGrowth.toFixed(1)}% p.a.) requires active slot protection on prime trade lanes.`,
        `Flexible capacity must be deployed to match competitor service frequency while guarding capital.`
      ];
    }
    // Condition 3: CAPACITY PRESERVATION
    // Criteria: Weak or negative demand, conservative ambition, or large existing capacity overhang
    else if (
      mktGrowth < 1.0 ||
      (ambitionGrowth <= 1.0 && compGrowth >= 4.0) ||
      (!isShortfall && capacityGap === 0 && mktGrowth <= 2.5)
    ) {
      posture = "Capacity Preservation";
      badgeClass = "badge-preservation";
      rationale = "Softening cargo demand and market oversupply make capital preservation paramount. The strategic focus shifts to fleet rationalisation, route consolidation, and returning expired charters.";
      keySignals = [
        `Subdued or negative market demand growth (${mktGrowth >= 0 ? "+" : ""}${mktGrowth.toFixed(1)}% p.a.) warns against expansion.`,
        `Conservative growth ambition (${ambitionGrowth.toFixed(1)}% p.a.) prioritises liquidity over slot growth.`,
        `Excess industry capacity calls for strict discipline to protect vessel yield and cash flow.`
      ];
    }
    // Condition 4: FLEXIBLE EXPANSION (Default for balanced / uncertain conditions)
    else {
      posture = "Flexible Expansion";
      badgeClass = "badge-flexible";
      rationale = "Market conditions exhibit moderate growth or heightened macro volatility. The recommended posture prioritises adjustable charter structures, delaying irreversible commitments until trade lane volume trends solidify.";
      keySignals = [
        `Moderate demand growth (+${mktGrowth.toFixed(1)}% p.a.) provides measured upside.`,
        `Balanced competitor dynamics (+${compGrowth.toFixed(1)}% p.a.) indicate steady industry discipline.`,
        `Heightened uncertainty favours short-to-medium term charter commitments over long-term capital lock-in.`
      ];
    }

    return {
      posture,
      badgeClass,
      rationale,
      keySignals
    };
  },

  /**
   * Generates dynamic Gantt-style investment and deployment roadmap milestones
   */
  generateRoadmapSchedule({ posture, horizon, lockedVessels, flexibleVessels, watchZoneVessels, additionalVessels }) {
    // Total planning periods in quarters (e.g. 3 years = 12 quarters)
    const totalQuarters = Math.max(4, horizon * 4);

    let phases = [];

    // Base timeline schedule calibrated to the strategic posture
    if (posture === "Aggressive Growth") {
      phases = [
        {
          id: "phase-1",
          name: "Confirm Capacity Requirements & Fleet Approval",
          category: "Planning",
          layer: "Planning",
          startQuarter: 1,
          durationQuarters: 2,
          milestoneText: "Board fleet authorization & greenlight",
          status: "Scheduled"
        },
        {
          id: "phase-2",
          name: "Secure Locked Capacity (Long-Term Fixtures)",
          category: "Locked",
          layer: "Locked Capacity",
          startQuarter: 1,
          durationQuarters: 3,
          milestoneText: `Execute long-term charter / purchase contracts (${lockedVessels} vessels)`,
          status: "High Priority"
        },
        {
          id: "phase-3",
          name: "Negotiate Flexible Vessel Arrangements",
          category: "Flexible",
          layer: "Flexible Capacity",
          startQuarter: 2,
          durationQuarters: 3,
          milestoneText: `Finalise agile charters & slot-swap agreements (${flexibleVessels} vessels)`,
          status: "In Progress"
        },
        {
          id: "phase-4",
          name: "Monitor Watch-Zone Triggers & Market Gates",
          category: "Watch",
          layer: "Watch Zone",
          startQuarter: 3,
          durationQuarters: totalQuarters - 2,
          milestoneText: `Continuous index monitoring for optional call pool (${watchZoneVessels} vessels)`,
          status: "Ongoing"
        },
        {
          id: "phase-5",
          name: "Acquire & Charter Vessel Inflow Window",
          category: "Execution",
          layer: "Fleet Inflow",
          startQuarter: 2,
          durationQuarters: 4,
          milestoneText: "Tonnage inspection, handover & sea trials",
          status: "Scheduled"
        },
        {
          id: "phase-6",
          name: "Deploy Additional Capacity on Core Loops",
          category: "Deployment",
          layer: "Deployment",
          startQuarter: 4,
          durationQuarters: totalQuarters - 3,
          milestoneText: "Service rotation induction & berth slot activation",
          status: "Planned"
        },
        {
          id: "phase-7",
          name: "Mid-Horizon Commitment Review & Optimization",
          category: "Governance",
          layer: "Governance",
          startQuarter: Math.min(totalQuarters, 6),
          durationQuarters: 2,
          milestoneText: "Evaluate load factor, vessel yields & competitor reactions",
          status: "Review Gate"
        }
      ];
    } else if (posture === "Defensive Growth") {
      phases = [
        {
          id: "phase-1",
          name: "Confirm Capacity Requirements & Competitor Benchmarking",
          category: "Planning",
          layer: "Planning",
          startQuarter: 1,
          durationQuarters: 2,
          milestoneText: "Slot-cost & tariff vulnerability audit",
          status: "Scheduled"
        },
        {
          id: "phase-2",
          name: "Secure Essential Locked Capacity",
          category: "Locked",
          layer: "Locked Capacity",
          startQuarter: 2,
          durationQuarters: 2,
          milestoneText: `Protect baseline slot coverage (${lockedVessels} vessels)`,
          status: "Scheduled"
        },
        {
          id: "phase-3",
          name: "Negotiate Fast Flexible Charters & Slot Swaps",
          category: "Flexible",
          layer: "Flexible Capacity",
          startQuarter: 1,
          durationQuarters: 3,
          milestoneText: `Secure 6-12 month adjustable capacity (${flexibleVessels} vessels)`,
          status: "High Priority"
        },
        {
          id: "phase-4",
          name: "Monitor Competitor Slot Dumping & Spot Rates",
          category: "Watch",
          layer: "Watch Zone",
          startQuarter: 2,
          durationQuarters: totalQuarters - 1,
          milestoneText: `Weekly freight index triggers (${watchZoneVessels} standby vessels)`,
          status: "Active"
        },
        {
          id: "phase-5",
          name: "Charter Vessel Inward Staging Window",
          category: "Execution",
          layer: "Fleet Inflow",
          startQuarter: 3,
          durationQuarters: 3,
          milestoneText: "Staggered delivery to match competitor sailing schedules",
          status: "Planned"
        },
        {
          id: "phase-6",
          name: "Targeted Deployment to Defend Market Share",
          category: "Deployment",
          layer: "Deployment",
          startQuarter: 4,
          durationQuarters: totalQuarters - 3,
          milestoneText: "Port call frequency protection & schedule buffering",
          status: "Planned"
        },
        {
          id: "phase-7",
          name: "Quarterly Competitive Defense Audit",
          category: "Governance",
          layer: "Governance",
          startQuarter: Math.min(totalQuarters, 5),
          durationQuarters: 2,
          milestoneText: "Route profitability & capacity right-sizing check",
          status: "Review Gate"
        }
      ];
    } else if (posture === "Capacity Preservation") {
      phases = [
        {
          id: "phase-1",
          name: "Audit Existing Fleet Utilisation & Route Yields",
          category: "Planning",
          layer: "Planning",
          startQuarter: 1,
          durationQuarters: 2,
          milestoneText: "Identify loss-making rotations and under-utilised tonnage",
          status: "High Priority"
        },
        {
          id: "phase-2",
          name: "Freeze Discretionary Locked Commitments",
          category: "Locked",
          layer: "Locked Capacity",
          startQuarter: 1,
          durationQuarters: 4,
          milestoneText: "Impose moratorium on new purchase orders & long-term leases",
          status: "Active"
        },
        {
          id: "phase-3",
          name: "Negotiate Early Redelivery & Charter Off-Hires",
          category: "Flexible",
          layer: "Flexible Capacity",
          startQuarter: 2,
          durationQuarters: 3,
          milestoneText: "Exercising off-hire options on expiring vessels",
          status: "Actionable"
        },
        {
          id: "phase-4",
          name: "Monitor Market Rebound & Scrapping Signals",
          category: "Watch",
          layer: "Watch Zone",
          startQuarter: 1,
          durationQuarters: totalQuarters,
          milestoneText: "Watch for idle fleet reduction & freight rate recovery",
          status: "Active"
        },
        {
          id: "phase-5",
          name: "Fleet Rationalisation & Slow-Steaming Implementation",
          category: "Execution",
          layer: "Fleet Inflow",
          startQuarter: 2,
          durationQuarters: 4,
          milestoneText: "Bunker optimization, voyage consolidation & dry-docking",
          status: "Scheduled"
        },
        {
          id: "phase-6",
          name: "Selective Fleet Redeployment",
          category: "Deployment",
          layer: "Deployment",
          startQuarter: 5,
          durationQuarters: Math.max(2, totalQuarters - 4),
          milestoneText: "Realign remaining vessels to high-margin contracts",
          status: "Contingent"
        },
        {
          id: "phase-7",
          name: "Semi-Annual Liquidity & Fleet Preservation Gate",
          category: "Governance",
          layer: "Governance",
          startQuarter: Math.min(totalQuarters, 4),
          durationQuarters: 2,
          milestoneText: "Cash burn review & capital preservation assessment",
          status: "Review Gate"
        }
      ];
    } else {
      // Flexible Expansion
      phases = [
        {
          id: "phase-1",
          name: "Confirm Capacity Requirements & Cargo Demand Drivers",
          category: "Planning",
          layer: "Planning",
          startQuarter: 1,
          durationQuarters: 2,
          milestoneText: "Trade forecast validation & key account volume commitments",
          status: "Scheduled"
        },
        {
          id: "phase-2",
          name: "Lock Conservative Baseline Capacity",
          category: "Locked",
          layer: "Locked Capacity",
          startQuarter: 2,
          durationQuarters: 2,
          milestoneText: `Secure rock-bottom low-case requirement (${lockedVessels} vessels)`,
          status: "Scheduled"
        },
        {
          id: "phase-3",
          name: "Establish Modular Charter Agreements & Options",
          category: "Flexible",
          layer: "Flexible Capacity",
          startQuarter: 2,
          durationQuarters: 3,
          milestoneText: `Execute flexible short-term fixtures (${flexibleVessels} vessels)`,
          status: "In Progress"
        },
        {
          id: "phase-4",
          name: "Monitor Watch-Zone Call Triggers",
          category: "Watch",
          layer: "Watch Zone",
          startQuarter: 2,
          durationQuarters: totalQuarters - 1,
          milestoneText: `Maintain option pool (${watchZoneVessels} standby vessels)`,
          status: "Active"
        },
        {
          id: "phase-5",
          name: "Staged Vessel Delivery & On-Hire Inspections",
          category: "Execution",
          layer: "Fleet Inflow",
          startQuarter: 3,
          durationQuarters: 3,
          milestoneText: "Staged on-hire window tied to cargo confirmations",
          status: "Planned"
        },
        {
          id: "phase-6",
          name: "Agile Fleet Deployment across Service Network",
          category: "Deployment",
          layer: "Deployment",
          startQuarter: 4,
          durationQuarters: totalQuarters - 3,
          milestoneText: "Flexible loop frequency scaling based on cargo bookings",
          status: "Planned"
        },
        {
          id: "phase-7",
          name: "Mid-Term Strategic Commitment Gate",
          category: "Governance",
          layer: "Governance",
          startQuarter: Math.min(totalQuarters, 6),
          durationQuarters: 2,
          milestoneText: "Assess volume conversion before converting flexible charters",
          status: "Review Gate"
        }
      ];
    }

    return {
      totalQuarters,
      horizonYears: horizon,
      phases
    };
  },

  /**
   * Dynamically generates the complete written executive strategy brief
   */
  generateStrategyBrief(model, scenarioName = "Current Working Scenario") {
    const { inputs, vesselSpec, demand, capacity, posture, commitmentLayers, costBands, roadmapSchedule } = model;

    const todayDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const isSurplus = !capacity.isShortfall;
    const gapAbsTEU = Math.abs(capacity.capacitySurplusShortfall);

    return `# SAIL STRATEGIC FLEET PLANNING BRIEF
**Document ID:** SAIL-STRAT-${Date.now().toString().slice(-6)}
**Scenario Reference:** ${scenarioName}
**Generated Date:** ${todayDate}
**Author:** SAIL Deterministic Fleet Planning Engine
**Status:** Official Strategy Brief (Synthetic Demo Baseline)

---

## 1. Executive Summary & Market Situation
This strategic brief sets out the recommended fleet deployment and capacity commitment strategy across a **${inputs.planningHorizon}-year planning horizon**. 

* **Market Cargo Demand Growth:** ${this.formatPercent(inputs.marketDemandGrowth)} p.a.
* **Internal Business Growth Ambition:** ${this.formatPercent(inputs.businessAmbitionGrowth)} p.a.
* **Competitor Capacity Additions:** ${this.formatPercent(inputs.competitorCapacityGrowth)} p.a.
* **Current Operating Fleet Capacity:** ${this.formatNumber(inputs.currentFleetCapacity)} TEU/year (Active Utilisation: ${this.formatDecimal(inputs.existingFleetUtilisation)}%)

Over the ${inputs.planningHorizon}-year horizon, base cargo demand is projected to increase from **${this.formatNumber(demand.initialDemandTEU)} TEU/year** to **${this.formatNumber(demand.baseDemand)} TEU/year**. 

${posture.rationale}

---

## 2. Recommended Strategic Posture
* **Strategic Posture:** **${posture.posture.toUpperCase()}**
* **Decision Engine Evaluation:**
${posture.keySignals.map(s => `  - ${s}`).join("\n")}

### Strategic Directive:
${
  posture.posture === "Aggressive Growth"
    ? "Capitalise on favorable market tailwinds by securing forward capacity commitments early. Build ahead of the market curve to capture high-value shipper contracts before competitor tonnage enters service."
    : posture.posture === "Defensive Growth"
    ? "Defend incumbent slot share and trade route frequencies aggressively. Leverage flexible, agile charters to counter competitor capacity dumping without taking on irreversible long-term financial liabilities."
    : posture.posture === "Capacity Preservation"
    ? "Execute strict operational discipline. Freeze discretionary capital expenditure, optimize current fleet utilisation, and rationalise service loops to preserve cash buffers."
    : "Maintain operational agility. Commit only to guaranteed floor volumes while staging incremental requirements through short-term charter arrangements and contingent option pools."
}

---

## 3. Capacity Requirements & Vessel Specifications
To satisfy forecast demand while safeguarding a **${this.formatDecimal(inputs.targetCapacityBuffer)}% operational safety buffer** at an 88% operational target utilisation rate:

* **Total Required Fleet Capacity (Base Case):** ${this.formatNumber(capacity.requiredCapacityBase)} TEU/year
* **Current Available Fleet Capacity:** ${this.formatNumber(capacity.currentCap)} TEU/year
* **Net Capacity Position:** ${isSurplus ? `Surplus of +${this.formatNumber(gapAbsTEU)} TEU/year` : `Shortfall of -${this.formatNumber(gapAbsTEU)} TEU/year`}
* **Additional Capacity Required:** ${this.formatNumber(capacity.additionalCapacity)} TEU/year

### Selected Vessel Specification:
* **Vessel Class:** ${vesselSpec.name} (${this.formatNumber(vesselSpec.nominalTEU)} Nominal TEU / ${this.formatNumber(vesselSpec.effectiveTEU)} Effective TEU)
* **Average Annual Vessel Productivity:** ${this.formatNumber(inputs.averageVesselProductivity)} TEU carried / vessel / year
* **Current Fleet Equivalents:** ${this.formatNumber(capacity.currentVessels)} vessels
* **Total Required Fleet Equivalents:** ${this.formatNumber(capacity.totalRequiredVessels)} vessels
* **Net Additional Vessels Required:** ${this.formatNumber(capacity.additionalVessels)} vessels
* **Operational Suitability:** ${vesselSpec.deploymentSuitability}

---

## 4. Three-Layer Capacity Commitment Strategy
To balance commercial ambition against downside demand risk, incremental capacity is allocated into three reconciled commitment layers:

| Commitment Layer | Incremental Capacity (TEU) | Vessel Equivalents | Share of Incremental | Recommended Procurement Mechanism | Risk & Strategic Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Locked Capacity** | ${this.formatNumber(commitmentLayers.locked.teu)} TEU | ${commitmentLayers.locked.vessels} vessels | ${this.formatDecimal(commitmentLayers.locked.sharePct)}% | ${commitmentLayers.locked.commitmentApproach} | ${commitmentLayers.locked.rationale} |
| **Flexible Capacity** | ${this.formatNumber(commitmentLayers.flexible.teu)} TEU | ${commitmentLayers.flexible.vessels} vessels | ${this.formatDecimal(commitmentLayers.flexible.sharePct)}% | ${commitmentLayers.flexible.commitmentApproach} | ${commitmentLayers.flexible.rationale} |
| **Watch Zone Capacity** | ${this.formatNumber(commitmentLayers.watchZone.teu)} TEU | ${commitmentLayers.watchZone.vessels} vessels | ${this.formatDecimal(commitmentLayers.watchZone.sharePct)}% | ${commitmentLayers.watchZone.commitmentApproach} | ${commitmentLayers.watchZone.rationale} |

* **Low Case Demand Coverage:** Fully satisfied by Current Fleet + Locked Capacity (${this.formatNumber(capacity.requiredCapacityLow)} TEU).
* **Base Case Demand Coverage:** Fully satisfied by Current Fleet + Locked + Flexible Capacity (${this.formatNumber(capacity.requiredCapacityBase)} TEU).
* **High Case Upside Protection:** Pre-screened and reserved under Watch Zone arrangements (${this.formatNumber(capacity.requiredCapacityHigh)} TEU).

---

## 5. Investment & Phased Deployment Roadmap
The implementation plan is structured across a **${roadmapSchedule.totalQuarters}-quarter execution timeline**:

${roadmapSchedule.phases.map(p => `* **Q${p.startQuarter}–Q${p.startQuarter + p.durationQuarters - 1}: ${p.name}**
  - Layer: *${p.layer}* | Status: *${p.status}*
  - Key Milestone: ${p.milestoneText}`).join("\n\n")}

---

## 6. Financial Implications & Cost Sensitivity Analysis
*Illustrative annual vessel operating cost baseline:* **${this.formatCurrency(inputs.annualVesselOpCost)} / vessel / year**.
Operating costs are evaluated across three deterministic sensitivity bands:

| Metric | Low Case (-10%) | Base Case (100%) | High Case (+15%) |
| :--- | :--- | :--- | :--- |
| **Unit Vessel Operating Cost** | ${this.formatCurrency(costBands.low.unitOpCostUSD)} | ${this.formatCurrency(costBands.base.unitOpCostUSD)} | ${this.formatCurrency(costBands.high.unitOpCostUSD)} |
| **Total Annual Fleet Cost** | ${this.formatCurrency(costBands.low.totalFleetCostUSD, true)} | ${this.formatCurrency(costBands.base.totalFleetCostUSD, true)} | ${this.formatCurrency(costBands.high.totalFleetCostUSD, true)} |
| **Incremental Fleet Cost** | ${this.formatCurrency(costBands.low.incrementalFleetCostUSD, true)} | ${this.formatCurrency(costBands.base.incrementalFleetCostUSD, true)} | ${this.formatCurrency(costBands.high.incrementalFleetCostUSD, true)} |
| **Average Cost per TEU Carried** | ${this.formatCurrency(costBands.low.costPerTEU)} / TEU | ${this.formatCurrency(costBands.base.costPerTEU)} / TEU | ${this.formatCurrency(costBands.high.costPerTEU)} / TEU |

### Commitment Layer Cost Breakdown (Base Band):
* **Locked Capacity Commitment:** ${this.formatCurrency(costBands.base.lockedCostUSD, true)} / year (Firm fixed commitment)
* **Flexible Capacity Commitment:** ${this.formatCurrency(costBands.base.flexibleCostUSD, true)} / year (Includes +5% charter agility buffer)
* **Watch Zone Holding Cost:** ${this.formatCurrency(costBands.base.watchZoneHoldingCostUSD, true)} / year (5% option reservation fee)

---

## 7. Strategic Risks & Key Monitoring Considerations
1. **Demand Growth Deviation:** If actual annual volume growth falls below the low-case threshold (${this.formatDecimal(demand.lowGrowthRate * 100)}% p.a.), immediately exercise redelivery options on flexible charters.
2. **Competitor Tonnage Dump:** Rapid deployment of rival mega-vessels may trigger freight rate volatility; maintain flexible slot swaps rather than locking owned tonnage.
3. **Bunker Price Fluctuations:** A 15% increase in fuel and operational costs elevates annual fleet operating expense to ${this.formatCurrency(costBands.high.totalFleetCostUSD, true)}. Enforce speed-reduction optimization across secondary loops.
4. **Charter Market Tightness:** In the event of acute feeder/panamax tonnage shortages, convert high-probability watch-zone options into firm fixtures 6 months ahead of scheduled deployment.

*Disclaimer: This strategic planning brief is generated using synthetic baseline demonstration data and deterministic planning rules. Prior to commercial commitment, figures must be verified against audited financial models and verified charter market quotes.*
`;
  }
};

// Attach to globalThis / window for browser and Node.js testing environments
if (typeof globalThis !== "undefined") {
  globalThis.SailCalcEngine = SailCalcEngine;
}
if (typeof window !== "undefined") {
  window.SailCalcEngine = SailCalcEngine;
}

