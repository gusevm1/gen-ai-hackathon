# Phase 3: EC2 Deployment + Scheduling - Research

**Researched:** 2026-03-05
**Domain:** AWS EC2 provisioning, PM2 process management, node-cron scheduling, S3 data sync
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Shell script using AWS CLI to create EC2 instance, security group, and key pair
- Instance type: t3.medium (2 vCPU, 4GB RAM) -- sized for future browser-based scrapers
- Region: eu-central-1 (Frankfurt) -- closest to Swiss target sites
- EBS: 20GB gp3 volume
- AWS CLI already configured locally with appropriate credentials
- Minimal install: Node.js 22, git, PM2 only -- no Chromium/browser dependencies (add in Phase 4)
- Local bash deploy script that SSHs into EC2, does git pull, npm install, and restarts PM2 service
- Secrets (.env file) managed via manual SCP to EC2 -- copy once, update manually when secrets change
- No CI/CD automation -- deploy is a manual trigger via the script
- node-cron in-process scheduler (app runs continuously via PM2)
- Daily scrape at 02:00 CET (01:00 UTC in winter, 00:00 UTC in summer)
- No retry on failure -- log the error and wait for next scheduled run. Missing one day is acceptable.
- Simple PID-file lock to prevent overlapping runs (no external library)
- S3 sync after each scrape run -- new snapshot uploaded via `aws s3 sync`
- Keep all data locally on EBS as well (no local cleanup/retention policy)
- 20GB gp3 is sufficient for years of daily ~1-2MB JSONL snapshots

### Claude's Discretion
- S3 bucket naming and structure
- PM2 ecosystem config details
- Setup script error handling and idempotency
- `_run_meta.json` exact format (must include listing count, duration, status per success criteria)
- Security group rules (SSH access, outbound only)
- Node.js installation method (nvm vs NodeSource)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SETUP-04 | EC2 instance provisioned (t3.large, 50GB EBS gp3, eu-central-1) | AWS CLI `run-instances` with SSM parameter for latest AL2023 AMI; user overrides to t3.medium + 20GB gp3 |
| SETUP-05 | EC2 setup script installs Node.js 22, Chromium dependencies, and project dependencies | AL2023 native `nodejs22` packages via dnf; Chromium deferred to Phase 4 per user decision |
| SETUP-06 | Git repo cloned on EC2 with deploy workflow (SSH + git pull) | Bash deploy script pattern: SSH + git pull + npm install + PM2 restart |
| SETUP-07 | Application runs as a persistent process on EC2 (PM2 or systemd service) | PM2 with ecosystem.config.cjs, tsx interpreter hook, pm2 startup + save for reboot persistence |
| OPS-01 | node-cron scheduler runs scrapers on configurable daily cadence | node-cron v4.x with `Europe/Zurich` timezone, `0 2 * * *` expression |
| OPS-02 | Lock-file prevents overlapping scraper runs | PID-file pattern with stale lock detection (check if PID is still alive) |
| OPS-05 | Run metadata stored per scrape (_run_meta.json with listing count, duration, status) | JSON file written alongside listings.jsonl in same timestamped directory |
</phase_requirements>

## Summary

This phase deploys the existing FlatFox scraper to an AWS EC2 instance running Amazon Linux 2023 in eu-central-1, managed by PM2 as a long-running process with an in-process node-cron scheduler. The architecture is intentionally simple: a single EC2 instance, no CI/CD, manual deploys via SSH, and data durability via S3 sync after each scrape run.

The key technical decisions are already locked by the user. The scheduler is a new TypeScript entry point (`src/scheduler.ts`) that wraps the existing `manual-run.ts` scrape logic with node-cron scheduling, PID-file locking, run metadata tracking, and S3 sync. PM2 keeps this process alive and survives reboots via `pm2 startup`. Infrastructure provisioning is a shell script using AWS CLI.

**Primary recommendation:** Use Amazon Linux 2023 native `nodejs22` packages (not nvm) for Node.js installation to avoid PM2 startup path issues, and use `ecosystem.config.cjs` (CommonJS extension) since the project has `"type": "module"` in package.json.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PM2 | 6.x (latest) | Process manager: keeps app alive, log rotation, reboot persistence | De facto standard for Node.js process management in production |
| node-cron | 4.x | In-process cron scheduler | Lightweight, pure JS, full crontab syntax, timezone support, ESM compatible |
| AWS CLI v2 | latest | EC2 provisioning, S3 sync | Already configured locally per user; standard AWS tooling |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/node-cron | latest | TypeScript type definitions for node-cron | Development only -- provides type safety for schedule() API |
| tsx | 4.x (already installed) | TypeScript execution without build step | PM2 uses it as `--import tsx` interpreter hook |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| node-cron (in-process) | System crontab + separate script | System cron is simpler but loses process-level locking, harder to manage with PM2 |
| PM2 | systemd service | systemd is lighter but lacks ecosystem config, log management, restart strategies |
| AL2023 native nodejs22 | nvm | nvm is flexible but causes PM2 startup path issues after reboot (node not found in systemd context) |

**Installation (on EC2):**
```bash
# System packages (Amazon Linux 2023)
sudo dnf install -y nodejs22 nodejs22-npm git

# Global PM2
npm-22 install -g pm2 tsx

# Project dependencies
cd /home/ec2-user/gen-ai-hackathon
npm-22 install --production
```

**Installation (dev dependency for scheduler):**
```bash
npm install node-cron @types/node-cron
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── scheduler.ts          # NEW: Entry point for PM2 (node-cron + scrape orchestration)
├── manual-run.ts         # EXISTING: CLI entry point (unchanged, still works for manual runs)
├── config.ts             # EXISTING: Zod-validated env config
├── logger.ts             # EXISTING: Pino structured logging
├── output/
│   └── jsonl-writer.ts   # EXISTING: Writes listings.jsonl
├── scrapers/
│   ├── flatfox/          # EXISTING: FlatFox adapter + normalizer
│   ├── homegate/         # EXISTING: Homegate adapter + normalizer
│   └── types.ts          # EXISTING: Scraper interface
└── schema/
    └── listing.ts        # EXISTING: PropertyListing Zod schema

# NEW files at project root:
ecosystem.config.cjs       # PM2 config (must be .cjs for ESM project)
scripts/
├── provision-ec2.sh       # AWS CLI: create instance, SG, key pair, IAM role
├── setup-ec2.sh           # Remote: install Node.js, PM2, clone repo
└── deploy.sh              # Local: SSH into EC2, git pull, npm install, restart PM2
```

### Pattern 1: Scheduler Entry Point (scheduler.ts)
**What:** A new long-running entry point that uses node-cron to schedule daily scrapes, wrapping the existing scrape pipeline logic extracted from manual-run.ts.
**When to use:** Always -- this is the PM2-managed process on EC2.
**Example:**
```typescript
// src/scheduler.ts
import cron from 'node-cron';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { acquireLock, releaseLock } from './lock.js';
import { runScrape } from './scrape-pipeline.js';
import { syncToS3 } from './s3-sync.js';

const config = loadConfig();
const logger = createLogger(config.LOG_LEVEL);

// Schedule daily at 02:00 CET (Europe/Zurich handles CET/CEST automatically)
cron.schedule('0 2 * * *', async () => {
  if (!acquireLock()) {
    logger.warn('Scrape already running (lock held), skipping');
    return;
  }
  try {
    const meta = await runScrape('flatfox', config, logger);
    await syncToS3(meta.outputDir, logger);
    logger.info({ meta }, 'Scheduled scrape complete');
  } catch (err) {
    logger.error(err, 'Scheduled scrape failed');
    // No retry per user decision -- wait for next scheduled run
  } finally {
    releaseLock();
  }
}, {
  timezone: 'Europe/Zurich'
});

logger.info('Scheduler started, next scrape at 02:00 CET');
```

### Pattern 2: PID-File Lock
**What:** File-based lock using process PID to prevent overlapping scraper runs, with stale lock detection.
**When to use:** At the start of every scrape run.
**Example:**
```typescript
// src/lock.ts
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const LOCK_FILE = '/tmp/swiss-scraper.lock';

export function acquireLock(): boolean {
  if (existsSync(LOCK_FILE)) {
    const pid = parseInt(readFileSync(LOCK_FILE, 'utf-8').trim(), 10);
    // Check if process is still alive
    try {
      process.kill(pid, 0); // Signal 0 = check existence, don't kill
      return false; // Process alive, lock is valid
    } catch {
      // Process dead, stale lock -- remove and continue
    }
  }
  writeFileSync(LOCK_FILE, String(process.pid));
  return true;
}

export function releaseLock(): void {
  try { unlinkSync(LOCK_FILE); } catch { /* ignore */ }
}
```

### Pattern 3: Run Metadata (_run_meta.json)
**What:** JSON file recording scrape run stats, written alongside listings.jsonl.
**When to use:** After every scrape run (success or failure).
**Example:**
```typescript
// _run_meta.json format
{
  "site": "flatfox",
  "status": "success",           // or "error"
  "startedAt": "2026-03-05T01:00:00.000Z",
  "completedAt": "2026-03-05T01:02:34.567Z",
  "durationMs": 154567,
  "listingCount": 1247,
  "rawCount": 1580,
  "filteredCount": 289,
  "rejectedCount": 44,
  "outputDir": "data/flatfox/2026-03-05_010000",
  "error": null                  // or error message string on failure
}
```

### Pattern 4: S3 Sync After Scrape
**What:** Use `aws s3 sync` via child_process to upload new data to S3 after each run.
**When to use:** After writeJsonl() and _run_meta.json are written.
**Example:**
```typescript
// src/s3-sync.ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const S3_BUCKET = 's3://swiss-property-scraper-data';

export async function syncToS3(outputDir: string, logger: Logger): Promise<void> {
  const s3Path = `${S3_BUCKET}/${outputDir}`;
  logger.info({ outputDir, s3Path }, 'Syncing to S3');
  const { stdout, stderr } = await execFileAsync('aws', ['s3', 'sync', outputDir, s3Path]);
  if (stderr) logger.warn({ stderr }, 'S3 sync stderr');
  logger.info({ stdout: stdout.trim() }, 'S3 sync complete');
}
```

### Pattern 5: ecosystem.config.cjs for ESM Project
**What:** PM2 config file must use `.cjs` extension because the project has `"type": "module"` in package.json.
**When to use:** Always -- PM2 requires CommonJS for ecosystem config files.
**Example:**
```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'swiss-scraper',
    script: 'src/scheduler.ts',
    interpreter: 'node',
    interpreter_args: '--import tsx',
    cwd: '/home/ec2-user/gen-ai-hackathon',
    env: {
      NODE_ENV: 'production',
    },
    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/home/ec2-user/logs/scraper-error.log',
    out_file: '/home/ec2-user/logs/scraper-out.log',
    merge_logs: true,
    // Restart policy
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,
    autorestart: true,
  }]
};
```

### Anti-Patterns to Avoid
- **Using nvm on EC2 with PM2 startup:** nvm sets `PATH` in interactive shells only. After reboot, PM2's systemd service runs in a non-interactive context and cannot find `node`. Use AL2023 native `nodejs22` packages instead, which install to `/usr/bin/node-22` and are always on PATH.
- **Using `ecosystem.config.js` in an ESM project:** When `"type": "module"` is set in package.json, PM2 tries to load the config as ESM and fails. Always use `.cjs` extension.
- **Running tsx as the PM2 interpreter directly:** Setting `interpreter: 'tsx'` works but breaks PM2 cluster mode and may have path issues. Use `interpreter: 'node'` with `interpreter_args: '--import tsx'` instead.
- **Hardcoding UTC time for CET schedule:** CET is UTC+1 in winter but UTC+2 (CEST) in summer. Use `timezone: 'Europe/Zurich'` with node-cron to handle DST automatically.
- **Creating lock file without PID:** A boolean lock file (empty file) cannot detect stale locks from crashed processes. Always write the PID and check if the process is still alive.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Process management | Custom daemon/respawn logic | PM2 | Handles crashes, restarts, log rotation, startup scripts, zero-config |
| Cron scheduling | setTimeout/setInterval chains | node-cron | Crontab syntax, timezone support, DST handling, battle-tested |
| AMI ID lookup | Hardcoded AMI IDs | SSM Parameter Store query | AMI IDs change per region and over time; SSM always returns latest |
| S3 upload | Custom multipart upload code | `aws s3 sync` CLI | Handles diffing, retries, multipart, progress -- already installed |
| TypeScript execution | Build step (tsc -> node dist/) | tsx via `--import tsx` | Zero-config, fast, already used in dev; PM2 supports it natively |

**Key insight:** This phase is fundamentally an operations/infrastructure phase, not a feature phase. The scraping logic already works. The complexity is in provisioning, process lifecycle, and data durability -- all areas where existing tools (AWS CLI, PM2, node-cron) do the heavy lifting.

## Common Pitfalls

### Pitfall 1: PM2 + nvm = "node not found" after reboot
**What goes wrong:** PM2's systemd startup service runs in a non-interactive shell context. nvm only configures PATH in interactive shells (.bashrc). After reboot, PM2 cannot find the `node` binary.
**Why it happens:** nvm is designed for development environments with interactive shells, not for system services.
**How to avoid:** Use Amazon Linux 2023 native `nodejs22` packages which install to `/usr/bin/node-22` and are available system-wide. Symlink or use `alternatives --set node /usr/bin/node-22`.
**Warning signs:** App works fine after manual `pm2 start` but doesn't come back after reboot.

### Pitfall 2: ecosystem.config.js treated as ESM
**What goes wrong:** PM2 fails with "ERR_REQUIRE_ESM" or "exports is not defined" when loading ecosystem config.
**Why it happens:** The project has `"type": "module"` in package.json, making all `.js` files default to ESM. PM2 uses `require()` to load its config.
**How to avoid:** Name the file `ecosystem.config.cjs` to force CommonJS parsing.
**Warning signs:** `pm2 start ecosystem.config.js` throws module format errors.

### Pitfall 3: Stale PID lock file blocks all future runs
**What goes wrong:** If the scraper process crashes or is killed (SIGKILL), the lock file remains. All future scheduled runs skip because they see the lock.
**Why it happens:** `finally` blocks don't run on SIGKILL, and uncaught exceptions may bypass cleanup.
**How to avoid:** Write the PID to the lock file. On lock acquisition, check if the PID is still alive with `process.kill(pid, 0)`. If the process is dead, treat the lock as stale and remove it.
**Warning signs:** Scraper stops producing daily snapshots even though PM2 shows the scheduler is running.

### Pitfall 4: S3 sync fails silently
**What goes wrong:** `aws s3 sync` fails due to missing IAM permissions or expired credentials, but the scrape is considered "successful" because data was written locally.
**Why it happens:** S3 sync is a separate step after the scrape. If error handling doesn't propagate, the failure goes unnoticed.
**How to avoid:** Check the exit code of `aws s3 sync`. Log warnings on failure. Include S3 sync status in `_run_meta.json`.
**Warning signs:** Data exists locally on EBS but S3 bucket is empty or stale.

### Pitfall 5: Timezone confusion in cron schedule
**What goes wrong:** Scraper runs at the wrong time, or runs at inconsistent times across DST transitions.
**Why it happens:** Hardcoding UTC offset (e.g., `0 1 * * *` for 02:00 CET) doesn't account for summer time (CEST = UTC+2). During summer, `0 1 * * *` UTC would be 03:00 CEST, not 02:00.
**How to avoid:** Use node-cron's `timezone: 'Europe/Zurich'` option. Set the cron expression in local time (`0 2 * * *`) and let node-cron handle DST.
**Warning signs:** Scrape timestamps shift by one hour in March/October.

### Pitfall 6: Security group too permissive
**What goes wrong:** SSH open to 0.0.0.0/0 exposes the instance to brute-force attacks and bot scanning.
**Why it happens:** Quick provisioning scripts often use `0.0.0.0/0` for convenience.
**How to avoid:** Restrict SSH inbound to the operator's IP address (or a small CIDR range). Use `curl -s ifconfig.me` in the provisioning script to auto-detect the current IP.
**Warning signs:** auth.log fills with failed SSH attempts from random IPs.

## Code Examples

### EC2 Provisioning Script Pattern
```bash
#!/usr/bin/env bash
set -euo pipefail

REGION="eu-central-1"
INSTANCE_TYPE="t3.medium"
KEY_NAME="swiss-scraper-key"
SG_NAME="swiss-scraper-sg"
VOLUME_SIZE=20

# Get latest Amazon Linux 2023 AMI
AMI_ID=$(aws ssm get-parameter \
  --name "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64" \
  --region "$REGION" \
  --query "Parameter.Value" \
  --output text)

# Create key pair (idempotent -- skip if exists)
if ! aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" &>/dev/null; then
  aws ec2 create-key-pair \
    --key-name "$KEY_NAME" \
    --region "$REGION" \
    --query "KeyMaterial" \
    --output text > "${KEY_NAME}.pem"
  chmod 400 "${KEY_NAME}.pem"
fi

# Get current IP for SSH access
MY_IP=$(curl -s ifconfig.me)/32

# Create security group (idempotent)
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=$SG_NAME" \
  --region "$REGION" \
  --query "SecurityGroups[0].GroupId" \
  --output text 2>/dev/null || echo "None")

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
  SG_ID=$(aws ec2 create-security-group \
    --group-name "$SG_NAME" \
    --description "Swiss scraper - SSH from operator IP, all outbound" \
    --region "$REGION" \
    --query "GroupId" \
    --output text)

  # SSH from operator IP only
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp --port 22 \
    --cidr "$MY_IP" \
    --region "$REGION"
fi

# Launch instance
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --block-device-mappings "DeviceName=/dev/xvda,Ebs={VolumeSize=$VOLUME_SIZE,VolumeType=gp3}" \
  --iam-instance-profile Name=swiss-scraper-s3-profile \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=swiss-scraper}]" \
  --region "$REGION" \
  --query "Instances[0].InstanceId" \
  --output text)

echo "Instance launched: $INSTANCE_ID"
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text)

echo "Public IP: $PUBLIC_IP"
echo "$INSTANCE_ID" > .ec2-instance-id
echo "$PUBLIC_IP" > .ec2-public-ip
```

### EC2 Setup Script (runs remotely via SSH)
```bash
#!/usr/bin/env bash
set -euo pipefail

# Install Node.js 22 via AL2023 native packages
sudo dnf install -y nodejs22 nodejs22-npm git

# Set Node.js 22 as default
sudo alternatives --set node /usr/bin/node-22

# Install PM2 and tsx globally
sudo npm install -g pm2 tsx

# Create log directory
mkdir -p ~/logs

# Clone repository
if [ ! -d ~/gen-ai-hackathon ]; then
  git clone <REPO_URL> ~/gen-ai-hackathon
fi

cd ~/gen-ai-hackathon
npm install --production

# Setup PM2 startup (persist across reboots)
pm2 startup systemd -u ec2-user --hp /home/ec2-user
# ^ outputs a sudo command -- must be run manually or piped to bash
```

### Deploy Script (runs locally)
```bash
#!/usr/bin/env bash
set -euo pipefail

EC2_IP=$(cat .ec2-public-ip)
KEY_FILE="swiss-scraper-key.pem"
SSH_CMD="ssh -i $KEY_FILE -o StrictHostKeyChecking=no ec2-user@$EC2_IP"

echo "Deploying to $EC2_IP..."

$SSH_CMD << 'REMOTE'
  cd ~/gen-ai-hackathon
  git pull origin master
  npm install --production
  pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs
  pm2 save
REMOTE

echo "Deploy complete"
```

### IAM Policy for S3 Access
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::swiss-property-scraper-data",
        "arn:aws:s3:::swiss-property-scraper-data/*"
      ]
    }
  ]
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| nvm for server Node.js | AL2023 native nodejs22 packages | AL2023 2024+ | System-wide install, no PATH issues with PM2/systemd |
| ecosystem.config.js | ecosystem.config.cjs (for ESM projects) | PM2 5.x+ with Node ESM | Avoids ERR_REQUIRE_ESM when project uses `"type": "module"` |
| ts-node for TypeScript | tsx via `--import tsx` | 2024+ | Faster startup, better ESM support, zero config |
| Hardcoded AMI IDs | SSM Parameter Store lookup | AWS 2020+ | Always gets latest patched AMI, region-aware |
| Manual S3 uploads | `aws s3 sync` with IAM instance profile | Standard practice | No credentials on disk, least-privilege, automatic diffing |

**Deprecated/outdated:**
- **ts-node with PM2:** ESM support in ts-node is experimental and frequently breaks. tsx is the standard replacement.
- **Amazon Linux 2:** End of life extended to 2026-06-30. Use Amazon Linux 2023 for new instances.
- **Hardcoded AMI IDs in provisioning scripts:** Stale within weeks. Always use SSM parameter lookup.

## Discretion Recommendations

### Node.js Installation Method: AL2023 Native Packages (recommended over nvm)
**Rationale:** nvm is designed for development environments with interactive shells. On EC2 with PM2, the systemd startup service runs in a non-interactive context where nvm's PATH modifications don't apply. This causes the well-documented "node not found after reboot" problem. AL2023 provides native `nodejs22` packages that install to `/usr/bin/node-22` and are globally available. Use `alternatives --set node /usr/bin/node-22` to make `node` point to Node.js 22.
**Confidence:** HIGH -- verified via AWS official docs and multiple community reports of nvm+PM2 issues.

### S3 Bucket Naming and Structure
**Recommendation:** `swiss-property-scraper-data` bucket with path structure mirroring local: `data/flatfox/{timestamp}/listings.jsonl` and `data/flatfox/{timestamp}/_run_meta.json`.
**Rationale:** Mirror the local directory structure exactly so `aws s3 sync data/ s3://swiss-property-scraper-data/data/` works without path mapping.

### Security Group Rules
**Recommendation:**
- Inbound: TCP 22 (SSH) from operator's current IP only (auto-detected via `curl -s ifconfig.me`)
- Outbound: All traffic allowed (default) -- scraper needs HTTPS to FlatFox API and S3
**Rationale:** Minimal attack surface. Operator IP can be updated when it changes. No HTTP/HTTPS inbound needed (no web server).

### `_run_meta.json` Format
**Recommendation:** Include all fields needed for Phase 5 monitoring: site, status, timestamps, duration, counts (raw, filtered, valid, rejected), output directory, error message, and S3 sync status.
**Rationale:** Richer metadata now avoids needing to change the format later when monitoring is added.

## Open Questions

1. **Repository URL for git clone on EC2**
   - What we know: The repo exists and is presumably on GitHub
   - What's unclear: Whether it's public or private; if private, SSH key or PAT needed for git clone
   - Recommendation: If private, use a GitHub deploy key (read-only) or a PAT stored in .env

2. **IAM instance profile creation**
   - What we know: The EC2 instance needs S3 write access via IAM instance profile
   - What's unclear: Whether the user's AWS account already has an appropriate IAM role, or whether the provisioning script should create it
   - Recommendation: Include IAM role + instance profile creation in the provisioning script (idempotent)

3. **S3 bucket creation**
   - What we know: S3 sync requires an existing bucket
   - What's unclear: Whether bucket should be created by the provisioning script or pre-exists
   - Recommendation: Include bucket creation in provisioning script (idempotent with `aws s3 mb` or `aws s3api create-bucket`)

## Sources

### Primary (HIGH confidence)
- [AWS CLI run-instances reference](https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html) - EC2 provisioning parameters
- [AWS SSM Parameter Store for AMIs](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/finding-an-ami-parameter-store.html) - Latest AL2023 AMI lookup
- [Node.js in AL2023](https://docs.aws.amazon.com/linux/al2023/ug/nodejs.html) - Native nodejs22 packages, alternatives system
- [PM2 Ecosystem File docs](https://pm2.keymetrics.io/docs/usage/application-declaration/) - Config format, options
- [PM2 Startup Script docs](https://pm2.keymetrics.io/docs/usage/startup/) - Reboot persistence, systemd integration
- [AWS S3 sync reference](https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html) - S3 sync command and options
- [AWS IAM roles for EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html) - Instance profiles for S3 access
- [AWS EC2 security group rules](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html) - Best practices for inbound/outbound

### Secondary (MEDIUM confidence)
- [FutureStud: PM2 with tsx](https://futurestud.io/tutorials/pm2-use-tsx-to-start-your-app) - Verified tsx interpreter_args pattern
- [node-cron GitHub](https://github.com/node-cron/node-cron) - v4.x API, ESM support, timezone option
- [PM2 GitHub #5953](https://github.com/Unitech/pm2/issues/5953) - ESM ecosystem config issues, .cjs workaround
- [PM2 GitHub #1413](https://github.com/Unitech/pm2/issues/1413) - nvm + PM2 startup PATH issues

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - PM2, node-cron, AWS CLI are well-documented, stable, widely used
- Architecture: HIGH - patterns verified against official docs and existing codebase structure
- Pitfalls: HIGH - all pitfalls verified via multiple sources (official docs + GitHub issues + community reports)

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable tools, low churn domain)
