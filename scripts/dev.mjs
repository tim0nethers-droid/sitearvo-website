import { spawn } from 'node:child_process';

const children = [];

function launch(command, args, env = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  });
  children.push(child);
  child.on('exit', code => {
    if (code && code !== 0) process.exitCode = code;
  });
  return child;
}

launch('node', ['server.mjs', '--api-only'], { PORT: '5176' });
launch('vite', [], { SITEARVO_MOCK_API: '1' });

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) child.kill('SIGINT');
  }
  setTimeout(() => process.exit(process.exitCode || 0), 250);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
