import { z } from 'zod';
export const loginSchema = z.object({email:z.email().max(255),password:z.string().min(1)});
// export const registerSchema = loginSchema.extend({name:z.string().trim().min(2).max(120),password:z.string().min(12).max(128)});
// import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),

  email: z.email(),

  password: z.string().min(12).max(128),
  accountType: z.enum(['ORGANIZATION', 'PRIVATE']),
  organizationName: z.string().trim().max(200).default('')
});