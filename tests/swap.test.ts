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

    it("succeeds, transfers STX to seller, STX to contract and tokens to buyer when fee rate is > 0", () => {
      const buyer = ctx.accounts.get("wallet_1")!;
      const amount = 234;
      const feeRate = 6;
      ctx.chain.mineBlock([swap.setFeeRate(feeRate, ctx.deployer)]);

      // act
      const receipt = ctx.chain.mineBlock([
        swap.buyTokens(miaListing.id, miaListing.token, amount, buyer),
      ]).receipts[0];

      // assert
      receipt.result.expectOk().expectBool(true);

      assertEquals(receipt.events.length, 3);

      receipt.events.expectSTXTransferEvent(
        amount * miaListing.price,
        buyer.address,
        miaSeller.address
      );

      receipt.events.expectSTXTransferEvent(
        Math.floor((amount * miaListing.price) / 1000) * feeRate,
        buyer.address,
        swap.address
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

    it("succeeds when user buys all tokens from listing", () => {
      const buyer = ctx.accounts.get("wallet_5")!;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.buyTokens(
          memeListing.id,
          memeListing.token,
          memeListing.amount,
          buyer
        ),
      ]).receipts[0];

      // asserts
      receipt.result.expectOk().expectBool(true);
      receipt.events.expectFungibleTokenTransferEvent(
        memeListing.amount,
        swap.address,
        buyer.address,
        MemeCoin.TOKEN_NAME
      );
    });
  });

  describe("withdraw-tokens()", () => {
    let seller: Account;
    const listingId = 1;
    const listingAmount = 20000;

    beforeEach(() => {
      seller = ctx.accounts.get("wallet_8")!;

      ctx.chain.mineBlock([
        meme.mint(listingAmount, seller),
        swap.listTokens(meme.address, listingAmount, 200, seller),
      ]);
    });

    it("throws ERR_UNKNOWN_LISTING while withdrawing tokens from unknown listing", () => {
      const unknownListingId = 324324;
      const amount = 123;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.withdrawTokens(unknownListingId, meme.address, amount, seller),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_UNKNOWN_LISTING);
    });

    it("throws ERR_INCORRECT_TOKEN while withdrawing wrong tokens from listing", () => {
      const amount = 342;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.withdrawTokens(listingId, mia.address, amount, seller),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_INCORRECT_TOKEN);
    });

    it("throws ERR_NOT_AUTHORIZED while withdrawing tokens from someone else listing", () => {
      const otherSeller = ctx.accounts.get("wallet_1")!;
      const amount = 234;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.withdrawTokens(listingId, meme.address, amount, otherSeller),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_NOT_AUTHORIZED);
    });

    it("throws ERR_INVALID_VALUE when user pass 0 as amount", () => {
      const amount = 0;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.withdrawTokens(listingId, meme.address, amount, seller),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_INVALID_VALUE);
    });

    it("throws ERR_NOT_ENOUGH_TOKENS while withdrawing more tokens than left in listing", () => {
      const amount = listingAmount + 1;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.withdrawTokens(listingId, meme.address, amount, seller),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_NOT_ENOUGH_TOKENS);
    });

    it("succeeds and withdraw requested amount from listing", () => {
      const amount = 200;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.withdrawTokens(listingId, meme.address, amount, seller),
      ]).receipts[0];

      // assert
      receipt.result.expectOk().expectBool(true);
      assertEquals(receipt.events.length, 1);
      receipt.events.expectFungibleTokenTransferEvent(
        amount,
        swap.address,
        seller.address,
        MemeCoin.TOKEN_NAME
      );

      const listing = <Listing>(
        swap.getListing(listingId).expectSome().expectTuple()
      );
      listing.left.expectUint(listingAmount - amount);
    });
  });

  describe("set-fee-rate()", () => {
    it("throws ERR_INVALID_VALUE while setting new fee higher than 10 bp", () => {
      const newFeeRate = 11;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.setFeeRate(newFeeRate, ctx.deployer),
      ]).receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_INVALID_VALUE);
    });

    it("throws ERR_NOT_AUTHORIZED when called by someone who isn't contract owner", () => {
      const newFeeRate = 2;
      const user = ctx.accounts.get("wallet_3")!;

      // act
      const receipt = ctx.chain.mineBlock([swap.setFeeRate(newFeeRate, user)])
        .receipts[0];

      // assert
      receipt.result.expectErr().expectUint(Swap.Err.ERR_NOT_AUTHORIZED);
    });

    it("succeeds and change fee rate", () => {
      const newFeeRate = 3;

      // act
      const receipt = ctx.chain.mineBlock([
        swap.setFeeRate(newFeeRate, ctx.deployer),
      ]).receipts[0];

      // assert
      receipt.result.expectOk().expectBool(true);
      swap.getFeeRate().expectUint(newFeeRate);
    });
  });
});

run();
