---
type: community
cohesion: 0.17
members: 18
---

# Prize & School Management

**Cohesion:** 0.17 - loosely connected
**Members:** 18 nodes

## Members
- [[AwardCriterion]] - code - types.ts
- [[ComparisonOperator]] - code - types.ts
- [[CriteriaEvaluator()]] - code - components/CriteriaEvaluator.tsx
- [[CriterionType]] - code - types.ts
- [[PrizeConfig()]] - code - components/PrizeConfig.tsx
- [[PrizeConfig.tsx]] - code - components/PrizeConfig.tsx
- [[PrizeConfigProps]] - code - components/PrizeConfig.tsx
- [[SchoolManager()]] - code - components/SchoolManager.tsx
- [[SchoolManager.tsx]] - code - components/SchoolManager.tsx
- [[SchoolManagerProps]] - code - components/SchoolManager.tsx
- [[SchoolUnit]] - code - types.ts
- [[formatCurrency()]] - code - utils/formatting.ts
- [[formatCurrencyInput()]] - code - utils/formatting.ts
- [[formatPercentage()]] - code - utils/formatting.ts
- [[formatPercentageMask()]] - code - utils/formatting.ts
- [[formatting.ts]] - code - utils/formatting.ts
- [[parseCurrencyString()]] - code - utils/formatting.ts
- [[parseMaskedString()]] - code - utils/formatting.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Prize__School_Management
SORT file.name ASC
```

## Connections to other communities
- 12 edges to [[_COMMUNITY_Criteria & Awards Configuration]]
- 9 edges to [[_COMMUNITY_App Root & Navigation]]
- 9 edges to [[_COMMUNITY_Cost & Results Analysis]]
- 1 edge to [[_COMMUNITY_User Management & Modals]]
- 1 edge to [[_COMMUNITY_Period Management & States]]

## Top bridge nodes
- [[PrizeConfig.tsx]] - degree 15, connects to 4 communities
- [[formatting.ts]] - degree 14, connects to 3 communities
- [[SchoolManager.tsx]] - degree 10, connects to 3 communities
- [[SchoolUnit]] - degree 6, connects to 3 communities
- [[AwardCriterion]] - degree 5, connects to 3 communities