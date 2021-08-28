import { Accounts, assertEquals, Chain, Clarinet, types } from "../deps.ts";
import { MiamiCoin } from "../models/miamicoin.model.ts";
import { Models } from "../models/model.ts";
import { Swap } from "../models/swap.model.ts";

Clarinet.test({
  name: "Token owner can list tokens",
  async fn(chain: Chain, accounts: Accounts) {
    const { swap, mia } = createModels(chain, accounts);

    const user = accounts.get("wallet_1")!;
    const amount = 200;
    const price = 10;

    const receipt = chain.mineBlock([
      mia.mint(amount, user),
      swap.listTokens(amount, price, user),
    ]).receipts[1];

    receipt.result.expectOk().expectUint(1);
    receipt.events.expectFungibleTokenTransferEvent(
      amount,
      user.address,
      swap.address,
      "miamicoin"
    );
  },
});

Clarinet.test({
  name: "Listing more tokens than user have fails",
  async fn(chain: Chain, accounts: Accounts) {
    const { swap, mia } = createModels(chain, accounts);

    const user = accounts.get("wallet_1")!;
    const amount = 200;
    const price = 10;

    const receipt = chain.mineBlock([swap.listTokens(amount, price, user)])
      .receipts[0];

    receipt.result.expectErr().expectUint(1);
    assertEquals(receipt.events.length, 0);
  },
});

function createModels(chain: Chain, accounts: Accounts) {
  return {
    swap: Models.get(Swap, chain, accounts),
    mia: Models.get(MiamiCoin, chain, accounts),
  };
}
