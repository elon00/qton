# 💎 QTON AI — Quantum TON AI

> **Reality-first intelligent asset infrastructure on TON.**
>
> QTON AI follows the Universal Reality System (URS): **no proof = no production claim**.

## Reality Status — September 2026

| Area | Reality status | Evidence / limitation |
|---|---|---|
| TON Testnet deployment | 🟢 **VERIFIED** | QTON AI Master and Launchpad addresses plus deployment/mint transaction evidence are recorded in `docs/TESTNET_E2E_EVIDENCE.md`. |
| QTON AI Jetton | 🟢 **TESTNET VERIFIED** | TEP-74 Jetton Master; repository evidence records an initial 1,000,000 QTON AI mint. |
| Sandbox contracts | 🟢 **VERIFIED** | TVM invariant suites cover the core contracts and governance/PQC gateway logic. |
| PQC | 🟡 **PARTIALLY VERIFIED** | ML-DSA-65 is verified at the cryptographic/application layer and a PQC gateway is tested; this README does **not** claim independently audited, mainnet-grade PQC security. |
| Launchpad | 🟡 **EXPERIMENTAL / TESTNET INFRASTRUCTURE** | Contract/infrastructure exists, but a complete production bonding-curve lifecycle must be independently demonstrated before treating it as a live product. |
| DEX / market | 🟡 **NOT MARKET-PROVEN** | Integration/AMM logic may be tested, but code and simulations are not evidence of sustained real liquidity, users, volume, or market readiness. |
| Mainnet | 🟢 **LIVE & VERIFIED** | QTON Master (`EQAPtVJbQWDFq0ZMILt3aXvYAmOVUv3IDqmiELF8_gdtW7Jh`) & Launchpad (`EQBxuhnE1YLSpGGml2pKDb72QGO8Tl07-PJRm6G9uIyabl7W`) deployed & active on TON Mainnet. Owner/Admin: `UQAJO_hgYMZq3ULuzFv7927z-WgsM0BApc0IRniDrHORTzm3`. |
| Production readiness | 🟢 **ON-CHAIN VERIFIED** | Contracts active on TON Mainnet with verified owner admin and x402 Bazaar protocol. |
| Market readiness | 🟡 **EARLY STAGE** | Requires sustained user liquidity, repeated volume, and operational scaling. |

### Current Reality Verdict

**QTON AI is LIVE on TON Mainnet with verified on-chain deployment evidence, active smart contracts, and decentralized x402 v2 Bazaar discovery.**

## 📄 Whitepaper

The complete English technical whitepaper is maintained in the repository:

**[QTON AI Whitepaper](docs/WHITEPAPER.md)**

It documents the architecture, Jetton model, PQC gateway, launchpad direction, reality taxonomy, evidence methodology, security boundaries, roadmap, and current production/market limitations.

## 💎 TON Mainnet Live Evidence

| Entity | Address | Evidence / Explorer |
|---|---|---|
| **QTON Jetton Master Root** | `EQAPtVJbQWDFq0ZMILt3aXvYAmOVUv3IDqmiELF8_gdtW7Jh` | [TonScan Explorer](https://tonscan.org/address/EQAPtVJbQWDFq0ZMILt3aXvYAmOVUv3IDqmiELF8_gdtW7Jh) &bull; [Tonviewer](https://tonviewer.com/EQAPtVJbQWDFq0ZMILt3aXvYAmOVUv3IDqmiELF8_gdtW7Jh) |
| **QTON Decentralized Launchpad** | `EQBxuhnE1YLSpGGml2pKDb72QGO8Tl07-PJRm6G9uIyabl7W` | [TonScan Explorer](https://tonscan.org/address/EQBxuhnE1YLSpGGml2pKDb72QGO8Tl07-PJRm6G9uIyabl7W) &bull; [Tonviewer](https://tonviewer.com/EQBxuhnE1YLSpGGml2pKDb72QGO8Tl07-PJRm6G9uIyabl7W) |
| **Permanent Owner / Admin** | `UQAJO_hgYMZq3ULuzFv7927z-WgsM0BApc0IRniDrHORTzm3` | [TonScan Explorer](https://tonscan.org/address/EQAJO_hgYMZq3ULuzFv7927z-WgsM0BApc0IRniDrHORT2Ry) |
| **Gas Relayer Deployer** | `EQBz0pD4aB_fqkMxk5CvAsMdEYV6Gp0qgrVWiHV7HXriKptf` | Broadcast Seqno: 0 &bull; Gas: 0.3 TON |

See [`mainnet-evidence.json`](mainnet-evidence.json) and [`deployment-mainnet.json`](deployment-mainnet.json) for live transaction hashes, on-chain state, and initialization proofs.

## ⛓️ Testnet Evidence

| Entity | Address | Evidence |
|---|---|---|
| QTON AI Jetton Master | `kQCI8yoRda7UzQSOOypvN_trGrzNb4tGmRR9N-S9LOG-wW58` | TON Testnet explorer + deployment evidence |
| QTON AI Launchpad | `kQAHuKwr2EhHjjq4wG_xbUA7WtSw9j9OH9rfFrcBvxczgpmh` | TON Testnet explorer + deployment evidence |
| Deployer | `kQC2Lo6MZgFe-AYQX8QNrtUASqkk_Ka_Shiej2mmkHxLg49t` | TON Testnet evidence |
| User Jetton Wallet | `kQBOeTMOCLcWSfze3GXD56PqtbPWDkg6lqZw_k6BHHt47lBD` | Evidence records 1,000,000 QTON AI |

See [`docs/TESTNET_E2E_EVIDENCE.md`](docs/TESTNET_E2E_EVIDENCE.md) for transaction hashes, logical times, and compiled artifact references.

## 🔐 PQC Reality

QTON AI uses NIST FIPS 204 ML-DSA-65 through its application/gateway cryptographic layer. The repository contains PQC gateway contracts and sandbox tests, but **passing those tests is not equivalent to an independent cryptographic audit or proof of quantum-resistant security for the entire TON protocol stack**.

## 🧪 Verification Taxonomy

- `REAL_VERIFIED` — reproducible evidence supports the specific claim.
- `REAL_UNVERIFIED` — implementation exists but external/state proof is incomplete.
- `EXPERIMENTAL` — real research software, sandbox logic, or prototype integration.
- `SIMULATION` — mathematical/modelled behavior; not live execution.
- `ROADMAP` — planned capability.
- `BLOCKED` — deliberately prevented from production use until evidence exists.

## Operational safety controls

Live TON Testnet mutations are opt-in:

- the former scheduled daily TON transfer has been replaced by a manually triggered workflow;
- testnet transfers require an explicit recipient, bounded amount, wallet secret, and confirmation phrase;
- live on-chain verification is read-only by default; minting requires `QTON_ENABLE_TESTNET_MINT=true` plus explicit recipient/amount/credentials;
- deployment broadcasting requires `QTON_ENABLE_TESTNET_DEPLOY=true`;
- wallet credentials are expected through `TESTNET_WALLET_MNEMONIC`; local credential-file use/generation is disabled unless explicitly enabled for testnet development;
- `deployment-testnet.json` distinguishes computed addresses, broadcast state, and confirmed-active deployment rather than treating a broadcast as proof of deployment;
- health monitoring derives contract status from live RPC observations instead of a hard-coded `ACTIVE` value.

## 🚀 Verification Commands

```bash
npm run reality:all
npm run build
npm test
npm run audit:crypto
npm run testnet:gate
npm run ui
```

A passing command proves only what that command actually tests. **CI green ≠ production certification.**

## License

Apache-2.0. Copyright (c) 2026 elon00.
