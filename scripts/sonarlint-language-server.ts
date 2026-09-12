import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const serverJar = process.env.SONARLINT_LS_JAR;
if (serverJar === undefined || serverJar.length === 0) {
  console.error('SONARLINT_LS_JAR must point to sonarlint-language-server.jar.');
  process.exit(1);
}

const jarPath = path.resolve(serverJar);
if (!existsSync(jarPath)) {
  console.error(`SonarLint language server was not found at ${jarPath}.`);
  process.exit(1);
}

const analyzers = (process.env.SONARLINT_ANALYZERS ?? '')
  .split(path.delimiter)
  .filter((analyzer) => analyzer.length > 0)
  .map((analyzer) => path.resolve(analyzer));

const args = ['-jar', jarPath, '-stdio'];
if (analyzers.length > 0) {
  args.push('-analyzers', ...analyzers);
}

const server = spawn(process.env.SONARLINT_JAVA ?? 'java', args, { stdio: 'inherit' });
server.once('error', (error) => {
  console.error(`Unable to start SonarLint language server: ${error.message}`);
  process.exitCode = 1;
});
server.once('exit', (code, signal) => {
  process.exitCode = signal === null ? (code ?? 1) : 1;
});
