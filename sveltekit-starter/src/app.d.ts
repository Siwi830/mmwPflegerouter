declare global {
  namespace App {
    interface Locals {
      user: {id:string;name:string;email:string;role:'admin'|'member'} | null;
    }
  }
}
export {};
