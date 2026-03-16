import { z } from 'zod'

export const extractedFieldSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe('Short descriptive label for the criterion, e.g. "Near public transport"'),
  value: z
    .string()
    .describe('Specific details or requirements, e.g. "within 10 min walk of S-Bahn"'),
  importance: z
    .enum(['critical', 'high', 'medium', 'low'])
    .default('medium')
    .describe(
      'How important: critical = absolute must-have, high = strongly preferred, medium = nice to have, low = minor preference',
    ),
})

export const extractionResultSchema = z.object({
  fields: z
    .array(extractedFieldSchema)
    .describe('All property preference criteria discovered in the conversation'),
})

export type ExtractionResult = z.infer<typeof extractionResultSchema>
