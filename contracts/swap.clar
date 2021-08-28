(define-constant CONTRACT_OWNER tx-sender)
(define-constant CONTRACT_ADDRESS (as-contract tx-sender))
(define-constant DEPLOYED_AT block-height)

(use-trait sip-010-token .sip-010-trait-ft-standard.sip-010-trait)

(define-constant ERR_INVALID_VALUE (err u2000))



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

(define-public (list-tokens (token <sip-010-token>) (amount uint) (price uint))
  (let
    (
      (newListingId (+ (var-get lastListingId) u1))
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
    (var-set lastListingId newListingId)
    (try! (contract-call? token transfer amount tx-sender CONTRACT_ADDRESS none))
    (ok newListingId)
  )
)

;;==
(define-private (is-dev-env)
  (is-eq DEPLOYED_AT u0)
)
