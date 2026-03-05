import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { PropertyListing } from '../schema/listing.js';

/**
 * Write an array of PropertyListing records to a JSONL file.
 * Creates the output directory recursively if it does not exist.
 * Returns the full path to the written file.
 */
export async function writeJsonl(
  records: PropertyListing[],
  outputDir: string,
): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const filePath = join(outputDir, 'listings.jsonl');
  const stream = createWriteStream(filePath, { encoding: 'utf-8' });

  for (const record of records) {
    stream.write(JSON.stringify(record) + '\n');
  }

  return new Promise<string>((resolve, reject) => {
    stream.end(() => resolve(filePath));
    stream.on('error', reject);
  });
}
