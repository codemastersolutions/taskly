# Security Report Template

## 🔒 Security Analysis

### Vulnerability Summary
- **Total Vulnerabilities:** {{TOTAL_VULNERABILITIES}}
- **Critical:** {{CRITICAL_COUNT}} 🔴
- **High:** {{HIGH_COUNT}} 🟠
- **Moderate:** {{MODERATE_COUNT}} 🟡
- **Low:** {{LOW_COUNT}} 🟢
- **Security Score:** {{SECURITY_SCORE}}/100

### Audit Results
- **Audit Level:** {{AUDIT_LEVEL}}
- **Threshold Met:** {{THRESHOLD_MET}}
- **Action Required:** {{ACTION_REQUIRED}}

{{#if VULNERABILITIES_DETAILS}}
### 🚨 Vulnerability Details

{{#each VULNERABILITIES_DETAILS}}
#### {{this.severity}} - {{this.title}}
- **Package:** `{{this.module_name}}`
- **Version:** {{this.version}}
- **Patched In:** {{this.patched_versions}}
- **Path:** {{this.paths}}
- **More Info:** [{{this.advisory}}]({{this.url}})

{{/each}}
{{/if}}

### Dependency Analysis
- **Total Dependencies:** {{TOTAL_DEPENDENCIES}}
- **Direct Dependencies:** {{DIRECT_DEPENDENCIES}}
- **Outdated Packages:** {{OUTDATED_COUNT}}
- **Deprecated Packages:** {{DEPRECATED_COUNT}}

{{#if OUTDATED_DETAILS}}
### 📦 Outdated Dependencies
| Package | Current | Latest | Type |
|---------|---------|--------|------|
{{#each OUTDATED_DETAILS}}
| {{this.name}} | {{this.current}} | {{this.latest}} | {{this.type}} |
{{/each}}
{{/if}}

### License Compliance
- **License Check:** {{LICENSE_CHECK_STATUS}}
- **Allowed Licenses:** {{ALLOWED_LICENSES}}
- **License Issues:** {{LICENSE_ISSUES_COUNT}}

{{#if LICENSE_ISSUES}}
### ⚖️ License Issues
{{#each LICENSE_ISSUES}}
- **{{this.package}}**: {{this.license}} ({{this.issue}})
{{/each}}
{{/if}}

### Secret Detection
- **Secrets Found:** {{SECRETS_FOUND}}
- **Patterns Checked:** {{PATTERNS_CHECKED}}

{{#if SECRETS_DETAILS}}
### 🔐 Detected Secrets
{{#each SECRETS_DETAILS}}
- **File:** {{this.file}}
- **Line:** {{this.line}}
- **Type:** {{this.type}}
- **Pattern:** {{this.pattern}}
{{/each}}
{{/if}}

### Security Recommendations
{{#if SECURITY_RECOMMENDATIONS}}
{{SECURITY_RECOMMENDATIONS}}
{{else}}
✅ No security recommendations at this time.
{{/if}}

---
*Security scan completed at {{TIMESTAMP}}*