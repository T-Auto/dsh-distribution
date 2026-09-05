import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { schemaDocument, descriptorSchema } from '../packages/core/lib/index.js';
import { compositionSchema } from '../packages/composition/lib/index.js';
import { layoutSchema } from '../packages/layout/lib/index.js';
import { discoverySchema, instanceSchema, resolutionSchema } from '../packages/discovery/lib/index.js';
import { lifecycleSchema, observationSchema } from '../packages/lifecycle/lib/index.js';
import { portabilitySchema, requestSchema, planSchema, journalSchema } from '../packages/portability/lib/index.js';
export const schemas = {
  'core/descriptor': descriptorSchema, 'composition/composition': compositionSchema,
  'layout/layout': layoutSchema, 'discovery/discovery': discoverySchema,
  'discovery/instance': instanceSchema, 'discovery/resolution': resolutionSchema,
  'lifecycle/lifecycle': lifecycleSchema, 'lifecycle/observation': observationSchema,
  'portability/portability': portabilitySchema, 'portability/request': requestSchema,
  'portability/plan': planSchema, 'portability/journal': journalSchema,
};
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/schemas.mjs')) {
  for (const [name, schema] of Object.entries(schemas)) {
    const [pkg, stem] = name.split('/');
    const directory = `packages/${pkg}/schema`;
    const path = `${directory}/${stem}.schema.json`;
    const expected = JSON.stringify(schemaDocument(name, schema), null, 2) + '\n';
    if (process.argv.includes('--write')) { await mkdir(directory, { recursive: true }); await writeFile(path, expected); }
    else if (await readFile(path, 'utf8') !== expected) throw new Error(`Generated schema drift: ${path}; run pnpm schemas:write`);
  }
  console.log(`Schemas ${process.argv.includes('--write') ? 'generated' : 'verified'}: ${Object.keys(schemas).length}`);
}
