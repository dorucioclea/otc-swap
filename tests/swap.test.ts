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
        swap.listTokens(mia.address, amount, price, user),
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
        swap.listTokens(mia.address, amount, price, user),
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
        swap.listTokens(mia.address, amount, price, user),
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
        swap.listTokens(mia.address, amount, price, user),
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
        swap.listTokens(mia.address, listedAmount, oldPrice, seller),
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
        swap.listTokens(mia.address, initialAmount, 200, seller),
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

  describe("buy-tokens()", () => {
    type ListingType = {
      id: number;
      token: string;
      amount: number;
      price: number;
    };
    let miaSeller: Account;
    let memeSeller: Account;
    let buyer: Account;
    let miaListing: ListingType;
    let memeListing: ListingType;

    beforeEach(() => {
      miaSeller = ctx.accounts.get("wallet_3")!;
      memeSeller = ctx.accounts.get("wallet_9")!;
      buyer = ctx.accounts.get("wallet_1")!;

      miaListing = {
        id: 1,
        token: mia.address,
        amount: 2657564,
        price: 12,
      };
      memeListing = {
        id: 2,
        token: meme.address,
        amount: 800000000,
        price: 4,
      };

      ctx.chain.mineBlock([
        mia.mint(miaListing.amount, miaSeller),
        meme.mint(memeListing.amount, memeSeller),
        swap.listTokens(
          miaListing.token,
          miaListing.amount,
          miaListing.price,
          miaSeller
        ),
        swap.listTokens(
          memeListing.token,
          memeListing.amount,
          memeListing.price,
          memeSeller
        ),
      ]);
    });

    it("throws ERR_INVALID_VALUE when user pass 0 as amount", () => {
      const amount = 0;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.buyTokens(miaListing.id, miaListing.token, amount, buyer),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_INVALID_VALUE);
    });

    it("throws ERR_UNKNOWN_LISTING while buying tokens from unknown listing", () => {
      const amount = 10;
      const unknownListingId = 2982347;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.buyTokens(unknownListingId, memeListing.token, amount, buyer),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_UNKNOWN_LISTING);
    });

    it("throws ERR_INCORRECT_TOKEN while buying wrong tokens from listing", () => {
      const amount = 234;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.buyTokens(miaListing.id, memeListing.token, amount, buyer),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_INCORRECT_TOKEN);
    });

    it("throws ERR_NOT_ENOUGH_TOKENS while buying more tokens than listed", () => {
      const amount = miaListing.amount + 1;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.buyTokens(miaListing.id, miaListing.token, amount, buyer),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_NOT_ENOUGH_TOKENS);
    });

    it("succeeds, transfers STX to seller and tokens to buyer", () => {
      const buyer = ctx.accounts.get("wallet_1")!;
      const amount = 200;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.buyTokens(miaListing.id, miaListing.token, amount, buyer),
      ]).receipts[0];

      // assert
      receipt.result.expectOk().expectBool(true);

      assertEquals(receipt.events.length, 2);
      receipt.events.expectSTXTransferEvent(
        amount * miaListing.price,
        buyer.address,
        miaSeller.address
      );

      receipt.events.expectFungibleTokenTransferEvent(
        amount,
        swap.address,
        buyer.address,
        MiamiCoin.TOKEN_NAME
      );

      const listing = <Listing>(
        swap.getListing(miaListing.id).expectSome().expectTuple()
      );
      listing.left.expectUint(miaListing.amount - amount);
    });
  });
});

run();
