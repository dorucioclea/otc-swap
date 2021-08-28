import { Account, types } from "../deps.ts";
import { Model } from "../src/model.ts";

enum Err {
  ERR_INVALID_VALUE = 2000,
}

export class Swap extends Model {
  name: string = "swap";

  static Err = Err;

  listTokens(amount: number, price: number, sender: Account) {
    return this.callPublic(
      "list-tokens",
      [
        types.principal(`${this.deployer.address}.miamicoin-token`),
        types.uint(amount),
        types.uint(price),
      ],
      sender
    );
  }
}
