import { Account, types } from "../deps.ts";
import { Model } from "./model.ts";

export class MiamiCoin extends Model {
  name: string = "miamicoin-token";

  mint(amount: number, recipient: Account) {
    return this.callPublic("mint", [
      types.uint(amount),
      types.principal(recipient.address),
    ]);
  }
}
