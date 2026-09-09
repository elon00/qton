/**
 * QTON PQC On-Chain Gateway Tests
 * Standard: Anti-Replay Seqno, Freshness Expiry, Commit-Reveal Verification
 */

import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell } from '@ton/core';
import { keyPairFromSeed, sign } from '@ton/crypto';
import { QtonPqcGatewayContract } from '../src/contracts/QtonPqcGateway.js';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, before } from 'node:test';

describe('QTON PQC On-Chain Gateway TVM Sandbox Invariant Tests', () => {
  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let dummyTimelock: SandboxContract<TreasuryContract>;
  let gatewayCode: Cell;
  let gatewayContract: SandboxContract<QtonPqcGatewayContract>;

  const operatorKp = keyPairFromSeed(Buffer.alloc(32, 7));
  const operatorPk = BigInt('0x' + operatorKp.publicKey.toString('hex'));

  before(async () => {
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');
    dummyTimelock = await blockchain.treasury('dummy_timelock');

    const bocStr = fs.readFileSync(path.resolve('build/qton_pqc_gateway.boc.b64'), 'utf8');
    gatewayCode = Cell.fromBase64(bocStr);

    gatewayContract = blockchain.openContract(
      QtonPqcGatewayContract.createFromConfig(
        {
          pqcOperatorKey: operatorPk,
          lastSeqno: 0n,
          stateRootHash: 0n,
          timelockAddress: dummyTimelock.address,
        },
        gatewayCode
      )
    );

    await gatewayContract.sendDeploy(deployer.getSender(), toNano('1.0'));
  });

  it('PQC Invariant 1: should deploy PQC Gateway with authorized operator commitment', async () => {
    const data = await gatewayContract.getPqcGatewayData();
    assert.strictEqual(data.pqcOperatorKey, operatorPk);
    assert.strictEqual(data.lastSeqno, 0n);
    assert.strictEqual(data.stateRootHash, 0n);
  });

  it('PQC Invariant 2: should accept valid PQC attestation and advance seqno', async () => {
    const seqno = 1n;
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const payload = beginCell().storeUint(0x1234, 16).endCell();
    const actionHash = BigInt('0x' + payload.hash().toString('hex'));
    const pqcCommitment = 0xabcdef1234567890n;

    const attestCell = beginCell()
      .storeUint(0x4a91b2c4, 32)
      .storeUint(seqno, 64)
      .storeUint(expiry, 32)
      .storeUint(actionHash, 256)
      .storeUint(pqcCommitment, 256)
      .storeAddress(gatewayContract.address)
      .endCell();

    const operatorSig = sign(attestCell.hash(), operatorKp.secretKey);

    const res = await gatewayContract.sendAttestation(deployer.getSender(), {
      queryId: 201n,
      seqno,
      expiry,
      actionHash,
      pqcCommitment,
      operatorPubkey: operatorPk,
      operatorSig,
      payload,
    });

    assert.strictEqual(res.transactions.length > 0, true);

    const data = await gatewayContract.getPqcGatewayData();
    assert.strictEqual(data.lastSeqno, 1n, 'Seqno must increment to 1');
    assert.notStrictEqual(data.stateRootHash, 0n, 'State root hash must update');
  });

  it('PQC Invariant 3: should reject replay attack (re-submitting seqno 1) with exit code 301', async () => {
    const seqno = 1n; // Duplicate seqno!
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const payload = beginCell().storeUint(0x1234, 16).endCell();
    const actionHash = BigInt('0x' + payload.hash().toString('hex'));
    const pqcCommitment = 0xabcdef1234567890n;

    const attestCell = beginCell()
      .storeUint(0x4a91b2c4, 32)
      .storeUint(seqno, 64)
      .storeUint(expiry, 32)
      .storeUint(actionHash, 256)
      .storeUint(pqcCommitment, 256)
      .storeAddress(gatewayContract.address)
      .endCell();

    const operatorSig = sign(attestCell.hash(), operatorKp.secretKey);

    const res = await gatewayContract.sendAttestation(deployer.getSender(), {
      queryId: 202n,
      seqno,
      expiry,
      actionHash,
      pqcCommitment,
      operatorPubkey: operatorPk,
      operatorSig,
      payload,
    });

    // Check that transaction failed with exit code 301
    const computePhase = (res.transactions[1].description as any).computePhase;
    assert.strictEqual(computePhase.exitCode, 301, 'Replay attack must fail with exit code 301');
  });
});
