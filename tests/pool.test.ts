import {
  describe,
  beforeEach,
  it,
  run,
  assertEquals,
  Account,
} from "../deps.ts";
import { MemeCoin } from "../models/memecoin.model.ts";
import { MiamiCoin } from "../models/miamicoin.model.ts";
import { Pool } from "../models/pool.model.ts";
import { Context } from "../src/context.ts";

describe("[POOL]", () => {
  let ctx: Context;
  let pool: Pool;
  let memeCoin: MemeCoin;
  let miamiCoin: MiamiCoin;

  beforeEach(() => {
    ctx = new Context();
    pool = ctx.models.get(Pool);
    memeCoin = ctx.models.get(MemeCoin);
    miamiCoin = ctx.models.get(MiamiCoin);
  });

  describe("create-pair()", () => {
    it("throws ERR_IDENTICAL_TOKENS when both tokens are the same", () => {
      const tokenA = memeCoin.address;
      const tokenB = tokenA;

      // act
      const receipt = ctx.chain.mineBlock([
        pool.createPair(tokenA, tokenB, ctx.deployer),
      ]).receipts[0];

      receipt.result.expectErr().expectUint(Pool.Err.ERR_IDENTICAL_TOKENS);
    });

    it("throws ERR_PAIR_ALREADY_EXISTS while trying to create same pair 2nd time", () => {
      const tokenA = memeCoin.address;
      const tokenB = miamiCoin.address;
      ctx.chain.mineBlock([pool.createPair(tokenA, tokenB, ctx.deployer)]);

      // act
      const receipts = ctx.chain.mineBlock([
        pool.createPair(tokenA, tokenB, ctx.deployer),
        pool.createPair(tokenB, tokenA, ctx.deployer),
      ]).receipts;

      receipts.map((receipt) =>
        receipt.result.expectErr().expectUint(Pool.Err.ERR_PAIR_ALREADY_EXISTS)
      );
    });
  });

  describe("get-pair-id", () => {
    it("returns none when queried unknown pair", () => {
      const tokenA = memeCoin.address;
      const tokenB = miamiCoin.address;

      pool.getPairId(tokenA, tokenB).expectNone();
      pool.getPairId(tokenB, tokenA).expectNone();
    });

    it("returns correct pair ID when queried known pair", () => {
      const tokenA = memeCoin.address;
      const tokenB = miamiCoin.address;
      ctx.chain.mineBlock([pool.createPair(tokenA, tokenB, ctx.deployer)]);

      pool.getPairId(tokenA, tokenB).expectSome().expectUint(1);
      pool.getPairId(tokenB, tokenA).expectSome().expectUint(1);
    });
  });
});

run();
