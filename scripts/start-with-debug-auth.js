const path = require('path');
const { spawn } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const binaryName = process.platform === 'win32' ? 'block-basekit-cli.cmd' : 'block-basekit-cli';
const cliPath = path.join(projectRoot, 'node_modules', '.bin', binaryName);

const child = spawn(cliPath, ['start:field'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    FIELD_DEBUG_AUTH: '1',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

