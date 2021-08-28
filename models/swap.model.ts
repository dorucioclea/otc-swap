import { Account, types } from "../deps.ts";
import { Model } from "../src/model.ts";

enum Err {
  ERR_INVALID_VALUE = 2000,
  ERR_UNKNOWN_LISTING = 2001,
  ERR_NOT_AUTHORIZED = 2002,
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

  changePrice(listingId: number, newPrice: number, sender: Account) {
    return this.callPublic(
      "change-price",
      [types.uint(listingId), types.uint(newPrice)],
      sender
    );
  }

  getListing(listingId: number) {
    return this.callReadOnly("get-listing", [types.uint(listingId)]).result;
  }

  addTokens(listingId: number, amount: number, sender: Account) {
    return this.callPublic(
      "add-tokens",
      [
        types.uint(listingId),
        types.principal(`${this.deployer.address}.miamicoin-token`), // token
        types.uint(amount),
      ],
      sender
    );
  }
}

export interface Listing {
  amount: string;
  left: string;
  price: string;
  seller: string;
  token: string;
}
