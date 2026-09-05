#!/usr/bin/env node
import { open } from 'node:fs/promises';
import { checkDescriptor } from './index.js';

const args = process.argv.slice(2);
if (args.length !== 1 || args[0] === '--help') {
  console.log('Usage: dsh-distribution-check <descriptor.json>\nRead-only validation; exit 0 = fully checked, 1 = invalid, 2 = usage/IO/JSON, 3 = unknown protocols. Maximum input: 1 MiB.');
  process.exitCode = args[0] === '--help' && args.length === 1 ? 0 : 2;
} else {
  try {
    const file = await open(args[0]!, 'r');
    let text: string;
    try {
      if (!(await file.stat()).isFile()) throw new Error('Input must be a regular file');
      const buffer = Buffer.alloc(1024 * 1024 + 1);
      let total = 0;
      while (total < buffer.length) {
        const { bytesRead } = await file.read(buffer, total, buffer.length - total, null);
        if (bytesRead === 0) break;
        total += bytesRead;
      }
      if (total === buffer.length) throw new Error('Input exceeds 1 MiB');
      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, total));
    } finally { await file.close(); }
    const report = checkDescriptor(JSON.parse(text));
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = !report.valid ? 1 : !report.complete ? 3 : 0;
  } catch {
    console.log(JSON.stringify({ valid: false, complete: false, issues: [{ code: 'INPUT_ERROR', path: '', message: 'Could not read a regular UTF-8 JSON file within the size limit' }], unchecked: [] }));
    process.exitCode = 2;
  }
}
