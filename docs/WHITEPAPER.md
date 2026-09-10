# QTON — Quantum TON
## Reality-First Intelligent Asset Infrastructure on TON

**Version:** 1.0 — September 2026  
**Status:** Experimental / Testnet research infrastructure  
**Repository:** https://github.com/elon00/qton

## Abstract

QTON is a research-oriented intelligent asset infrastructure built around the TON ecosystem. Its objective is to combine a TON Jetton asset layer, launchpad infrastructure, application-level post-quantum cryptography (PQC), deterministic computational experiments, and an evidence-driven verification framework.

QTON is designed under a **Reality-First / Universal Reality System (URS)** policy: a capability is not promoted from implementation to production reality merely because code exists. Claims should be backed by reproducible execution, transaction evidence, tests, deployment records, and independent verification where appropriate.

The current repository evidence supports a **TON Testnet prototype**. It does not claim a mainnet launch, independent security certification, sustained market liquidity, or production readiness.

## 1. Problem Statement

Blockchain applications increasingly combine programmable assets, autonomous software, cryptographic authorization, and intelligent decision systems. These layers create a verification problem: a repository can contain sophisticated code while the corresponding live system, security properties, users, liquidity, or operational guarantees remain unproven.

QTON addresses this problem by making evidence a first-class engineering artifact. The system separates:

- executable software from roadmap features;
- testnet execution from mainnet claims;
- cryptographic tests from end-to-end security certification;
- simulations from live financial execution;
- repository evidence from independent verification;
- engineering readiness from market readiness.

## 2. Vision

The long-term vision is a verifiable intelligent asset infrastructure on TON where asset creation, launch mechanisms, cryptographic authorization, computational intelligence, and operational state can be inspected through reproducible evidence.

The immediate objective is narrower: build and verify the core infrastructure on TON Testnet before any production or mainnet claim is made.

## 3. Architecture

QTON is organized conceptually into the following layers:

1. **QTON Jetton Layer** — a TON-compatible fungible asset layer using the Jetton model.
2. **Launchpad Layer** — experimental infrastructure for registering and incubating projects.
3. **PQC Gateway Layer** — application/gateway cryptographic workflows using NIST ML-DSA-65.
4. **Governance / Timelock Layer** — controlled administrative actions and delayed governance operations.
5. **Conway Computational Layer** — deterministic computational/entropy experiments used by the application logic.
6. **Application/UI Layer** — wallet connectivity and user-facing workflows.
7. **Reality / Evidence Layer** — manifests, evidence registries, test suites, build artifacts, and verification commands.

The architecture is intentionally modular so that experimental components can be tested without being represented as proven production security properties.

## 4. Asset Model

The QTON Jetton is the project's TON-native asset prototype. Repository evidence records a Testnet Jetton Master and an initial 1,000,000 QTON mint.

Current documented Testnet entities include:

- **QTON Jetton Master:** `kQCI8yoRda7UzQSOOypvN_trGrzNb4tGmRR9N-S9LOG-wW58`
- **QTON Launchpad:** `kQAHuKwr2EhHjjq4wG_xbUA7WtSw9j9OH9rfFrcBvxczgpmh`
- **Deployer:** `kQC2Lo6MZgFe-AYQX8QNrtUASqkk_Ka_Shiej2mmkHxLg49t`
- **User Jetton Wallet:** `kQBOeTMOCLcWSfze3GXD56PqtbPWDkg6lqZw_k6BHHt47lBD`

These addresses are repository-recorded Testnet evidence and should be independently rechecked before being treated as current external state.

## 5. Post-Quantum Cryptography

QTON integrates **ML-DSA-65**, the NIST post-quantum digital signature standard specified by FIPS 204, at the application/gateway layer.

The repository contains cryptographic tests covering signing, verification, and tamper rejection, together with gateway-oriented contract logic.

This design is intended to explore how PQC authorization can coexist with a blockchain application architecture. It is **not** a claim that TON's base protocol, validator security, wallet ecosystem, or every QTON component is quantum-safe. It is also not an independent cryptographic audit.

Future work may evaluate additional NIST-standardized algorithms, key-management policies, domain separation, replay protection, hardware-backed signing, and formal security review.

## 6. Launchpad and Intelligent Infrastructure

The launchpad is an experimental mechanism for project registration and incubation. The research direction is to connect project creation with measurable verification requirements rather than treating deployment as proof of success.

A future production launchpad could require evidence gates covering:

- contract compilation and deterministic artifacts;
- deployment and state verification;
- security analysis;
- liquidity and market mechanisms;
- operational monitoring;
- user activity;
- governance controls;
- legal/compliance review where applicable.

Until these gates are demonstrated in a production environment, the launchpad remains testnet/experimental infrastructure.

## 7. Reality-First Verification

QTON adopts the following truth taxonomy:

| State | Meaning |
|---|---|
| `REAL_VERIFIED` | Reproducible evidence supports the specific claim. |
| `REAL_UNVERIFIED` | Implementation exists but sufficient external/state proof is incomplete. |
| `EXPERIMENTAL` | Real research software or prototype integration. |
| `SIMULATION` | Modelled or sandbox behavior, not live execution. |
| `ROADMAP` | Planned capability. |
| `BLOCKED` | Deliberately unavailable until evidence requirements pass. |

The central rule is:

> **NO PROOF → NO PRODUCTION CLAIM.**

A passing internal test proves only the behavior asserted by that test. It does not automatically prove security, market demand, liquidity, decentralization, or production readiness.

## 8. Evidence and Reproducibility

The repository maintains an evidence registry and Testnet evidence documentation. The verification pipeline is designed to check artifact integrity, compilation, sandbox behavior, cryptographic tests, contract state, transaction evidence, and evidence sealing.

Recommended verification commands:

```bash
npm run reality:all
npm run build
npm test
npm run audit:crypto
npm run testnet:gate
npm run ui
```

External observers should reproduce the relevant commands and independently inspect public-chain state before relying on a live-state claim.

## 9. Security Model

QTON's security model is layered:

- contract invariants and sandbox tests for implementation correctness;
- cryptographic test vectors for PQC primitives;
- controlled gateway workflows for application authorization;
- evidence manifests for traceability;
- fail-closed classification for unsupported production claims.

The current prototype should not be considered independently audited. Production security would require professional smart-contract review, cryptographic review, infrastructure hardening, key-management review, monitoring, incident response, and appropriate operational controls.

## 10. Market and Production Status

The project deliberately distinguishes technical existence from product validation.

Current status:

- TON Testnet deployment: **repository-evidenced / verified at the repository level**;
- QTON Jetton: **Testnet verified by recorded evidence**;
- PQC: **partially verified at the application/cryptographic layer**;
- Launchpad: **experimental/testnet**;
- DEX/market: **not market-proven**;
- Mainnet: **not claimed**;
- Production certification: **not independently certified**;
- Market readiness: **not proven**.

Real product validation requires real users, repeated usage, operational history, security review, and applicable legal/compliance work.

## 11. Roadmap

### Phase 1 — Testnet verification
- maintain reproducible deployment evidence;
- expand contract invariants;
- strengthen PQC gateway tests;
- improve evidence manifests.

### Phase 2 — Security hardening
- independent smart-contract review;
- independent cryptographic review;
- key-management and operational threat modeling;
- monitoring and incident-response design.

### Phase 3 — Controlled ecosystem experiments
- real testnet users;
- measurable launchpad activity;
- transparent market/liquidity experiments;
- reproducible performance measurements.

### Phase 4 — Production decision
Mainnet consideration should occur only after the relevant technical, security, operational, governance, market, and legal/compliance gates have been independently evaluated.

## 12. Conclusion

QTON is a **reality-first TON Testnet research prototype** combining an asset layer, launchpad infrastructure, application-level PQC, computational experiments, and evidence-driven verification.

Its core contribution is not a promise that every planned feature is already real. It is a framework for progressively converting code and experiments into verifiable infrastructure while explicitly blocking unsupported production claims.

**Truth over hype. Evidence over claims. Reproducibility over assumption.**

## License

Apache-2.0.
