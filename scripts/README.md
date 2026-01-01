# License Compliance Automation

This directory contains scripts for managing license compliance in the project.

## `check-licenses.cjs`

Automated Node.js script that scans all project dependencies and validates their licenses for compliance.

### Features

✅ **Comprehensive Scanning**

- Scans all dependencies across the monorepo
- Includes `dependencies`, `devDependencies`, and `peerDependencies`
- Works with npm workspaces

📋 **License Validation**

- Validates against a pre-approved list of MIT-compatible licenses
- Flags non-compliant licenses for review
- Provides detailed attribution information

📄 **Documentation Generation**

- Generates `THIRD_PARTY_LICENSES.md` with full attribution
- Organized by license type
- Includes repository and homepage links

### Usage

Run the license check:

```bash
npm run check-licenses
```

This will:

1. Scan all dependencies
2. Validate licenses
3. Generate `THIRD_PARTY_LICENSES.md`
4. Display a summary in the console

### Output

The script produces:

- **Console Report**: Summary of approved/flagged licenses
- **THIRD_PARTY_LICENSES.md**: Complete attribution document for compliance

### Approved Licenses

The following licenses are pre-approved (MIT-compatible):

- MIT
- Apache-2.0
- ISC
- BSD-2-Clause
- BSD-3-Clause
- WTFPL
- 0BSD
- Unlicense
- CC0-1.0

### Adding New Approved Licenses

Edit `scripts/check-licenses.cjs` and update the `APPROVED_LICENSES` array:

```javascript
const APPROVED_LICENSES = [
  "MIT",
  "Apache-2.0",
  "ISC",
  // Add new licenses here
];
```

### Workflow

1. **Before commit**: Run `npm run check-licenses`
2. **Review output**: Check console for flagged licenses
3. **Review generated file**: Check `THIRD_PARTY_LICENSES.md`
4. **Approve licenses**: Either add to approved list or update workflow
5. **Commit**: Include the generated `THIRD_PARTY_LICENSES.md` in git

### CI/CD Integration

Add to your CI pipeline to enforce license compliance:

```bash
node scripts/check-licenses.cjs && [ $(grep -c "⚠️ Flagged" THIRD_PARTY_LICENSES.md) -eq 0 ]
```

Or check the exit code:

```bash
node scripts/check-licenses.cjs || exit 1
```
