import { Account } from "https://deno.land/x/clarinet@v0.15.1/index.ts";

export {
  Chain,
  Clarinet,
  Tx,
  types,
} from "https://deno.land/x/clarinet@v0.15.1/index.ts";

export type { Account } from "https://deno.land/x/clarinet@v0.15.1/index.ts";

export { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";

export class Accounts extends Map<string, Account> {}
