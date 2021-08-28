import { Account, types } from "../deps.ts";
import { Model } from "./model.ts";

export class Swap extends Model {
  name: string = "swap";

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
