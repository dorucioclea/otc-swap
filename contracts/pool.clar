
(define-constant CONTRACT_OWNER tx-sender)
(define-constant CONTRACT_ADDRESS (as-contract tx-sender))
(define-constant DEPLOYED_AT block-height)

(use-trait FT .sip-010-trait-ft-standard.sip-010-trait)

(define-constant ERR_IDENTICAL_TOKENS (err u5000))
(define-constant ERR_PAIR_ALREADY_EXISTS (err u5001))

(define-data-var lastPairId uint u0)
(define-map Pairs
  uint ;; pairId
  { tokenA: principal, tokenB: principal }
)

(define-map PairIds
  { tokenA: principal, tokenB: principal }
  uint ;; pairId
)

(define-read-only (get-pair-id (tokenA <FT>) (tokenB <FT>))
  (map-get? PairIds { tokenA: (contract-of tokenA), tokenB: (contract-of tokenB) })
)

(define-public (create-pair (tokenA <FT>) (tokenB <FT>))
  (let
    (
      (newPairId (+ (var-get lastPairId) u1))
    )
    (asserts! (not (is-eq tokenA tokenB)) ERR_IDENTICAL_TOKENS)
    (asserts!
      (and
        (map-insert Pairs newPairId { tokenA: (contract-of tokenA), tokenB: (contract-of tokenB) })
        (map-insert PairIds { tokenA: (contract-of tokenA), tokenB: (contract-of tokenB) } newPairId)
        (map-insert PairIds { tokenA: (contract-of tokenB), tokenB: (contract-of tokenA) } newPairId)
      ) ERR_PAIR_ALREADY_EXISTS
    )

    (ok true)
  )
)

;; TODO
(define-public (add-liquidity (tokenA principal) (tokenB principal) (amountA uint) (amountB uint))
  (ok true)
)

;; TODO
(define-public (add-stx-liquidity (token principal) (tokenAmount uint) (stxAmount uint))
  (ok true)
)

;; TODO
(define-public (remove-liquidity (tokenA principal) (tokenB principal) (amountA uint) (amountB uint))
  (ok true)
)

;; TODO
(define-public (remove-stx-liquidity (token principal) (tokenAmount uint) (stxAmount uint))
  (ok true)
)
