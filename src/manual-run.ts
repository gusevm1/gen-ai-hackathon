import { loadConfig } from './config.js';

// 1. Load config FIRST (fail-fast on missing APIFY_TOKEN)
const config = loadConfig();

// 2. Create logger
import { createLogger } from './logger.js';

const logger = createLogger(config.LOG_LEVEL);

// 3. Parse CLI args
const site = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!site || site === '--help') {
  console.log('Usage: npx tsx src/manual-run.ts <site> [--dry-run]');
  console.log('');
  console.log('Sites: homegate');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run  Fetch ~10 listings, validate and log, do not write to disk');
  process.exit(site ? 0 : 1);
}

// 4. Imports for pipeline
import { ApifyClient } from 'apify-client';
import { HomegateAdapter } from './scrapers/homegate/adapter.js';
import { normalizeHomegate } from './scrapers/homegate/normalize.js';
import { PropertyListingSchema } from './schema/listing.js';
import type { PropertyListing } from './schema/listing.js';
import { writeJsonl } from './output/jsonl-writer.js';

async function main(): Promise<void> {
  // Select adapter and normalizer
  let adapter;
  let normalize: (raw: Record<string, unknown>) => Record<string, unknown>;

  if (site === 'homegate') {
    const client = new ApifyClient({ token: config.APIFY_TOKEN });
    adapter = new HomegateAdapter(client, logger);
    normalize = normalizeHomegate;
  } else {
    logger.fatal({ site }, 'Unknown site');
    process.exit(1);
  }

  logger.info({ site, dryRun }, 'Starting scrape');

  // Step 1: Scrape raw records
  const rawRecords = await adapter.scrape({ dryRun });
  logger.info({ count: rawRecords.length }, 'Raw records fetched from Apify');

  // Step 2: Normalize + Validate
  const valid: PropertyListing[] = [];
  const rejectionSummary: Record<string, number> = {};

  for (const [i, raw] of rawRecords.entries()) {
    const normalized = normalize(raw);
    const result = PropertyListingSchema.safeParse(normalized);
    if (result.success) {
      valid.push(result.data);
    } else {
      // Log each rejection as a warning (per user decision)
      const issues = result.error.issues.map((iss) => iss.message);
      logger.warn({ index: i, issues }, 'Record rejected by schema validation');
      // Aggregate rejection reasons
      for (const issue of result.error.issues) {
        const key = `${issue.path.join('.')}: ${issue.message}`;
        rejectionSummary[key] = (rejectionSummary[key] || 0) + 1;
      }
    }
  }

  // Aggregate summary at end (per user decision)
  logger.info(
    {
      total: rawRecords.length,
      valid: valid.length,
      rejected: rawRecords.length - valid.length,
      rejectionDetails: rejectionSummary,
    },
    'Validation summary',
  );

  // Step 3: Write output (skip in dry-run mode per user decision)
  if (dryRun) {
    logger.info('Dry run complete -- no output written to disk');
  } else if (valid.length > 0) {
    // Timestamp format: YYYY-MM-DD_HHMMSS in UTC
    const now = new Date();
    const pad = (n: number): string => String(n).padStart(2, '0');
    const ts = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}_${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
    const outputDir = `data/${site}/${ts}`;
    const filePath = await writeJsonl(valid, outputDir);
    logger.info({ filePath, records: valid.length }, 'Output written');
  } else {
    logger.warn('No valid records to write');
  }

  logger.info('Done');
}

main().catch((err) => {
  logger.fatal(err, 'Scrape failed');
  process.exit(1);
});
