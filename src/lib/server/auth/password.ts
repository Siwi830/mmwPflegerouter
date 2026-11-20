import { scrypt as scryptCallback, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password,salt,64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hex] = stored.split(':');
  if (!salt || !hex || hex.length !== 128 || !/^[a-f0-9]+$/i.test(hex)) return false;
  const expected = Buffer.from(hex,'hex');
  const actual = (await scrypt(password,salt,64)) as Buffer;
  return timingSafeEqual(expected,actual);
}
