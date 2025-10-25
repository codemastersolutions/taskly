# Bundle Analysis Report Template

## 📦 Bundle Size Analysis

### Bundle Overview
- **Total Bundle Size:** {{TOTAL_SIZE}}
- **Gzipped Size:** {{GZIPPED_SIZE}}
- **Size Limit:** {{SIZE_LIMIT}}
- **Status:** {{SIZE_STATUS}}

### Format Breakdown
| Format | Size | Gzipped | Limit | Status |
|--------|------|---------|-------|--------|
| CommonJS | {{CJS_SIZE}} | {{CJS_GZIPPED}} | {{CJS_LIMIT}} | {{CJS_STATUS}} |
| ESM | {{ESM_SIZE}} | {{ESM_GZIPPED}} | {{ESM_LIMIT}} | {{ESM_STATUS}} |
| UMD | {{UMD_SIZE}} | {{UMD_GZIPPED}} | {{UMD_LIMIT}} | {{UMD_STATUS}} |

### Entry Points Validation
| Entry Point | Path | Size | Status |
|-------------|------|------|--------|
| Main (CJS) | {{MAIN_PATH}} | {{MAIN_SIZE}} | {{MAIN_STATUS}} |
| Module (ESM) | {{MODULE_PATH}} | {{MODULE_SIZE}} | {{MODULE_STATUS}} |
| Types | {{TYPES_PATH}} | {{TYPES_SIZE}} | {{TYPES_STATUS}} |
| Binary | {{BIN_PATH}} | {{BIN_SIZE}} | {{BIN_STATUS}} |

### Size Trends
{{#if SIZE_HISTORY}}
#### Historical Size Changes
| Version | Size | Change | Percentage |
|---------|------|--------|------------|
{{#each SIZE_HISTORY}}
| {{this.version}} | {{this.size}} | {{this.change}} | {{this.percentage}} |
{{/each}}
{{/if}}

### Bundle Composition
{{#if BUNDLE_COMPOSITION}}
#### Top Dependencies by Size
| Package | Size | Percentage |
|---------|------|------------|
{{#each BUNDLE_COMPOSITION}}
| {{this.name}} | {{this.size}} | {{this.percentage}}% |
{{/each}}
{{/if}}

### Performance Metrics
- **Parse Time:** {{PARSE_TIME}}ms
- **Execution Time:** {{EXECUTION_TIME}}ms
- **Memory Usage:** {{MEMORY_USAGE}}MB
- **Tree Shaking Efficiency:** {{TREE_SHAKING_EFFICIENCY}}%

### Optimization Opportunities
{{#if OPTIMIZATION_SUGGESTIONS}}
{{#each OPTIMIZATION_SUGGESTIONS}}
- **{{this.type}}**: {{this.description}} (Potential savings: {{this.savings}})
{{/each}}
{{else}}
✅ No optimization opportunities identified.
{{/if}}

### Bundle Health Score
**Overall Score:** {{BUNDLE_HEALTH_SCORE}}/100

#### Score Breakdown
- **Size Efficiency:** {{SIZE_EFFICIENCY_SCORE}}/25
- **Performance:** {{PERFORMANCE_SCORE}}/25
- **Tree Shaking:** {{TREE_SHAKING_SCORE}}/25
- **Dependencies:** {{DEPENDENCIES_SCORE}}/25

{{#if BUNDLE_WARNINGS}}
### ⚠️ Warnings
{{#each BUNDLE_WARNINGS}}
- {{this.message}}
{{/each}}
{{/if}}

---
*Bundle analysis completed at {{TIMESTAMP}}*