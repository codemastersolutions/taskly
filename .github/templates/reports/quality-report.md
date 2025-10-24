# Quality Report Template

## 📊 Code Quality Analysis

### ESLint Results
- **Status:** {{LINT_STATUS}}
- **Errors:** {{LINT_ERRORS}}
- **Warnings:** {{LINT_WARNINGS}}
- **Files Checked:** {{LINT_FILES_COUNT}}

{{#if LINT_ERRORS_DETAILS}}
#### Error Details
```
{{LINT_ERRORS_DETAILS}}
```
{{/if}}

### Prettier Formatting
- **Status:** {{FORMAT_STATUS}}
- **Files Checked:** {{FORMAT_FILES_COUNT}}
- **Issues Found:** {{FORMAT_ISSUES}}

{{#if FORMAT_ISSUES_DETAILS}}
#### Formatting Issues
```
{{FORMAT_ISSUES_DETAILS}}
```
{{/if}}

### TypeScript Type Checking
- **Status:** {{TYPECHECK_STATUS}}
- **Type Errors:** {{TYPECHECK_ERRORS}}
- **Files Checked:** {{TYPECHECK_FILES_COUNT}}

{{#if TYPECHECK_ERRORS_DETAILS}}
#### Type Errors
```
{{TYPECHECK_ERRORS_DETAILS}}
```
{{/if}}

### Code Complexity Metrics
- **Cyclomatic Complexity:** {{COMPLEXITY_SCORE}}/10
- **Maintainability Index:** {{MAINTAINABILITY_SCORE}}/100
- **Technical Debt:** {{TECH_DEBT_MINUTES}} minutes

### Quality Score
**Overall Quality Score:** {{QUALITY_SCORE}}/100

{{#if QUALITY_RECOMMENDATIONS}}
### 🔧 Recommendations
{{QUALITY_RECOMMENDATIONS}}
{{/if}}

---
*Report generated at {{TIMESTAMP}}*