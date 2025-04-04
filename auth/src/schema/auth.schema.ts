import { z } from 'zod';

const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters long')
  .max(50, 'Username must be at most 50 characters long')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Username can only contain letters, numbers and underscore'
  )
  .optional();

const emailSchema = z
  .string()
  .email('Inalid email address')
  .max(255, 'Email must be at most 255 characters long');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(100, 'Password must be at most 100 characters long')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

const acceptedTermsSchema = z
  .boolean({
    required_error: 'You must accept the Terms and conditions',
    invalid_type_error: 'acceptedTerms must be a boolean',
  })
  .refine((val) => val === true, {
    message: 'You must accept the Terms and Conditions',
  });

export const signupSchema = z.object({
  body: z.object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    acceptedTerms: acceptedTermsSchema,
  }),
});

export const loginSchema = z.object({ 
  body: z.object({ 
    email: emailSchema, 
    password: z.string().min(1, 'Password is required');
  })
})

export type SignupBody = z.infer<typeof signupSchema>['body'];
export type LoginBody = z.infer<typeof loginSchema>['body'];
