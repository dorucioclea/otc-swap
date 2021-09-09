(define-constant CONTRACT_OWNER tx-sender)
(define-constant CONTRACT_ADDRESS (as-contract tx-sender))
(define-constant DEPLOYED_AT block-height)

(use-trait sip-010-token .sip-010-trait-ft-standard.sip-010-trait)

(define-constant ERR_INVALID_VALUE (err u2000))
(define-constant ERR_UNKNOWN_LISTING (err u2001))
(define-constant ERR_NOT_AUTHORIZED (err u2002))
(define-constant ERR_INCORRECT_TOKEN (err u2003))
(define-constant ERR_NOT_ENOUGH_TOKENS (err u2004))
(define-constant ERR_HIGH_SLIPPAGE (err u2005))

(define-constant MAX_FEE_RATE u10)

(define-data-var feeRate uint u0) ;; defined in bp (base points)

(define-data-var lastListingId uint u0)
(define-map Listings
  uint
  {
    token: principal,
    seller: principal,
    amount: uint,
    price: uint,
    left: uint
  }
)

(define-read-only (get-fee-rate)
  (var-get feeRate)
)

(define-read-only (get-fee (stxAmount uint))
  (if (is-eq (var-get feeRate) u0)
    u0
    (/ (* stxAmount (var-get feeRate)) u10000)
  )
)

(define-public (set-fee-rate (newFeeRate uint))
  (begin
    (asserts! (<= newFeeRate MAX_FEE_RATE) ERR_INVALID_VALUE)
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (var-set feeRate newFeeRate)
    (ok true)
  )
)

(define-public (withdraw-fees)
  (as-contract (stx-transfer? (stx-get-balance CONTRACT_ADDRESS) CONTRACT_ADDRESS CONTRACT_OWNER))
)

(define-map UserLastListingIdx
  principal
  uint
)

(define-map UserListingIds
  { user: principal, idx: uint }
  uint
)

(define-map TokenListingLastIdx
  principal ;; token
  uint ;; lastIdx
)

(define-map TokenListingIds
  { token: principal, idx: uint }
  uint ;; listingId
)

(define-read-only (get-listings-count)
  (var-get lastListingId)
)

(define-read-only (get-listing (listingId uint))
  (map-get? Listings listingId)
)

(define-read-only (get-user-last-listing-idx (user principal))
  (default-to u0 (map-get? UserLastListingIdx user))
)

(define-read-only (get-user-listing-id (user principal) (idx uint))
  (map-get? UserListingIds { user: user, idx: idx })
)

(define-read-only (get-token-last-listing-idx (token <sip-010-token>))
  (default-to u0 (map-get? TokenListingLastIdx (contract-of token)))
)

(define-read-only (get-token-listing (token <sip-010-token>) (idx uint))
  (match (map-get? TokenListingIds { token: (contract-of token), idx: idx })
    listingId (map-get? Listings listingId)
    none
  )
)

(define-public (list-tokens (token <sip-010-token>) (amount uint) (price uint))
  (let
    (
      (newListingId (+ (var-get lastListingId) u1))
      (newUserListingIdx (+ (get-user-last-listing-idx tx-sender) u1))
      (newTokenListingIdx (+ (get-token-last-listing-idx token) u1))
    )
    (asserts! (and (> amount u0) (> price u0)) ERR_INVALID_VALUE)
    (map-insert Listings newListingId
      {
        token: (contract-of token),
        seller: tx-sender,
        amount: amount,
        price: price,
        left: amount
      }
    )
    (map-insert UserListingIds
      { user: tx-sender, idx: newUserListingIdx }
      newListingId
    )
    (map-insert TokenListingIds
      { token: (contract-of token), idx: newTokenListingIdx }
      newListingId
    )
    (map-set UserLastListingIdx tx-sender newUserListingIdx)
    (var-set lastListingId newListingId)
    (try! (contract-call? token transfer amount tx-sender CONTRACT_ADDRESS none))
    (ok newListingId)
  )
)

(define-public (change-price (listingId uint) (newPrice uint))
  (let
    (
      (listing (unwrap! (get-listing listingId) ERR_UNKNOWN_LISTING))
    )
    (asserts! (> newPrice u0) ERR_INVALID_VALUE)
    (asserts! (is-eq (get seller listing) tx-sender) ERR_NOT_AUTHORIZED)
    (map-set Listings
      listingId
      (merge listing { price: newPrice } )
    )
    (ok newPrice)
  )
)

(define-public (add-tokens (listingId uint) (token <sip-010-token>) (amount uint))
  (let
    (
      (listing (unwrap! (get-listing listingId) ERR_UNKNOWN_LISTING))
    )
    (asserts! (> amount u0) ERR_INVALID_VALUE)
    (asserts! (is-eq (get seller listing) tx-sender) ERR_NOT_AUTHORIZED)
    (asserts! (is-eq (get token listing) (contract-of token)) ERR_INCORRECT_TOKEN)
    (map-set Listings
      listingId
      (merge listing {
        amount: (+ (get amount listing) amount),
        left: (+ (get left listing) amount)
      })
    )
    (try! (contract-call? token transfer amount tx-sender CONTRACT_ADDRESS none))
    (ok true)
  )
)

(define-public (withdraw-tokens (listingId uint) (token <sip-010-token>) (amount uint))
  (let
    (
      (listing (unwrap! (get-listing listingId) ERR_UNKNOWN_LISTING))
      (seller tx-sender)
    )
    (asserts! (> amount u0) ERR_INVALID_VALUE)
    (asserts! (is-eq (get seller listing) seller) ERR_NOT_AUTHORIZED)
    (asserts! (is-eq (get token listing) (contract-of token)) ERR_INCORRECT_TOKEN)
    (asserts! (>= (get left listing) amount) ERR_NOT_ENOUGH_TOKENS)
    (map-set Listings
      listingId
      (merge listing { left: (- (get left listing) amount) })
    )
    (try! (as-contract (contract-call? token transfer amount CONTRACT_ADDRESS seller none)))
    (ok true)
  )
)

;; require 3 post-conditions
;; stxTransfer lessOrEqual totalCosts from buyer to contract
;; stxTransfer lessOrEqual totalCosts from contract to seller
;; ftTransfer  equalOrMore minQty from contract to buyer
(define-public (buy-tokens (listingId uint) (token <sip-010-token>) (minQty uint) (totalCosts uint))
  (let
    (
      (listing (unwrap! (get-listing listingId) ERR_UNKNOWN_LISTING))
      (buyer tx-sender)
      (buyQty (/ (- totalCosts (get-fee totalCosts)) (get price listing)))
      (buyCosts (* buyQty (get price listing)))
      (buyFee (get-fee buyCosts))
    )
    (asserts! (and (> minQty u0) (> totalCosts u0)) ERR_INVALID_VALUE)
    (asserts! (is-eq (get token listing) (contract-of token)) ERR_INCORRECT_TOKEN)
    (asserts! (>= (get left listing) minQty) ERR_NOT_ENOUGH_TOKENS)
    (asserts! (>= buyQty minQty) ERR_HIGH_SLIPPAGE)
    (map-set Listings
      listingId
      (merge listing { left: (- (get left listing) buyQty) })
    )
    (try! (stx-transfer? (+ buyCosts buyFee) buyer CONTRACT_ADDRESS)) ;; transfer all costs to contract
    (try! (as-contract (stx-transfer? buyCosts CONTRACT_ADDRESS (get seller listing)))) ;; transfer total - fee from contract to seller
    (try! (as-contract (contract-call? token transfer buyQty CONTRACT_ADDRESS buyer none))) ;; transfer tokens to buyer
    (ok true)
  )
)

;;==
(define-private (is-dev-env)
  (is-eq DEPLOYED_AT u0)
)
