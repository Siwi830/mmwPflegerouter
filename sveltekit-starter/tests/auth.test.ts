import { describe,it,expect } from 'vitest';
import { registerSchema } from '../src/lib/features/auth/schema';
describe('registration validation',()=>{
  it('rejects weak passwords',()=>expect(registerSchema.safeParse({name:'Max',email:'max@example.com',password:'short'}).success).toBe(false));
  it('accepts valid input',()=>expect(registerSchema.safeParse({name:'Max',email:'max@example.com',password:'a-long-password-123'}).success).toBe(true));
});
