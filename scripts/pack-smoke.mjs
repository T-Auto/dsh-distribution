// Offline installed-tarball smoke check; no publication and no registry lookup.
import { mkdtemp, mkdir, readdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
const temp = await mkdtemp(join(tmpdir(), 'dsh-distribution-pack-'));
function run(command, args, cwd) {
  // Invoke JS entrypoints directly on Windows: no cmd shim or shell interpolation.
  const windows = process.platform === 'win32';
  const entry = command === 'pnpm' ? process.env.npm_execpath : join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  if (windows && !entry) throw new Error('Run this check through pnpm check:pack');
  const result = spawnSync(windows ? process.execPath : command, windows ? [entry, ...args] : args, { cwd, encoding: 'utf8', env: { ...process.env, HTTP_PROXY: 'http://127.0.0.1:7897', HTTPS_PROXY: 'http://127.0.0.1:7897', npm_config_audit: 'false', npm_config_fund: 'false' } });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
try {
  const tarballs = join(temp, 'tarballs'); const consumer = join(temp, 'consumer');
  await mkdir(tarballs); await mkdir(consumer);
  for (const name of ['core', 'composition', 'layout', 'discovery', 'lifecycle', 'portability', 'conformance']) run('pnpm', ['pack', '--pack-destination', tarballs], resolve(root, 'packages', name));
  const files = (await readdir(tarballs)).filter(name => name.endsWith('.tgz'));
  if (files.length !== 7) throw new Error('Expected seven package tarballs');
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  run('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', ...files.map(name => join(tarballs, name))], consumer);
  const probe = `import { checkDescriptor } from '@dsh-distribution/conformance';
import { readFileSync } from 'node:fs';
const schema = JSON.parse(readFileSync(new URL(import.meta.resolve('@dsh-distribution/core/schema/descriptor.schema.json')), 'utf8'));
const report = checkDescriptor({ apiVersion: 'distribution.dsh.dev/v1alpha1', kind: 'DistributionDescriptor', distribution: { id: 'urn:example:packed', version: '1' }, protocols: [] });
if (!report.complete || !schema.$schema) throw new Error('Installed package failure');
console.log('Seven packed packages install offline; ESM, declarations, schema exports and CLI artifact verified.');`;
  await writeFile(join(consumer, 'probe.mjs'), probe);
  const result = spawnSync(process.execPath, ['probe.mjs'], { cwd: consumer, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  const cli = spawnSync(process.execPath, ['node_modules/@dsh-distribution/conformance/lib/cli.js', '--help'], { cwd: consumer, encoding: 'utf8' });
  if (cli.status !== 0) throw new Error(cli.stderr);
  for (const name of ['core', 'composition', 'layout', 'discovery', 'lifecycle', 'portability', 'conformance']) {
    const files = await readdir(join(consumer, 'node_modules', '@dsh-distribution', name, 'lib'));
    if (!files.includes('index.d.ts')) throw new Error(`Missing declarations for ${name}`);
  }
  console.log(result.stdout.trim());
} finally { await rm(temp, { recursive: true, force: true }); }
