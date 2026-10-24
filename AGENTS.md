# Guidelines & Architecture Rules for AI Coding Assistants

## 1. Protected Core Module: AI Detection Engine
- **Dedicated File**: `/src/utils/aiDetectionEngine.ts`
- **Isolation Rule**: All AI detection algorithms, heuristic weights, raw probability equations, sentence evaluation thresholds, Turnitin coverage formulas, edge-smoothing rules, and cliché phrase lists live strictly in `/src/utils/aiDetectionEngine.ts`.
- **PROTECTED STATUS**: When implementing UI modifications, styling adjustments, layout fixes, or other requested app features, **NEVER** edit `/src/utils/aiDetectionEngine.ts` or alter the AI detection rules, parameters, or percentages unless the user explicitly requests changes to the AI detection algorithm itself.

## 2. Separation of Responsibilities
- **Backend / Analysis**: `server.ts` and `/src/utils/aiDetectionEngine.ts` handle text analysis, sentence segmentation, and Turnitin report generation.
- **Frontend / Presentation**: `/src/components/*` components consume the generated `TurnitinReport` and display results, charts, and heatmaps.
- UI changes must strictly remain within visual components and layout logic without modifying data processing thresholds or detection formulas.
