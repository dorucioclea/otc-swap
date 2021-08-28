import { Account, Accounts, Chain, Tx } from "../deps.ts";

export abstract class Model {
  abstract readonly name: string;

  constructor(readonly chain: Chain, readonly deployer: Account) {}

  get address(): string {
    return `${this.deployer.address}.${this.name}`;
  }

  callReadOnly(
    method: string,
    args: Array<any> = [],
    sender: Account = this.deployer
  ) {
    return this.chain.callReadOnlyFn(this.name, method, args, sender.address);
  }

  callPublic(
    method: string,
    args: Array<any> = [],
    sender: Account = this.deployer
  ) {
    return Tx.contractCall(this.name, method, args, sender.address);
  }
}

export class Models {
  static get<T extends Model>(
    type: {
      new (chain: Chain, deployer: Account): T;
    },
    chain: Chain,
    accounts: Accounts
  ): T {
    return new type(chain, accounts.get("deployer")!);
  }
}
