/**
 * SAIL - Scenario & Intelligence for Liners
 * Data & Baseline Scenarios Definition
 * 
 * Defines standard synthetic maritime planning baselines,
 * 4 predefined strategic scenarios, and standard container vessel classes.
 */

// Standard Predefined Scenarios as mandated by SAIL specification
const PREDEFINED_SCENARIOS = [
  {
    id: "scenario-a",
    name: "Scenario A: Grow Ahead of the Market",
    badge: "Aggressive Growth",
    category: "predefined",
    situation: {
      demandGrowthDesc: "Demand growth is high (+14.0% p.a.)",
      ambitionDesc: "Business growth ambition is high (+18.0% p.a.)",
      competitorDesc: "Competitors are slow to add capacity (+2.0% p.a.)",
      marketCondition: "Strong cargo momentum with capacity constraints across competitors."
    },
    strategicMove: {
      summary: "Lock in next year's capacity early, build ahead of expected market demand, and prioritise early vessel acquisition or deployment.",
      keyActions: [
        "Commit firmly to low-case capacity using long-term charter / purchase arrangements.",
        "Pre-empt competitor reaction by securing scarce shipyard slots or tier-1 charter tonnage.",
        "Deploy vessels aggressively on primary trade routes to capture market share."
      ]
    },
    inputs: {
      marketDemandGrowth: 14.0,       // % annual market demand growth
      businessAmbitionGrowth: 18.0,   // % annual business growth ambition
      competitorCapacityGrowth: 2.0,  // % annual competitor capacity additions
      currentFleetCapacity: 160000,   // TEU annual capacity
      existingFleetUtilisation: 92.0, // % current fleet utilisation
      planningHorizon: 3,             // Years (1-5)
      targetCapacityBuffer: 10.0,     // % operational safety buffer
      averageVesselProductivity: 32000, // TEU carried per vessel / year
      annualVesselOpCost: 8500000,    // $ / vessel / year (Base operating cost)
      selectedVesselClass: "panamax"  // Default vessel class
    }
  },
  {
    id: "scenario-b",
    name: "Scenario B: Defend Market Position",
    badge: "Defensive Growth",
    category: "predefined",
    situation: {
      demandGrowthDesc: "Demand growth is moderate (+5.0% p.a.)",
      ambitionDesc: "Business ambition is moderate to high (+8.0% p.a.)",
      competitorDesc: "Competitors are adding capacity aggressively (+12.0% p.a.)",
      marketCondition: "Competitive rivalry intensifying; aggressive fleet expansion by rivals threatens market share."
    },
    strategicMove: {
      summary: "Protect existing market share, maintain sufficient committed capacity, and use flexible capacity to respond to competitive pressure.",
      keyActions: [
        "Defend slot share and port calling frequency on core corridors.",
        "Avoid over-committing long-term capital while competitors inflate fleet supply.",
        "Rely on medium- and short-term flexible charters to match competitor tariff and service pressure."
      ]
    },
    inputs: {
      marketDemandGrowth: 5.0,
      businessAmbitionGrowth: 8.0,
      competitorCapacityGrowth: 12.0,
      currentFleetCapacity: 160000,
      existingFleetUtilisation: 84.0,
      planningHorizon: 3,
      targetCapacityBuffer: 12.0,
      averageVesselProductivity: 32000,
      annualVesselOpCost: 8500000,
      selectedVesselClass: "panamax"
    }
  },
  {
    id: "scenario-c",
    name: "Scenario C: Preserve Flexibility",
    badge: "Flexible Expansion",
    category: "predefined",
    situation: {
      demandGrowthDesc: "Demand growth is uncertain (+2.5% p.a.)",
      ambitionDesc: "Business ambition is moderate (+4.0% p.a.)",
      competitorDesc: "Competitors are cautious (+3.5% p.a.)",
      marketCondition: "Macro volatility, geopolitical uncertainty, and fluctuating cargo volumes."
    },
    strategicMove: {
      summary: "Avoid excessive long-term commitments, prioritise flexible vessel arrangements, and delay irreversible investment decisions until demand becomes clearer.",
      keyActions: [
        "Limit locked commitments to absolute rock-bottom baseline volumes.",
        "Leverage index-linked and option-laden charter agreements.",
        "Set strict quarterly review trigger gates before exercising capacity options."
      ]
    },
    inputs: {
      marketDemandGrowth: 2.5,
      businessAmbitionGrowth: 4.0,
      competitorCapacityGrowth: 3.5,
      currentFleetCapacity: 160000,
      existingFleetUtilisation: 80.0,
      planningHorizon: 3,
      targetCapacityBuffer: 8.0,
      averageVesselProductivity: 32000,
      annualVesselOpCost: 8500000,
      selectedVesselClass: "panamax"
    }
  },
  {
    id: "scenario-d",
    name: "Scenario D: Protect Cash and Capacity",
    badge: "Capacity Preservation",
    category: "predefined",
    situation: {
      demandGrowthDesc: "Demand growth is weak / negative (-2.0% p.a.)",
      ambitionDesc: "Business ambition is conservative (0.0% p.a.)",
      competitorDesc: "Excess market capacity exists (+7.5% p.a. industry overhang)",
      marketCondition: "Depressed freight rates, sluggish global trade, and severe tonnage oversupply."
    },
    strategicMove: {
      summary: "Minimise new fleet commitments, optimise existing fleet utilisation, and defer or reduce new capacity investment.",
      keyActions: [
        "Freeze all discretionary vessel acquisitions and long-term lease renewals.",
        "Rationalize sailing rotations and slow-steam to optimize vessel productivity and fuel burn.",
        "Return chartered vessels upon expiration and offload surplus slot allocations."
      ]
    },
    inputs: {
      marketDemandGrowth: -2.0,
      businessAmbitionGrowth: 0.0,
      competitorCapacityGrowth: 7.5,
      currentFleetCapacity: 160000,
      existingFleetUtilisation: 72.0,
      planningHorizon: 3,
      targetCapacityBuffer: 5.0,
      averageVesselProductivity: 32000,
      annualVesselOpCost: 8500000,
      selectedVesselClass: "panamax"
    }
  }
];

// Standard Container Vessel Classes for Fleet Specification
const VESSEL_CLASSES = [
  {
    id: "feedermax",
    name: "Feedermax Container",
    nominalTEU: 2200,
    effectiveTEU: 1980,
    annualProductivityTEU: 22000,
    annualOpCostUSD: 5200000,
    deploymentSuitability: "Intra-Asia, feeder loops, shallow-draft river/island ports",
    speedKnots: 18.0,
    fuelConsumptionTonsDay: 28.0
  },
  {
    id: "panamax",
    name: "Sub-Panamax / Classic Panamax",
    nominalTEU: 4500,
    effectiveTEU: 4050,
    annualProductivityTEU: 32000,
    annualOpCostUSD: 8500000,
    deploymentSuitability: "Regional corridors, North-South trade lanes, Panama Canal transit",
    speedKnots: 19.5,
    fuelConsumptionTonsDay: 42.0
  },
  {
    id: "post-panamax",
    name: "Post-Panamax Wide-Beam",
    nominalTEU: 8500,
    effectiveTEU: 7650,
    annualProductivityTEU: 54000,
    annualOpCostUSD: 13800000,
    deploymentSuitability: "Intermediate trunk lines, Transpacific secondary, Europe-Med loops",
    speedKnots: 21.0,
    fuelConsumptionTonsDay: 68.0
  },
  {
    id: "neo-panamax",
    name: "Neo-Panamax (New Locks)",
    nominalTEU: 14500,
    effectiveTEU: 13200,
    annualProductivityTEU: 88000,
    annualOpCostUSD: 19200000,
    deploymentSuitability: "Mainline Asia-Europe, Transpacific hub-to-hub trunk corridors",
    speedKnots: 21.5,
    fuelConsumptionTonsDay: 95.0
  }
];

// Attach to globalThis / window for browser and Node.js testing environments
if (typeof globalThis !== "undefined") {
  globalThis.PREDEFINED_SCENARIOS = PREDEFINED_SCENARIOS;
  globalThis.VESSEL_CLASSES = VESSEL_CLASSES;
}
if (typeof window !== "undefined") {
  window.PREDEFINED_SCENARIOS = PREDEFINED_SCENARIOS;
  window.VESSEL_CLASSES = VESSEL_CLASSES;
}
