import { z } from 'zod';

export const updatePrefsSchema = z.object({
  body: z
    .object({
      theme: z.enum(['light', 'dark']).optional(),
      language: z.string().min(2).max(10).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message:
        'Request body must contain at least one preference field to update.',
    }),
});

export type UpdatePrefsBody = z.infer<typeof updatePrefsSchema>['body'];
