import {
  describe,
  beforeEach,
  it,
  run,
  assertEquals,
  Account,
} from "../deps.ts";
import { MiamiCoin } from "../models/miamicoin.model.ts";
import { MemeCoin } from "../models/memecoin.model.ts";
import { Listing, Swap } from "../models/swap.model.ts";
import { Context } from "../src/context.ts";

describe("[SWAP]", () => {
  let ctx: Context;
  let swap: Swap;
  let mia: MiamiCoin;
  let meme: MemeCoin;

  beforeEach(() => {
    ctx = new Context();
    swap = ctx.models.get(Swap);
    mia = ctx.models.get(MiamiCoin);
    meme = ctx.models.get(MemeCoin);
  });

  describe("list-tokens()", () => {
    it("succeeds", () => {
      const user = ctx.accounts.get("wallet_1")!;
      const amount = 200;
      const price = 10;
      ctx.chain.mineBlock([mia.mint(amount, user)]);

      // act
      const receipt = ctx.chain.mineBlock([
        swap.listTokens(amount, price, user),
      ]).receipts[0];

      // assert
      receipt.result.expectOk().expectUint(1);
      receipt.events.expectFungibleTokenTransferEvent(
        amount,
        user.address,
        swap.address,
        MiamiCoin.TOKEN_NAME
      );
    });

    it("fails when user try to list more tokens than he have", () => {
      const user = ctx.accounts.get("wallet_1")!;
      const amount = 200;
      const price = 10;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.listTokens(amount, price, user),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(1);
      assertEquals(receipt.events.length, 0);
    });

    it("throws ERR_INVALID_VALUE when user pass 0 as amount", () => {
      const user = ctx.accounts.get("wallet_1")!;
      const amount = 0;
      const price = 10;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.listTokens(amount, price, user),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_INVALID_VALUE);
      assertEquals(receipt.events.length, 0);
    });

    it("throws ERR_INVALID_VALUE when user pass 0 as price", () => {
      const user = ctx.accounts.get("wallet_1")!;
      const amount = 123;
      const price = 0;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.listTokens(amount, price, user),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_INVALID_VALUE);
      assertEquals(receipt.events.length, 0);
    });
  });

  describe("change-price", () => {
    const listingId = 1;
    const oldPrice = 200;
    const listedAmount = 20000;
    let seller: Account;

    beforeEach(() => {
      seller = ctx.accounts.get("wallet_1")!;
      const receipt = ctx.chain.mineBlock([
        mia.mint(listedAmount, seller),
        swap.listTokens(listedAmount, oldPrice, seller),
      ]).receipts[1];

      receipt.result.expectOk().expectUint(listingId);
    });

    it("throws ERR_INVALID_VALUE when user pass 0 as new price", () => {
      const newPrice = 0;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.changePrice(listingId, newPrice, seller),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_INVALID_VALUE);
    });

    it("throws ERR_UNKNOWN_LISTING while changing price of unknown listing", () => {
      const newPrice = 10;
      const unknownListingId = 9999;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.changePrice(unknownListingId, newPrice, seller),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_UNKNOWN_LISTING);
    });

    it("throws ERR_NOT_AUTHORIZED while changing price of someone else listing", () => {
      const newPrice = 200;
      const otherSeller = ctx.accounts.get("wallet_4")!;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.changePrice(listingId, newPrice, otherSeller),
      ]).receipts[0];

      // asserts
      receipt.result.expectErr().expectUint(Swap.Err.ERR_NOT_AUTHORIZED);
    });

    it("it succeeds and change listing price", () => {
      const newPrice = 123;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.changePrice(listingId, newPrice, seller),
      ]).receipts[0];

      // asserts
      receipt.result.expectOk().expectUint(newPrice);

      const listing = <Listing>(
        swap.getListing(listingId).expectSome().expectTuple()
      );

      listing.price.expectUint(newPrice);
    });
  });

  describe("add-tokens()", () => {
    let seller: Account;
    const listingId = 1;
    const initialAmount = 10;

    beforeEach(() => {
      seller = ctx.accounts.get("wallet_6")!;

      const receipt = ctx.chain.mineBlock([
        mia.mint(2000, seller),
        swap.listTokens(initialAmount, 200, seller),
      ]).receipts[1];

      receipt.result.expectOk().expectUint(listingId);
    });

    it("throws ERR_INVALID_VALUE when user pass 0 as amount", () => {
      const amount = 0;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.addTokens(listingId, mia.address, amount, seller),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_INVALID_VALUE);
    });

    it("throws ERR_UNKNOWN_LISTING while adding tokens to unknown listing", () => {
      const unknownListingId = 349234;
      const amount = 10;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.addTokens(unknownListingId, mia.address, amount, seller),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_UNKNOWN_LISTING);
    });

    it("throws ERR_INCORRECT_TOKEN while adding wrong tokens to listing", () => {
      const amount = 10;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.addTokens(listingId, meme.address, amount, seller),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_INCORRECT_TOKEN);
    });

    it("throws ERR_NOT_AUTHORIZED while adding tokens to someone else listing", () => {
      const amount = 123;
      const otherSeller = ctx.accounts.get("wallet_1")!;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.addTokens(listingId, mia.address, amount, otherSeller),
      ]).receipts[0];

      receipt.result.expectErr().expectUint(Swap.Err.ERR_NOT_AUTHORIZED);
    });

    it("succeeds and adds tokens to listing", () => {
      const amount = 100;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.addTokens(listingId, mia.address, amount, seller),
      ]).receipts[0];

      // assert
      receipt.result.expectOk().expectBool(true);
      assertEquals(receipt.events.length, 1);
      receipt.events.expectFungibleTokenTransferEvent(
        amount,
        seller.address,
        swap.address,
        MiamiCoin.TOKEN_NAME
      );

      const listing = <Listing>(
        swap.getListing(listingId).expectSome().expectTuple()
      );
      listing.amount.expectUint(initialAmount + amount);
      listing.left.expectUint(initialAmount + amount);
    });
  });
});

run();
