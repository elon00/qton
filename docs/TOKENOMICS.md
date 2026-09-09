# QTON Institutional Tokenomics Specification

**Standard**: TEP-74 Jetton on TON Blockchain  
**Status**: Production & Market Ready Specification  
**Governing Standard**: Universal Reality System (URS) v1.0  

---

## 1. Executive Summary

QTON (Quantum TON) is a utility jetton engineered for quantum-resistant operations, autonomous agentic intelligence, and verifiable multi-model workflows on The Open Network (TON). 

Unlike arbitrary infinite-inflation tokens, QTON pairs an expandable supply model with **Mathematical Invariant Bounds**, **48-Hour Timelock Governance**, and **2-of-3 Multisig Quorum**.

---

## 2. Supply & Allocation Architecture

| Allocation Category | Percentage | Initial Testnet Mint | Vesting & Governance Rules |
| :--- | :--- | :--- | :--- |
| **Initial Circulation & Liquidity** | 50.0% | 1,000,000 QTON | Deposited into Testnet User Wallet & DEX Seed Pool |
| **Conway Automaton Emission Pool** | 25.0% | Governed by Epoch | Emitted deterministically based on cellular automata entropy |
| **PQC Security & Research Reserve**| 15.0% | Locked in Timelock | Released only via 48-Hour Timelock proposal |
| **Ecosystem & Developer Grants**   | 10.0% | Multisig Controlled | 2-of-3 Multisig execution only |

---

## 3. Mathematical Emission Policy (Epoch-Bound Cap)

To prevent hyperinflation while enabling infinite theoretical longevity:

1. **Epoch Duration**: $T_{\text{epoch}} = 30 \text{ days}$ (2,592,000 seconds).
2. **Maximum Mint Rate per Epoch**:
   $$\Delta S_{\text{max}} \le 0.02 \times S_{\text{total}}$$
   *(Maximum 2.0% expansion per 30-day epoch).*
3. **Conway Entropy Discount Factor**:
   $$\text{Reward} = R_0 \times \left(1 - \frac{H_{\text{Conway}}}{\ln 2}\right) \times \gamma^{t}$$
   Where $H_{\text{Conway}}$ is Shannon entropy of the active automaton grid and $\gamma = 0.98$ is the epoch decay factor.

---

## 4. Governance & Circuit Breakers

1. **2-of-3 Multisig Quorum**:
   - Every administrative action requires cryptographic approval from at least 2 independent operator keys.
2. **48-Hour Delay Window (`contracts/qton_timelock.fc`)**:
   - Proposed mint or administrative transfers enter an immutable 48-hour queue before execution.
   - Allows public inspection and community verification on-chain.
3. **Emergency Circuit Breaker**:
   - Any single authorized key (1-of-3) can trigger `op::emergency_pause()` immediately without delay to freeze operations during detected anomalies.
   - Unpausing requires a 2-of-3 consensus (`op::unpause()`).
