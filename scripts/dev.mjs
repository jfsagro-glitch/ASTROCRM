import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const venvPython = path.join(rootDir, '.venv', isWindows ? 'Scripts' : 'bin', isWindows ? 'python.exe' : 'python');
const pythonCmd = existsSync(venvPython) ? venvPython : 'python';

const children = [
  spawn(
    pythonCmd,
    ['-m', 'uvicorn', 'astro_api:app', '--reload', '--host', '0.0.0.0', '--port', '8000'],
    { cwd: rootDir, stdio: 'inherit' },
  ),
  spawn(
    npmCmd,
    ['--prefix', 'frontend', 'run', 'dev'],
    { cwd: rootDir, stdio: 'inherit' },
  ),
];

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => process.exit(exitCode), 200);
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (signal) {
      console.error(`dev process stopped by signal ${signal}`);
      shutdown(1);
      return;
    }
    if ((code ?? 0) !== 0) {
      console.error(`dev process exited with code ${code}`);
      shutdown(code ?? 1);
    }
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
