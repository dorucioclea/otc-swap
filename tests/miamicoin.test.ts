import {
  Account,
  Accounts,
  assertEquals,
  Chain,
  Clarinet,
  Tx,
  types,
} from "../deps.ts";

Clarinet.test({
  name: "Fake MiamiCoin can be minted at will",
  async fn(chain: Chain, accounts: Accounts) {
    const amount = 200;
    const recipient = accounts.get("wallet_2")!;

    const receipt = chain.mineBlock([
      Tx.contractCall(
        "miamicoin-token",
        "mint",
        [types.uint(amount), types.principal(recipient.address)],
        recipient.address
      ),
    ]).receipts[0];

    receipt.result.expectOk().expectBool(true);
    receipt.events.expectFungibleTokenMintEvent(
      amount,
      recipient.address,
      "miamicoin"
    );
  },
});

Clarinet.test({
  name: "Fake MiamiCoin can be transferred",
  async fn(chain: Chain, accounts: Accounts) {
    const amount = 200;
    const from = accounts.get("wallet_2")!;
    const to = accounts.get("wallet_3")!;
    chain.mineBlock([
      Tx.contractCall(
        "miamicoin-token",
        "mint",
        [types.uint(amount), types.principal(from.address)],
        from.address
      ),
    ]);

    const receipt = chain.mineBlock([
      Tx.contractCall(
        "miamicoin-token",
        "transfer",
        [
          types.uint(amount),
          types.principal(from.address),
          types.principal(to.address),
          types.none(),
        ],
        from.address
      ),
    ]).receipts[0];

    receipt.result.expectOk().expectBool(true);
    receipt.events.expectFungibleTokenTransferEvent(
      amount,
      from.address,
      to.address,
      "miamicoin"
    );
  },
});
