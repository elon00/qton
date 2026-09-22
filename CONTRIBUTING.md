# Contributing to QTON AI

QTON AI is a TON testnet/research project. Contributions should preserve reproducible testnet evidence and the distinction between testnet engineering and production/mainnet claims.

## Before opening a pull request

```bash
npm ci
npm run build
npm test
npm run audit:security
npm run audit:crypto
npm audit --omit=dev --audit-level=high
```

## Contribution rules

- Never commit wallet mnemonics, private keys, API tokens, or live deployment credentials.
- Keep testnet and mainnet material strictly separated.
- Add tests for contract, accounting, governance, and cryptographic changes.
- Do not claim mainnet deployment, audited security, market traction, liquidity, or end-to-end quantum resistance without external evidence.
- Update testnet evidence documents only from reproducible transaction/build evidence.
- Explain storage/schema/contract migrations and backwards compatibility.

Report vulnerabilities privately using `SECURITY.md`.
