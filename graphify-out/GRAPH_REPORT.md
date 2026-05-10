# Graph Report - .  (2026-05-09)

## Corpus Check
- Corpus is ~38,989 words - fits in a single context window. You may not need a graph.

## Summary
- 113 nodes · 224 edges · 15 communities (5 shown, 10 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Criteria & Awards Configuration|Criteria & Awards Configuration]]
- [[_COMMUNITY_Prize & School Management|Prize & School Management]]
- [[_COMMUNITY_App Entry & Brand Identity|App Entry & Brand Identity]]
- [[_COMMUNITY_Cost & Results Analysis|Cost & Results Analysis]]
- [[_COMMUNITY_Period Management & States|Period Management & States]]
- [[_COMMUNITY_User Management & Modals|User Management & Modals]]
- [[_COMMUNITY_Authentication & Supabase|Authentication & Supabase]]
- [[_COMMUNITY_App Root & Navigation|App Root & Navigation]]
- [[_COMMUNITY_Profile Settings|Profile Settings]]
- [[_COMMUNITY_Entity Management|Entity Management]]
- [[_COMMUNITY_React Entry Point|React Entry Point]]
- [[_COMMUNITY_Header Component|Header Component]]
- [[_COMMUNITY_Footer Component|Footer Component]]
- [[_COMMUNITY_Vite Build Config|Vite Build Config]]
- [[_COMMUNITY_Eliezer Search Data|Eliezer Search Data]]

## God Nodes (most connected - your core abstractions)
1. `formatBRL()` - 9 edges
2. `CustomAward` - 6 edges
3. `Evaluation` - 6 edges
4. `SchoolUnit` - 6 edges
5. `supabase` - 6 edges
6. `formatCurrency()` - 6 edges
7. `parseMaskedString()` - 6 edges
8. `AwardCriterion` - 5 edges
9. `formatPercentageMask()` - 5 edges
10. `Sistema PremiaÃ§Ãµes EducaÃ§Ã£o ANRS App` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Graphify Knowledge Graph Instructions` --conceptually_related_to--> `Sistema PremiaÃ§Ãµes EducaÃ§Ã£o ANRS App`  [INFERRED]
  CLAUDE.md → README.md
- `Favicon Reference (/favicon.png)` --references--> `ANRS Brand Favicon - Letter A Logo`  [EXTRACTED]
  index.html → public/favicon.png
- `CostAnalysis()` --calls--> `formatBRL()`  [EXTRACTED]
  components/CostAnalysis.tsx → utils/formatting.ts
- `CriteriaEvaluator()` --calls--> `formatPercentageMask()`  [EXTRACTED]
  components/CriteriaEvaluator.tsx → utils/formatting.ts
- `ResultsPanel()` --calls--> `formatBRL()`  [EXTRACTED]
  components/ResultsPanel.tsx → utils/formatting.ts

## Hyperedges (group relationships)
- **ANRS Brand Asset Cluster** — favicon_png_brand, logo_png_brand, minilogo_png_brand, anrs_brand_identity [INFERRED 0.95]
- **Application Entry Point Cluster** — index_html_entry, index_html_root_div, index_html_index_tsx, readme_app_description [INFERRED 0.85]

## Communities (15 total, 10 thin omitted)

### Community 0 - "Criteria & Awards Configuration"
Cohesion: 0.14
Nodes (22): CriteriaEvaluatorProps, INITIAL_CATEGORIES, INITIAL_CUSTOM_AWARDS, AnrsBonusConfig, AppConfig, AwardLevel, Category, CriterionOption (+14 more)

### Community 1 - "Prize & School Management"
Cohesion: 0.17
Nodes (14): CriteriaEvaluator(), PrizeConfigProps, SchoolManager(), SchoolManagerProps, AwardCriterion, ComparisonOperator, CriterionType, SchoolUnit (+6 more)

### Community 2 - "App Entry & Brand Identity"
Cohesion: 0.18
Nodes (14): ANRS Brand Identity - Navy Blue Letter A with Swoosh, Graphify Knowledge Graph Instructions, ANRS Brand Favicon - Letter A Logo, HTML Entry Point (index.html), Favicon Reference (/favicon.png), index.tsx Module Entry Script, Inter Font (Google Fonts), React Root Mount Point (#root) (+6 more)

### Community 3 - "Cost & Results Analysis"
Cohesion: 0.23
Nodes (10): CostAnalysis(), CostAnalysisProps, ResultsPanel(), ResultsPanelProps, SchoolWithEvaluationStatus, SummaryTable(), SummaryTableProps, CustomAward (+2 more)

### Community 4 - "Period Management & States"
Cohesion: 0.29
Nodes (3): EmptyStateProps, PeriodManagerProps, Period

## Knowledge Gaps
- **33 isolated node(s):** `AppTab`, `INITIAL_CUSTOM_AWARDS`, `rootElement`, `root`, `ScoringRange` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `formatBRL()` connect `Cost & Results Analysis` to `Criteria & Awards Configuration`, `Prize & School Management`, `App Root & Navigation`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `formatPercentageMask()` connect `Prize & School Management` to `Criteria & Awards Configuration`, `App Root & Navigation`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `AppTab`, `INITIAL_CUSTOM_AWARDS`, `rootElement` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Criteria & Awards Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._