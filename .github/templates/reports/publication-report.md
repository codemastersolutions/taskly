# Publication Report Template

## 🚀 Publication Summary

### Version Information
- **Previous Version:** {{PREVIOUS_VERSION}}
- **New Version:** {{NEW_VERSION}}
- **Increment Type:** {{INCREMENT_TYPE}}
- **Release Type:** {{RELEASE_TYPE}}

### Publication Status
| Component | Status | Details |
|-----------|--------|---------|
| Version Management | {{VERSION_STATUS}} | {{VERSION_DETAILS}} |
| Pre-publish Validation | {{VALIDATION_STATUS}} | {{VALIDATION_DETAILS}} |
| NPM Publication | {{NPM_STATUS}} | {{NPM_DETAILS}} |
| GitHub Release | {{GITHUB_STATUS}} | {{GITHUB_DETAILS}} |

### Package Information
- **Package Name:** {{PACKAGE_NAME}}
- **Registry:** {{REGISTRY_URL}}
- **Package Size:** {{PACKAGE_SIZE}}
- **Published Files:** {{PUBLISHED_FILES_COUNT}} files

#### Published Files
```
{{PUBLISHED_FILES_LIST}}
```

### Release Notes
{{#if BREAKING_CHANGES}}
#### 💥 Breaking Changes
{{#each BREAKING_CHANGES}}
- {{this.description}} ({{this.commit}})
{{/each}}
{{/if}}

{{#if NEW_FEATURES}}
#### ✨ New Features
{{#each NEW_FEATURES}}
- {{this.description}} ({{this.commit}})
{{/each}}
{{/if}}

{{#if BUG_FIXES}}
#### 🐛 Bug Fixes
{{#each BUG_FIXES}}
- {{this.description}} ({{this.commit}})
{{/each}}
{{/if}}

{{#if OTHER_CHANGES}}
#### 🔧 Other Changes
{{#each OTHER_CHANGES}}
- {{this.description}} ({{this.commit}})
{{/each}}
{{/if}}

### Quality Metrics
- **Test Coverage:** {{TEST_COVERAGE}}%
- **Security Score:** {{SECURITY_SCORE}}/100
- **Quality Score:** {{QUALITY_SCORE}}/100
- **Bundle Health:** {{BUNDLE_HEALTH}}/100

### Cross-Platform Validation
| Platform | Node 16.x | Node 18.x | Node 20.x |
|----------|-----------|-----------|-----------|
| Ubuntu | {{UBUNTU_16_STATUS}} | {{UBUNTU_18_STATUS}} | {{UBUNTU_20_STATUS}} |
| Windows | {{WINDOWS_16_STATUS}} | {{WINDOWS_18_STATUS}} | {{WINDOWS_20_STATUS}} |
| macOS | {{MACOS_16_STATUS}} | {{MACOS_18_STATUS}} | {{MACOS_20_STATUS}} |

### Installation Instructions
```bash
# Install latest version
npm install {{PACKAGE_NAME}}@{{NEW_VERSION}}

# Install globally for CLI usage
npm install -g {{PACKAGE_NAME}}@{{NEW_VERSION}}

# Yarn
yarn add {{PACKAGE_NAME}}@{{NEW_VERSION}}

# pnpm
pnpm add {{PACKAGE_NAME}}@{{NEW_VERSION}}
```

### Verification
{{#if VERIFICATION_RESULTS}}
#### Post-Publication Verification
{{#each VERIFICATION_RESULTS}}
- **{{this.check}}**: {{this.status}} {{#if this.details}}({{this.details}}){{/if}}
{{/each}}
{{/if}}

### Performance Impact
- **Publication Duration:** {{PUBLICATION_DURATION}}
- **Download Time (1Mbps):** {{DOWNLOAD_TIME_1MBPS}}
- **Download Time (10Mbps):** {{DOWNLOAD_TIME_10MBPS}}
- **Install Time:** {{INSTALL_TIME}}

### Links
- 📦 [NPM Package]({{NPM_URL}})
- 🏷️ [GitHub Release]({{GITHUB_RELEASE_URL}})
- 📚 [Documentation]({{DOCUMENTATION_URL}})
- 🐛 [Report Issues]({{ISSUES_URL}})
- 💬 [Discussions]({{DISCUSSIONS_URL}})

### Next Steps
{{#if NEXT_STEPS}}
{{#each NEXT_STEPS}}
- {{this.action}}: {{this.description}}
{{/each}}
{{else}}
✅ Publication completed successfully. No further action required.
{{/if}}

{{#if PUBLICATION_WARNINGS}}
### ⚠️ Warnings
{{#each PUBLICATION_WARNINGS}}
- {{this.message}}
{{/each}}
{{/if}}

---
*Publication completed at {{TIMESTAMP}}*
*Workflow: [{{WORKFLOW_NAME}}]({{WORKFLOW_URL}})*