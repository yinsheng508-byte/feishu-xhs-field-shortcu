const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'output');
const privateOutputDir = path.join(outputDir, 'private');
const sourceReadmePath = path.join(projectRoot, 'README.md');
const packagedReadmePath = path.join(privateOutputDir, 'README.md');

function resolveCliPath() {
  const binaryName = process.platform === 'win32' ? 'block-basekit-cli.cmd' : 'block-basekit-cli';
  return path.join(projectRoot, 'node_modules', '.bin', binaryName);
}

function runOfficialPack() {
  const cliPath = resolveCliPath();
  const result = spawnSync(cliPath, ['pack:field'], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
}

function findLatestZip() {
  const zipFiles = fs
    .readdirSync(outputDir)
    .filter((filename) => filename.endsWith('.zip'))
    .map((filename) => {
      const filePath = path.join(outputDir, filename);
      return {
        filePath,
        mtimeMs: fs.statSync(filePath).mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (!zipFiles.length) {
    throw new Error('pack succeeded but no zip file was found in output/');
  }

  return zipFiles[0].filePath;
}

function copyReadmeIntoPrivateOutput() {
  if (!fs.existsSync(privateOutputDir)) {
    throw new Error('pack succeeded but output/private was not created');
  }

  fs.copyFileSync(sourceReadmePath, packagedReadmePath);
}

function updateZipWithReadme(zipPath) {
  const result = spawnSync('zip', ['-q', '-u', zipPath, 'README.md'], {
    cwd: privateOutputDir,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
}

function main() {
  runOfficialPack();
  copyReadmeIntoPrivateOutput();
  const latestZipPath = findLatestZip();
  updateZipWithReadme(latestZipPath);
  console.log(`[pack-with-readme] added README.md to ${path.basename(latestZipPath)}`);
}

main();
