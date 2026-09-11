# QTON AI Operational Incident Response Runbook

**Protocol:** QTON AI Protocol on TON Blockchain  
**Scope:** TVM Smart Contracts, Timelock Controller, PQC Gateway, RPC Failover  
**Classification:** Operational Security Standard Operating Procedure (SOP)  

---

## 1. Governance Architecture

- **Timelock Delay Window:** 48 Hours for non-emergency parameter modifications.
- **Quorum:** 2-of-3 Multisig Admin Keys required for state modifications, parameter updates, and protocol unpause.
- **Emergency Circuit Breaker:** 1-of-3 Admin Key can instantly pause all state transitions in the event of an detected anomaly.

---

## 2. Incident Classification & Trigger Matrix

| Severity | Definition | Automated Action | Governance Step |
|---|---|---|---|
| **SEV-1 (Critical)** | On-chain exploit, abnormal transfer velocity, or oracle breach | Emergency Circuit Breaker engaged | 1 Admin triggers `sendEmergencyPause()`; Protocol halted immediately |
| **SEV-2 (High)** | RPC provider outage, attestation latency > 180s | Multi-RPC failover triggered automatically | DevOps switches secondary RPC endpoints |
| **SEV-3 (Medium)** | DEX pool liquidity imbalance > 15% | Automated slippage guard prevents trades | Rebalance liquidity via seed automation |

---

## 3. Emergency Circuit Breaker Execution

### Step 1: Triggering Emergency Pause
Any authorized admin broadcasts a signed pause cell:
```typescript
const pauseOp = 0x5c723f51;
await timelockContract.sendEmergencyPause(deployer.getSender(), {
  queryId,
  signerPubkey: pk1,
  signature: pauseSig
});
```

### Step 2: Investigation & Vulnerability Mitigation
1. Query on-chain state: `npm run wallet:info`
2. Audit contract states and identify offending transaction hashes on [TonScan](https://testnet.tonscan.org).
3. Prepare state resolution patch.

### Step 3: 2-of-3 Multisig Consensus for Unpause
Once verified secure, 2 independent admin keys sign the unpause instruction:
```typescript
await timelockContract.sendUnpause(deployer.getSender(), {
  queryId,
  signer1Pubkey: pk1,
  sig1,
  signer2Pubkey: pk2,
  sig2
});
```

---

## 4. Key Management & Failover Policy

- Admin private keys are secured in hardware security modules (HSM) / isolated hardware devices.
- No individual administrator possesses unilateral authority to withdraw funds or permanently alter protocol rules.
