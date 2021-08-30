import { Account, types } from "../deps.ts";
import { Model } from "../src/model.ts";

enum Err {
  ERR_IDENTICAL_TOKENS = 5000,
  ERR_PAIR_ALREADY_EXISTS = 5001,
}

export class Pool extends Model {
  name: string = "pool";

  static Err = Err;

  createPair(tokenA: string, tokenB: string, sender: Account) {
    return this.callPublic(
      "create-pair",
      [types.principal(tokenA), types.principal(tokenB)],
      sender
    );
  }

  getPairId(tokenA: string, tokenB: string) {
    return this.callReadOnly("get-pair-id", [
      types.principal(tokenA),
      types.principal(tokenB),
    ]).result;
  }
}
