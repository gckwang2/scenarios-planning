# SAIL | Scenario & Intelligence for Liners

**SAIL** is an executive-grade strategic fleet planning web application tailored for container liner network planners, commercial directors, and fleet investment committees.

SAIL connects the entire maritime decision-making pipeline:
```
Market Signals → Strategic Posture → Capacity Requirements → Vessel Selection → Commitment Strategy → Investment Roadmap → Cost Implications → Strategy Brief
```

---

## Key Capabilities

1. **Deterministic Rule-Based Decision Engine**:
   - Evaluates market demand growth, business growth ambition, and competitor capacity growth to recommend one of four strategic postures:
     - **Aggressive Growth**
     - **Defensive Growth**
     - **Flexible Expansion**
     - **Capacity Preservation**
   - Provides fully transparent rationales explaining the exact market signal thresholds triggered.

2. **Predefined Strategic Scenarios**:
   - **Scenario A: Grow Ahead of the Market** (High demand, high ambition, slow competitor growth; lock capacity early).
   - **Scenario B: Defend Market Position** (Moderate demand, aggressive competitor additions; protect market share with agile commitments).
   - **Scenario C: Preserve Flexibility** (Uncertain demand and macro volatility; avoid excessive long-term commitments).
   - **Scenario D: Protect Cash and Capacity** (Weak demand, high market overhang; minimize commitments, optimize utilization).
   - **Custom Scenario Management**: Users can adjust any planning variable, save custom scenarios with custom names into local storage, switch seamlessly between them, or reset to baselines.

3. **Three-Layer Capacity Commitment Strategy**:
   - Solves the fleet oversupply/undersupply dilemma by splitting incremental requirements into three reconciled layers:
     - **Locked Capacity:** Firm commitments (owned/long-term charters) meeting low-demand floor requirements.
     - **Flexible Capacity:** Agile commitments (short/medium charters, slot swaps) bridging low-to-base case requirements.
     - **Watch Zone Capacity:** Contingent options and broker watchlists covering high-case demand surges without upfront capital expenditure.
   - 100% mathematical reconciliation with the low, base, and high demand forecasts.

4. **Vessel Fleet Specification & Benchmark Classes**:
   - Feedermax (2,200 TEU)
   - Sub-Panamax / Classic Panamax (4,500 TEU)
   - Post-Panamax Wide-Beam (8,500 TEU)
   - Neo-Panamax (14,500 TEU)
   - Dynamically calculates vessel equivalents, utilization, and surplus/shortfall.

5. **Cost & Return Sensitivity Analysis**:
   - Evaluates Low Case (-10%), Base Case (100%), and High Case (+15%) annual vessel operating cost bands.
   - Details total annual fleet cost, incremental fleet cost, cost per TEU carried, and commitment layer breakdown.

6. **Gantt-Style Investment & Deployment Roadmap**:
   - Dynamically sequences milestones across the planning horizon (quarters Q1 to Q12/Q20).
   - Color-coded phases for Locked, Flexible, and Watch Zone capacity procurement, on-hire inspection, and service rotation induction.

7. **Dynamic Written Strategy Brief Generator**:
   - Generates an executive-ready written brief covering all 7 decision facets.
   - Export options: Copy text, download `.txt`, or print-ready formatted document (Print to PDF).

---

## Local Setup & Execution

SAIL is a pure client-side web application with zero external framework dependencies. It works completely offline and locally in any modern browser.

### Option 1: Direct File Open
Double-click `index.html` or open it directly in Google Chrome, Microsoft Edge, or Mozilla Firefox.

### Option 2: Local HTTP Server (Python)
In this directory, run:
```bash
python -m http.server 8080
```
Then navigate to: `http://localhost:8080` in your web browser.

---

## Technical Architecture & Files

- `index.html`: Semantic application layout, responsive grid, modals, and executive dashboard controls.
- `style.css`: Maritime corporate design system, responsive breakpoints (desktop/tablet), custom typography, and print styles.
- `data-scenarios.js`: Predefined scenarios, synthetic baselines, and container vessel class definitions.
- `calc-engine.js`: Pure deterministic calculation routines, posture engine rules, and Strategy Brief synthesis with detailed comments explaining all mathematical logic.
- `app.js`: Reactive controller, state management, two-way input binding, local storage persistence, and DOM rendering.
