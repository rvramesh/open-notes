#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// MIT-compatible licenses
const APPROVED_LICENSES = [
  'MIT',
  'Apache-2.0',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'WTFPL',
  '0BSD',
  'Unlicense',
  'CC0-1.0',
];

// Function to get license info for a package
function getLicenseInfo(packageName) {
  try {
    const packagePath = path.join(
      process.cwd(),
      'node_modules',
      packageName,
      'package.json'
    );
    
    if (!fs.existsSync(packagePath)) {
      return null;
    }

    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return {
      name: pkg.name,
      version: pkg.version,
      license: pkg.license || 'UNKNOWN',
      author: pkg.author,
      homepage: pkg.homepage,
      repository: pkg.repository,
    };
  } catch (error) {
    return null;
  }
}

// Function to get all dependencies from package.json
function getAllDependencies(packageJsonPath) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const deps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  };
  
  return Object.keys(deps);
}

// Function to get all workspace dependencies
function getWorkspaceDependencies() {
  const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const workspaces = rootPkg.workspaces || [];
  
  let allDeps = new Set();
  
  // Add root dependencies
  getAllDependencies('package.json').forEach(dep => allDeps.add(dep));
  
  // Add workspace dependencies
  workspaces.forEach(workspace => {
    // Handle glob patterns like "packages/*" or direct paths like "packages/client"
    let dirs = [];
    
    if (workspace.includes('*')) {
      // Glob pattern: "packages/*"
      const pattern = workspace.replace('/*', '');
      try {
        dirs = fs.readdirSync(pattern)
          .map(dir => path.join(pattern, dir))
          .filter(dir => fs.statSync(dir).isDirectory());
      } catch (e) {
        console.warn(`⚠️  Could not read workspace pattern: ${workspace}`);
      }
    } else {
      // Direct path: "packages/client"
      if (fs.statSync(workspace).isDirectory()) {
        dirs = [workspace];
      }
    }
    
    dirs.forEach(dir => {
      const pkgPath = path.join(dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const workspaceDir = path.basename(dir);
        console.log(`  📁 Scanning workspace: ${workspaceDir}`);
        getAllDependencies(pkgPath).forEach(dep => allDeps.add(dep));
      }
    });
  });
  
  return Array.from(allDeps).sort();
}

// Main function
function main() {
  console.log('📦 Scanning dependencies for license compliance...\n');
  
  const dependencies = getWorkspaceDependencies();
  const licenseData = [];
  const flaggedLicenses = [];
  
  console.log(`Found ${dependencies.length} dependencies\n`);
  
  dependencies.forEach((dep, index) => {
    process.stdout.write(`\rProcessing: ${index + 1}/${dependencies.length}`);
    
    const info = getLicenseInfo(dep);
    if (!info) return;
    
    const licenseStr = typeof info.license === 'string' 
      ? info.license 
      : JSON.stringify(info.license);
    
    const isApproved = APPROVED_LICENSES.some(approved => 
      licenseStr.includes(approved)
    );
    
    licenseData.push({
      ...info,
      isApproved,
    });
    
    if (!isApproved && licenseStr !== 'UNKNOWN') {
      flaggedLicenses.push({
        name: info.name,
        license: licenseStr,
        version: info.version,
      });
    }
  });
  
  console.log(`\n\n✅ Scan complete!\n`);
  
  // Generate markdown
  const markdown = generateMarkdown(licenseData, flaggedLicenses);
  fs.writeFileSync('THIRD_PARTY_LICENSES.md', markdown);
  console.log('📄 Generated: THIRD_PARTY_LICENSES.md');
  
  // Generate JSON for client
  const jsonData = generateJSON(licenseData, flaggedLicenses);
  const jsonPath = path.join('packages', 'client', 'public', 'libraries.json');
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  console.log('📄 Generated: packages/client/public/libraries.json');
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total packages: ${licenseData.length}`);
  console.log(`   Approved licenses: ${licenseData.filter(d => d.isApproved).length}`);
  console.log(`   ⚠️  Flagged licenses: ${flaggedLicenses.length}`);
  
  if (flaggedLicenses.length > 0) {
    console.log('\n⚠️  Packages with non-approved licenses:');
    flaggedLicenses.forEach(pkg => {
      console.log(`   - ${pkg.name}@${pkg.version}: ${pkg.license}`);
    });
  }
}

function generateJSON(licenseData, flaggedLicenses) {
  const approvedByLicense = {};
  const flaggedByLicense = {};
  
  licenseData.forEach(d => {
    const license = d.license || 'UNKNOWN';
    if (d.isApproved) {
      if (!approvedByLicense[license]) {
        approvedByLicense[license] = [];
      }
      approvedByLicense[license].push({
        name: d.name,
        version: d.version,
        repository: d.repository && typeof d.repository === 'string' ? d.repository : d.repository?.url,
        homepage: d.homepage,
      });
    }
  });
  
  flaggedLicenses.forEach(pkg => {
    const license = pkg.license || 'UNKNOWN';
    if (!flaggedByLicense[license]) {
      flaggedByLicense[license] = [];
    }
    const fullData = licenseData.find(d => d.name === pkg.name);
    flaggedByLicense[license].push({
      name: pkg.name,
      version: pkg.version,
      repository: fullData?.repository && typeof fullData.repository === 'string' ? fullData.repository : fullData?.repository?.url,
      homepage: fullData?.homepage,
    });
  });

  return {
    metadata: {
      generatedOn: new Date().toISOString().split('T')[0],
      totalPackages: licenseData.length,
      approvedLicenses: licenseData.filter(d => d.isApproved).length,
      flaggedLicenses: flaggedLicenses.length,
    },
    licenses: approvedByLicense,
    flaggedLicenses: flaggedByLicense,
    approvedLicenses: APPROVED_LICENSES,
  };
}

function generateMarkdown(licenseData, flaggedLicenses) {
  let content = `# Third Party Licenses

This document lists all third-party dependencies and their licenses.

**Generated on:** ${new Date().toISOString().split('T')[0]}

## Summary

- **Total Packages:** ${licenseData.length}
- **Approved Licenses:** ${licenseData.filter(d => d.isApproved).length}
- **Flagged Licenses:** ${flaggedLicenses.length}

---

## License Breakdown

### MIT-Compatible Licenses ✅

`;

  const approvedByLicense = {};
  licenseData
    .filter(d => d.isApproved)
    .forEach(d => {
      const license = d.license || 'UNKNOWN';
      if (!approvedByLicense[license]) {
        approvedByLicense[license] = [];
      }
      approvedByLicense[license].push(d);
    });

  Object.entries(approvedByLicense)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([license, packages]) => {
      content += `\n#### ${license} (${packages.length})\n\n`;
      packages
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(pkg => {
          content += `- **${pkg.name}** (v${pkg.version})\n`;
          if (pkg.repository) {
            const repo = typeof pkg.repository === 'string' 
              ? pkg.repository 
              : pkg.repository.url;
            if (repo) {
              content += `  Repository: ${repo}\n`;
            }
          }
          if (pkg.homepage) {
            content += `  Homepage: ${pkg.homepage}\n`;
          }
        });
    });

  if (flaggedLicenses.length > 0) {
    content += `\n---\n\n### ⚠️ Non-MIT-Compatible Licenses (Review Required)\n\n`;
    
    const flaggedByLicense = {};
    flaggedLicenses.forEach(d => {
      const license = d.license || 'UNKNOWN';
      if (!flaggedByLicense[license]) {
        flaggedByLicense[license] = [];
      }
      flaggedByLicense[license].push(d);
    });

    Object.entries(flaggedByLicense)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([license, packages]) => {
        content += `\n#### ${license}\n\n`;
        packages
          .sort((a, b) => a.name.localeCompare(b.name))
          .forEach(pkg => {
            const info = licenseData.find(d => d.name === pkg.name);
            content += `- **${pkg.name}** (v${pkg.version})\n`;
            if (info?.repository) {
              const repo = typeof info.repository === 'string' 
                ? info.repository 
                : info.repository.url;
              if (repo) {
                content += `  Repository: ${repo}\n`;
              }
            }
            if (info?.homepage) {
              content += `  Homepage: ${info.homepage}\n`;
            }
            content += `  **Action Required:** Please review this license before using in production.\n`;
          });
      });
  }

  content += `\n---\n\n## Approved Licenses\n\nThe following licenses are considered MIT-compatible and approved:\n\n`;
  APPROVED_LICENSES.forEach(license => {
    content += `- ${license}\n`;
  });

  content += `\n## Notes\n\n`;
  content += `- This report was auto-generated by \`scripts/check-licenses.js\`\n`;
  content += `- Run \`npm run check-licenses\` to regenerate this file\n`;
  content += `- Please review flagged licenses before merging to production\n`;

  return content;
}

try {
  main();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
