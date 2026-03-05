# Phase 3: EC2 Deployment + Scheduling - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy the FlatFox scraper to an EC2 instance with daily cron scheduling. The app runs autonomously, producing `data/flatfox/{timestamp}/listings.jsonl` snapshots daily with run metadata. No new scrapers, no monitoring/alerting (Phase 5), no Homegate (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Provisioning approach
- Shell script using AWS CLI to create EC2 instance, security group, and key pair
- Instance type: t3.medium (2 vCPU, 4GB RAM) — sized for future browser-based scrapers
- Region: eu-central-1 (Frankfurt) — closest to Swiss target sites
- EBS: 20GB gp3 volume
- AWS CLI already configured locally with appropriate credentials
- Minimal install: Node.js 22, git, PM2 only — no Chromium/browser dependencies (add in Phase 4)

### Deploy & update workflow
- Local bash deploy script that SSHs into EC2, does git pull, npm install, and restarts PM2 service
- Secrets (.env file) managed via manual SCP to EC2 — copy once, update manually when secrets change
- No CI/CD automation — deploy is a manual trigger via the script

### Schedule & failure handling
- node-cron in-process scheduler (app runs continuously via PM2)
- Daily scrape at 02:00 CET (01:00 UTC in winter, 00:00 UTC in summer)
- No retry on failure — log the error and wait for next scheduled run. Missing one day is acceptable.
- Simple PID-file lock to prevent overlapping runs (no external library)

### Data durability
- S3 sync after each scrape run — new snapshot uploaded via `aws s3 sync`
- Keep all data locally on EBS as well (no local cleanup/retention policy)
- 20GB gp3 is sufficient for years of daily ~1-2MB JSONL snapshots

### Claude's Discretion
- S3 bucket naming and structure
- PM2 ecosystem config details
- Setup script error handling and idempotency
- `_run_meta.json` exact format (must include listing count, duration, status per success criteria)
- Security group rules (SSH access, outbound only)
- Node.js installation method (nvm vs NodeSource)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Key constraint: the existing `manual-run.ts` pipeline already works end-to-end locally, so the scheduler should invoke the same scrape logic (not re-implement it).

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `manual-run.ts`: Complete scrape pipeline (adapter selection, normalize, validate, write JSONL). Scheduler should reuse this logic directly.
- `FlatfoxAdapter`: REST API scraper with pagination, supports `--dry-run` mode
- `writeJsonl()`: Writes validated listings to timestamped `data/{site}/{timestamp}/listings.jsonl`
- `loadConfig()`: Zod-validated config loader from `.env` (APIFY_TOKEN optional, LOG_LEVEL)
- `createLogger()`: Pino structured JSON logging

### Established Patterns
- Zod schema validation on all config and data
- Structured JSON logging via Pino
- Adapter pattern for scrapers (`scrape({ dryRun })` interface)
- TypeScript with ESM modules (`"type": "module"`)
- tsx for running TypeScript directly

### Integration Points
- New scheduler entry point needed (currently only `manual-run.ts` CLI)
- PM2 ecosystem config to manage the new long-running process
- S3 sync step needs to happen after `writeJsonl()` completes
- Lock-file check at scrape start, cleanup on exit
- `_run_meta.json` written alongside `listings.jsonl` in same output directory

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-ec2-deployment-scheduling*
*Context gathered: 2026-03-05*
