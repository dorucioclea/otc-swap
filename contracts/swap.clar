(define-constant CONTRACT_OWNER tx-sender)
(define-constant CONTRACT_ADDRESS (as-contract tx-sender))
(define-constant DEPLOYED_AT block-height)


;;==
(define-private (is-dev-env)
  (is-eq DEPLOYED_AT u0)
)
