(define-constant CONTRACT_OWNER tx-sender)
(define-constant CONTRACT_ADDRESS (as-contract tx-sender))
(define-constant DEPLOYED_AT block-height)

(impl-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-constant ERR_NOT_AUTHORIZED (err u4000))

(define-fungible-token meme)

(define-public (transfer (amount uint) (from principal) (to principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq from tx-sender) ERR_NOT_AUTHORIZED)
    (if (is-some memo)
      (print memo)
      none
    )
    (ft-transfer? meme amount from to)
  )
)

(define-read-only (get-name)
  (ok "meme-coin")
)

(define-read-only (get-symbol)
  (ok "fak")
)

(define-read-only (get-decimals)
  (ok u3)
)

(define-read-only (get-balance (user principal))
  (ok (ft-get-balance meme user))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply meme))
)

(define-read-only (get-token-uri)
  (ok (some u"http://meme-coin.com"))
)

(define-public (mint (amount uint) (recipient principal))
  (ft-mint? meme amount recipient)
)
