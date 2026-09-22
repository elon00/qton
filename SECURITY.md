# Security Policy

## Project status

QTON AI is currently a testnet/research project. Repository tests and internal verification gates are engineering evidence; they are not an independent security audit or production certification.

## Reporting a vulnerability

Do not publish exploitable vulnerabilities, private keys, seed phrases, API tokens, wallet secrets, or attack details in a public issue.

Use GitHub private vulnerability reporting / a Security Advisory for this repository when available. Please include:

- affected commit and file
- reproduction steps or a minimal proof of concept
- expected security impact
- whether funds, wallet keys, credentials, or user data may be affected
- suggested mitigation, if known

## Key-handling rules

- Never commit wallet mnemonics, private keys, API tokens, or production credentials.
- Treat `testnet-wallet.example.json` as an example schema only.
- Rotate any credential immediately if it appears in Git history, logs, screenshots, artifacts, or workflow output.
- Keep mainnet and testnet credentials strictly separated.
- Do not treat a passing PQC test as proof that the entire TON stack is quantum-resistant.

## Production boundary

Mainnet production use requires independent contract/security review, operational monitoring, key-management procedures, incident response, upgrade/recovery planning, and jurisdiction-appropriate legal/compliance review.
