# 💎 QTON — Quantum TON

> **Reality-first intelligent asset infrastructure on TON.**
>
> QTON follows the Universal Reality System (URS): **no proof = no production claim**.

## Reality Status — September 2026

| Area | Reality status | Evidence / limitation |
|---|---|---|
| TON Testnet deployment | 🟢 **VERIFIED** | QTON Master and Launchpad addresses plus deployment/mint transaction evidence are recorded in `docs/TESTNET_E2E_EVIDENCE.md`. |
| QTON Jetton | 🟢 **TESTNET VERIFIED** | TEP-74 Jetton Master; repository evidence records an initial 1,000,000 QTON mint. |
| Sandbox contracts | 🟢 **VERIFIED** | TVM invariant suites cover the core contracts and governance/PQC gateway logic. |
| PQC | 🟡 **PARTIALLY VERIFIED** | ML-DSA-65 is verified at the cryptographic/application layer and a PQC gateway is tested; this README does **not** claim independently audited, mainnet-grade PQC security. |
| Launchpad | 🟡 **EXPERIMENTAL / TESTNET INFRASTRUCTURE** | Contract/infrastructure exists, but a complete production bonding-curve lifecycle must be independently demonstrated before treating it as a live product. |
| DEX / market | 🟡 **NOT MARKET-PROVEN** | Integration/AMM logic may be tested, but code and simulations are not evidence of sustained real liquidity, users, volume, or market readiness. |
| Mainnet | 🔒 **NOT CLAIMED** | No mainnet production launch is claimed by this repository. |
| Production readiness | 🟡 **NOT INDEPENDENTLY CERTIFIED** | CI/tests and internal reality gates are engineering evidence, not an independent production certification. |
| Market readiness | 🟡 **NOT PROVEN** | Requires real users, repeated usage, operational monitoring, security review, and applicable legal/compliance work. |

### Current Reality Verdict

**QTON is a real TON Testnet project with verified on-chain deployment evidence. It is not represented here as a mainnet-live, independently audited, or market-proven production system.**

## 📄 Whitepaper

The complete English technical whitepaper is maintained in the repository:

**[QTON Whitepaper](docs/WHITEPAPER.md)**

It documents the architecture, Jetton model, PQC gateway, launchpad direction, reality taxonomy, evidence methodology, security boundaries, roadmap, and current production/market limitations.

## ⛓️ Testnet Evidence

| Entity | Address | Evidence |
|---|---|---|
| QTON Jetton Master | `kQCI8yoRda7UzQSOOypvN_trGrzNb4tGmRR9N-S9LOG-wW58` | TON Testnet explorer + deployment evidence |
| QTON Launchpad | `kQAHuKwr2EhHjjq4wG_xbUA7WtSw9j9OH9rfFrcBvxczgpmh` | TON Testnet explorer + deployment evidence |
| Deployer | `kQC2Lo6MZgFe-AYQX8QNrtUASqkk_Ka_Shiej2mmkHxLg49t` | TON Testnet evidence |
| User Jetton Wallet | `kQBOeTMOCLcWSfze3GXD56PqtbPWDkg6lqZw_k6BHHt47lBD` | Evidence records 1,000,000 QTON |

See [`docs/TESTNET_E2E_EVIDENCE.md`](docs/TESTNET_E2E_EVIDENCE.md) for transaction hashes, logical times, and compiled artifact references.

## 🔐 PQC Reality

QTON uses NIST FIPS 204 ML-DSA-65 through its application/gateway cryptographic layer. The repository contains PQC gateway contracts and sandbox tests, but **passing those tests is not equivalent to an independent cryptographic audit or proof of quantum-resistant security for the entire TON protocol stack**.

## 🧪 Verification Taxonomy

- `REAL_VERIFIED` — reproducible evidence supports the specific claim.
- `REAL_UNVERIFIED` — implementation exists but external/state proof is incomplete.
- `EXPERIMENTAL` — real research software, sandbox logic, or prototype integration.
- `SIMULATION` — mathematical/modelled behavior; not live execution.
- `ROADMAP` — planned capability.
- `BLOCKED` — deliberately prevented from production use until evidence exists.

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
