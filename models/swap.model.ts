import { Account, types } from "../deps.ts";
import { Model } from "../src/model.ts";

enum Err {
  ERR_INVALID_VALUE = 2000,
  ERR_UNKNOWN_LISTING = 2001,
  ERR_NOT_AUTHORIZED = 2002,
  ERR_INCORRECT_TOKEN = 2003,
  ERR_NOT_ENOUGH_TOKENS = 2004,
  ERR_HIGH_SLIPPAGE = 2005,
}

export class Swap extends Model {
  name: string = "swap";

  static Err = Err;

  listTokens(token: string, amount: number, price: number, sender: Account) {
    return this.callPublic(
      "list-tokens",
      [types.principal(token), types.uint(amount), types.uint(price)],
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

  addTokens(listingId: number, token: string, amount: number, sender: Account) {
    return this.callPublic(
      "add-tokens",
      [
        types.uint(listingId),
        types.principal(token), // token
        types.uint(amount),
      ],
      sender
    );
  }

  buyTokens(
    listingId: number,
    token: string,
    minTokenQty: number,
    maxStxCosts: number,
    sender: Account
  ) {
    return this.callPublic(
      "buy-tokens",
      [
        types.uint(listingId),
        types.principal(token),
        types.uint(minTokenQty),
        types.uint(maxStxCosts),
      ],
      sender
    );
  }

  withdrawTokens(
    listingId: number,
    token: string,
    amount: number,
    sender: Account
  ) {
    return this.callPublic(
      "withdraw-tokens",
      [types.uint(listingId), types.principal(token), types.uint(amount)],
      sender
    );
  }

  setFeeRate(newFeeRate: number, sender: Account) {
    return this.callPublic("set-fee-rate", [types.uint(newFeeRate)], sender);
  }

  getFeeRate() {
    return this.callReadOnly("get-fee-rate").result;
  }

  getListingsCount() {
    return this.callReadOnly("get-listings-count").result;
  }

  getTokenListingLastIdx(token: string) {
    return this.callReadOnly("get-token-listing-last-idx", [
      types.principal(token),
    ]).result;
  }

  getTokenListing(token: string, idx: number) {
    return this.callReadOnly("get-token-listing", [
      types.principal(token),
      types.uint(idx),
    ]).result;
  }
}

export interface Listing {
  amount: string;
  left: string;
  price: string;
  seller: string;
  token: string;
}
