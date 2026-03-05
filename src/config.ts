import { z } from 'zod';

const EnvSchema = z.object({
  APIFY_TOKEN: z.string().min(1, 'APIFY_TOKEN is required'),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
});

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(): Config {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid configuration:', result.error.issues);
    process.exit(1);
  }
  return result.data;
}
