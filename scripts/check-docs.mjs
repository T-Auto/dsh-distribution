import { readFile, readdir, access } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import assert from 'node:assert/strict';
import { publicDefinitions } from '../packages/conformance/lib/index.js';
const root = process.cwd();
async function walk(path) {
  const result = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (['node_modules', '.git', 'lib'].includes(entry.name)) continue;
    const target = join(path, entry.name);
    if (entry.isDirectory()) result.push(...await walk(target)); else result.push(target);
  }
  return result;
}
let links = 0;
for (const path of await walk(root)) {
  if (!path.endsWith('.md')) continue;
  const text = await readFile(path, 'utf8');
  for (const match of text.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const url = match[1];
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(url)) continue;
    const target = decodeURIComponent(url.split('#')[0]);
    if (target) await access(resolve(dirname(path), target));
    links++;
  }
}
const allowed = { core: [], composition: ['core'], layout: ['core'], discovery: ['core'], lifecycle: ['core'], portability: ['core', 'layout'], lodgement: ['core'], conformance: ['core', 'composition', 'layout', 'discovery', 'lifecycle', 'portability', 'lodgement'] };
for (const [name, deps] of Object.entries(allowed)) {
  const pkg = JSON.parse(await readFile(`packages/${name}/package.json`, 'utf8'));
  assert.equal(pkg.name, `@dsh-distribution/${name}`);
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), deps.map(d => `@dsh-distribution/${d}`).sort());
  for (const target of Object.values(pkg.exports['.'])) await access(`packages/${name}/${target}`);
  for (const path of ['README.md', 'CHANGELOG.md', 'LICENSE']) await access(`packages/${name}/${path}`);
  assert.ok((await readFile(`packages/${name}/CHANGELOG.md`, 'utf8')).includes(pkg.version));
  for (const path of await walk(`packages/${name}/src`)) {
    const text = await readFile(path, 'utf8');
    for (const match of text.matchAll(/(?:from\s+|import\s*\()(['"])([^'"]+)\1/g)) {
      const specifier = match[2];
      if (specifier.startsWith('./')) continue;
      if (name === 'conformance' && specifier.startsWith('node:')) continue;
      assert.ok(deps.some(dep => specifier === `@dsh-distribution/${dep}`), `Forbidden import ${name}: ${specifier}`);
    }
  }
}
const registry = JSON.parse(await readFile('registry/protocols.json', 'utf8'));
assert.equal(registry.status, 'Draft');
const keys = registry.protocols.map(r => `${r.apiVersion}\0${r.kind}`);
assert.equal(new Set(keys).size, keys.length);
assert.equal(keys.length, publicDefinitions.length + 1);
for (const definition of publicDefinitions) assert.ok(keys.includes(`${definition.apiVersion}\0${definition.kind}`));
for (const row of registry.protocols) {
  await access(row.proposal); await access(row.schema);
  const proposal = await readFile(row.proposal, 'utf8');
  assert.ok(proposal.includes(row.apiVersion) && proposal.includes(row.kind), `Coordinate drift in ${row.proposal}`);
}
for (const row of registry.records) {
  const schema = JSON.parse(await readFile(row.schema, 'utf8'));
  assert.deepEqual(schema.properties.apiVersion.enum, [row.apiVersion]);
  assert.deepEqual(schema.properties.kind.enum, [row.kind]);
}
console.log(`Docs verified: ${links} local links, ${Object.keys(allowed).length} package boundaries, ${keys.length} protocol coordinates.`);
