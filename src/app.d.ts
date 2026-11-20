declare global {
  namespace App {
    interface Locals {
      user: {
        id: string;
        name: string;
        firstName: string;
        lastName: string;
        email: string;
        status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
      } | null;
    }
  }
}
export {};
