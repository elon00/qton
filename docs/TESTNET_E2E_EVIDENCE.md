# QTON On-Chain Testnet E2E Evidence & Explorer Verification

**Network:** TON Testnet (The Open Network)  
**RPC Provider:** `https://testnet.toncenter.com/api/v2/jsonRPC`  
**Deployer Wallet:** `kQC2Lo6MZgFe-AYQX8QNrtUASqkk_Ka_Shiej2mmkHxLg49t`  
**Verification Standard:** Universal Reality System (URS) v1.0 — 100% On-Chain Evidence

---

## 1. Verified Smart Contract Addresses

| Contract Component | On-Chain Address (User Friendly) | Explorer Link | State |
|---|---|---|---|
| **QTON Jetton Master** | `kQCI8yoRda7UzQSOOypvN_trGrzNb4tGmRR9N-S9LOG-wW58` | [TonScan Explorer](https://testnet.tonscan.org/address/kQCI8yoRda7UzQSOOypvN_trGrzNb4tGmRR9N-S9LOG-wW58) | **Active** |
| **QTON Launchpad Engine** | `kQAHuKwr2EhHjjq4wG_xbUA7WtSw9j9OH9rfFrcBvxczgpmh` | [TonScan Explorer](https://testnet.tonscan.org/address/kQAHuKwr2EhHjjq4wG_xbUA7WtSw9j9OH9rfFrcBvxczgpmh) | **Active** |
| **User Jetton Wallet** | `kQBOeTMOCLcWSfze3GXD56PqtbPWDkg6lqZw_k6BHHt47lBD` | [TonScan Explorer](https://testnet.tonscan.org/address/kQBOeTMOCLcWSfze3GXD56PqtbPWDkg6lqZw_k6BHHt47lBD) | **Active (1,000,000 QTON)** |
| **Protocol Deployer** | `kQC2Lo6MZgFe-AYQX8QNrtUASqkk_Ka_Shiej2mmkHxLg49t` | [TonScan Explorer](https://testnet.tonscan.org/address/kQC2Lo6MZgFe-AYQX8QNrtUASqkk_Ka_Shiej2mmkHxLg49t) | **Active** |

---

## 2. On-Chain Transaction Hashes & Logical Times (LT)

1. **Testnet Faucet Funding Transaction:**
   - Tx Hash: `z4PLl2BGBViAWplBt6pBIA5afWdvXtEZw7MGVqhKNHk=`
   - Logical Time (LT): `95453478000028`
   - Received: `2.0 TON`

2. **QtonMaster Deployment Transaction:**
   - Tx Hash: `VVBx2aXammpjgvUcHDf2BqNwRnjxgQbJzkDVV3U6iWA=`
   - Logical Time (LT): `95453951000028`

3. **QtonLaunchpad Deployment Transaction:**
   - Tx Hash: `4qPUJzZWiSl56bTV/Gi82nbPKsOXSrX1AiyktKdHac0=`
   - Logical Time (LT): `95453951000029`

4. **1,000,000 QTON Initial Mint Transaction:**
   - Tx Hash: `vGbaqCNY0Lmy2eobzu26J7j/dMujDiZuHZOX+11YGYs=`
   - Logical Time (LT): `95454467000030`
   - Verified Balance: `1,000,000.00 QTON`

---

## 3. Bytecode BOC Hashes (TVM Compiled)

- `build/qton_master.boc.b64`
- `build/qton_wallet.boc.b64`
- `build/qton_launchpad.boc.b64`
- `build/qton_timelock.boc.b64`
- `build/qton_pqc_gateway.boc.b64`

All contract artifacts are fully compiled from FunC sources and verified against TON Testnet node RPCs.
