(define-constant CONTRACT_OWNER tx-sender)
(define-constant CONTRACT_ADDRESS (as-contract tx-sender))
(define-constant DEPLOYED_AT block-height)

(use-trait sip-010-token .sip-010-trait-ft-standard.sip-010-trait)

(define-constant ERR_INVALID_VALUE (err u2000))
(define-constant ERR_UNKNOWN_LISTING (err u2001))
(define-constant ERR_NOT_AUTHORIZED (err u2002))
(define-constant ERR_INCORRECT_TOKEN (err u2003))
(define-constant ERR_NOT_ENOUGH_TOKENS (err u2004))

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

(define-read-only (get-fee (amount uint) (price uint))
  (if (is-eq (var-get feeRate) u0)
    u0
    (*
      (/ (* amount price) u1000)
      (var-get feeRate)
    )
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

(define-read-only (get-listing (listingId uint))
  (map-get? Listings listingId)
)

(define-read-only (get-user-last-listing-idx (user principal))
  (default-to u0 (map-get? UserLastListingIdx user))
)

(define-read-only (get-user-listing-id (user principal) (idx uint))
  (map-get? UserListingIds { user: user, idx: idx })
)

(define-public (list-tokens (token <sip-010-token>) (amount uint) (price uint))
  (let
    (
      (newListingId (+ (var-get lastListingId) u1))
      (newUserListingIdx (+ (get-user-last-listing-idx tx-sender) u1))
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

;; TODO allow partial buys
(define-public (buy-tokens (listingId uint) (token <sip-010-token>) (amount uint))
  (let
    (
      (listing (unwrap! (get-listing listingId) ERR_UNKNOWN_LISTING))
      (fee (get-fee amount (get price listing)))
      (buyer tx-sender)
    )
    (asserts! (> amount u0) ERR_INVALID_VALUE)
    (asserts! (is-eq (get token listing) (contract-of token)) ERR_INCORRECT_TOKEN)
    (asserts! (> (get left listing) amount) ERR_NOT_ENOUGH_TOKENS)
    (map-set Listings
      listingId
      (merge listing { left: (- (get left listing) amount) })
    )
    (try! (stx-transfer? (* (get price listing) amount) buyer (get seller listing)))
    (and (> fee u0) (try! (stx-transfer? fee buyer CONTRACT_ADDRESS)))
    (try! (as-contract (contract-call? token transfer amount CONTRACT_ADDRESS buyer none)))
    (ok true)
  )
)

;;==
(define-private (is-dev-env)
  (is-eq DEPLOYED_AT u0)
)
