[![Tests](https://github.com/LNow/otc-swap/actions/workflows/ci-test-contracts.yml/badge.svg)](https://github.com/LNow/otc-swap/actions/workflows/ci-test-contracts.yml) 

* SIP-010 tokens owners can list their tokens for sale. 
* One tokens owner, can create multiple listings.
* Listing owner can change price of his/her listing at any time.
* Listing owner can add more tokens to listing at any time.
* Listing owner can withdraw portion of his/her tokens at any time.
* Listing owner can withdraw all of his/her tokens at any time.

* Contract owner can set up a fee rate between 0 and 1%. By default fee rate is set to 0%.
* Contract owner can withdraw collected fees.

* Potential buyers can buy SIP-010 tokens listed in contract at price picked by tokens sellers.
* Buyer can buy tokens only from one listing at a time.
* Buyer can buy fewer tokens than the quantity put up on sale by sellers.
* Buyer cant buy more tokens than the quantity put up on sale.

Listing tokens on sale results in locking them in contract (tokens can be either bought by anyone or withdrawn by seller)
Buying tokens listed in contract results in transferring tokens from contract to buyer + transferring STX from buyer to seller + transfering STX from buyer to contract (if fee rate > 0)

Contract is open for anyone.
Contract owner can't witdraw someones tokens, nor change their price.
Once contract is deployed users decide how much to list/sell/buy and for how much.
