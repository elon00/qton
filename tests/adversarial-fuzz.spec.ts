/**
 * QTON Adversarial & Invariant Fuzz Testing Suite
 * Validates fail-closed behavior across TVM state boundaries, cryptographic tampering, and boundary conditions.
 */

import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell } from '@ton/core';
import { keyPairFromSeed, sign } from '@ton/crypto';
import { QtonPqcGatewayContract } from '../src/contracts/QtonPqcGateway.js';
import { QtonTimelock } from '../src/contracts/QtonTimelock.js';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, before } from 'node:test';

describe('QTON TVM Invariant & Adversarial Fuzz Suite', () => {
  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let attacker: SandboxContract<TreasuryContract>;
  let dummyMaster: SandboxContract<TreasuryContract>;
  let gatewayContract: SandboxContract<QtonPqcGatewayContract>;
  let timelockContract: SandboxContract<QtonTimelock>;

  const operatorKp = keyPairFromSeed(Buffer.alloc(32, 42));
  const operatorPk = BigInt('0x' + operatorKp.publicKey.toString('hex'));

  const admin1Kp = keyPairFromSeed(Buffer.alloc(32, 101));
  const pk1 = BigInt('0x' + admin1Kp.publicKey.toString('hex'));
  const admin2Kp = keyPairFromSeed(Buffer.alloc(32, 102));
  const pk2 = BigInt('0x' + admin2Kp.publicKey.toString('hex'));
  const admin3Kp = keyPairFromSeed(Buffer.alloc(32, 103));
  const pk3 = BigInt('0x' + admin3Kp.publicKey.toString('hex'));

  before(async () => {
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');
    attacker = await blockchain.treasury('attacker');
    dummyMaster = await blockchain.treasury('dummy_master');

    const gatewayBoc = Cell.fromBase64(fs.readFileSync(path.resolve('build/qton_pqc_gateway.boc.b64'), 'utf8'));
    const timelockBoc = Cell.fromBase64(fs.readFileSync(path.resolve('build/qton_timelock.boc.b64'), 'utf8'));

    timelockContract = blockchain.openContract(
      QtonTimelock.createFromConfig(
        {
          admin1: pk1,
          admin2: pk2,
          admin3: pk3,
          delay: 3600,
          isPaused: 0,
          targetMaster: dummyMaster.address,
        },
        timelockBoc
      )
    );
    await timelockContract.sendDeploy(deployer.getSender(), toNano('1.0'));

    gatewayContract = blockchain.openContract(
      QtonPqcGatewayContract.createFromConfig(
        {
          pqcOperatorKey: operatorPk,
          lastSeqno: 0n,
          stateRootHash: 0n,
          timelockAddress: timelockContract.address,
        },
        gatewayBoc
      )
    );
    await gatewayContract.sendDeploy(deployer.getSender(), toNano('1.0'));
  });

  it('Fuzz Vector 1: Reject tampered cryptographic signature in PQC attestation', async () => {
    const seqno = 1n;
    const expiry = Math.floor(Date.now() / 1000) + 1200;
    const payload = beginCell().storeUint(0xcafe, 16).endCell();
    const actionHash = BigInt('0x' + payload.hash().toString('hex'));
    const pqcCommitment = 0x1122334455667788n;

    const attestCell = beginCell()
      .storeUint(0x4a91b2c4, 32)
      .storeUint(seqno, 64)
      .storeUint(expiry, 32)
      .storeUint(actionHash, 256)
      .storeUint(pqcCommitment, 256)
      .storeAddress(gatewayContract.address)
      .endCell();

    const rogueKp = keyPairFromSeed(Buffer.alloc(32, 99));
    const rogueSig = sign(attestCell.hash(), rogueKp.secretKey);

    const res = await gatewayContract.sendAttestation(attacker.getSender(), {
      queryId: 901n,
      seqno,
      expiry,
      actionHash,
      pqcCommitment,
      operatorPubkey: operatorPk,
      operatorSig: rogueSig,
      payload,
    });

    assert(res.transactions.some(tx => tx.description.type === 'generic' && tx.description.computePhase.type === 'vm' && tx.description.computePhase.exitCode !== 0));
  });

  it('Fuzz Vector 2: Reject expired timestamp attestation', async () => {
    const seqno = 1n;
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 300;
    const payload = beginCell().storeUint(0xbeef, 16).endCell();
    const actionHash = BigInt('0x' + payload.hash().toString('hex'));
    const pqcCommitment = 0x9988776655443322n;

    const attestCell = beginCell()
      .storeUint(0x4a91b2c4, 32)
      .storeUint(seqno, 64)
      .storeUint(expiredTimestamp, 32)
      .storeUint(actionHash, 256)
      .storeUint(pqcCommitment, 256)
      .storeAddress(gatewayContract.address)
      .endCell();

    const validSig = sign(attestCell.hash(), operatorKp.secretKey);

    const res = await gatewayContract.sendAttestation(deployer.getSender(), {
      queryId: 902n,
      seqno,
      expiry: expiredTimestamp,
      actionHash,
      pqcCommitment,
      operatorPubkey: operatorPk,
      operatorSig: validSig,
      payload,
    });

    assert(res.transactions.some(tx => tx.description.type === 'generic' && tx.description.computePhase.type === 'vm' && tx.description.computePhase.exitCode === 302));
  });

  it('Fuzz Vector 3: Reject replay attack of existing seqno', async () => {
    const seqno = 1n;
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const payload = beginCell().storeUint(0x01, 8).endCell();
    const actionHash = BigInt('0x' + payload.hash().toString('hex'));
    const pqcCommitment = 0x12345678n;

    const attestCell = beginCell()
      .storeUint(0x4a91b2c4, 32)
      .storeUint(seqno, 64)
      .storeUint(expiry, 32)
      .storeUint(actionHash, 256)
      .storeUint(pqcCommitment, 256)
      .storeAddress(gatewayContract.address)
      .endCell();

    const validSig = sign(attestCell.hash(), operatorKp.secretKey);

    // Legitimate first execution
    const res1 = await gatewayContract.sendAttestation(deployer.getSender(), {
      queryId: 903n,
      seqno,
      expiry,
      actionHash,
      pqcCommitment,
      operatorPubkey: operatorPk,
      operatorSig: validSig,
      payload,
    });
    assert.strictEqual(res1.transactions.length > 0, true);

    // Replay attack with same seqno 1 must fail with exit code 301
    const res2 = await gatewayContract.sendAttestation(attacker.getSender(), {
      queryId: 904n,
      seqno,
      expiry,
      actionHash,
      pqcCommitment,
      operatorPubkey: operatorPk,
      operatorSig: validSig,
      payload,
    });
    assert(res2.transactions.some(tx => tx.description.type === 'generic' && tx.description.computePhase.type === 'vm' && tx.description.computePhase.exitCode === 301));
  });

  it('Fuzz Vector 4: Unauthorized attacker cannot unpause Timelock governance', async () => {
    const queryId = 888n;
    const pauseOp = 0x5c723f51;

    const dataToSign = beginCell()
      .storeUint(pauseOp, 32)
      .storeUint(queryId, 64)
      .storeAddress(timelockContract.address)
      .endCell();
    const pauseSig = sign(dataToSign.hash(), admin1Kp.secretKey);

    await timelockContract.sendEmergencyPause(deployer.getSender(), {
      queryId,
      signerPubkey: pk1,
      signature: pauseSig,
    });

    const pausedData = await timelockContract.getTimelockData();
    assert.strictEqual(pausedData.isPaused, 1);

    const rogue1 = keyPairFromSeed(Buffer.alloc(32, 88));
    const rogue1Pk = BigInt('0x' + rogue1.publicKey.toString('hex'));
    const rogue2 = keyPairFromSeed(Buffer.alloc(32, 89));
    const rogue2Pk = BigInt('0x' + rogue2.publicKey.toString('hex'));
    const unpauseOp = 0x6d942e12;
    const unpauseCell = beginCell()
      .storeUint(unpauseOp, 32)
      .storeUint(889n, 64)
      .storeAddress(timelockContract.address)
      .endCell();
    const sig1 = sign(unpauseCell.hash(), rogue1.secretKey);
    const sig2 = sign(unpauseCell.hash(), rogue2.secretKey);

    await timelockContract.sendUnpause(attacker.getSender(), {
      queryId: 889n,
      signer1Pubkey: rogue1Pk,
      sig1,
      signer2Pubkey: rogue2Pk,
      sig2,
    });

    const afterData = await timelockContract.getTimelockData();
    assert.strictEqual(afterData.isPaused, 1, 'Contract must remain paused when attacker signs');
  });

  it('Fuzz Vector 5: Legitimate 2-of-3 unpause restores active operations', async () => {
    const queryId = 890n;
    const unpauseOp = 0x6d942e12;
    const dataToSign = beginCell()
      .storeUint(unpauseOp, 32)
      .storeUint(queryId, 64)
      .storeAddress(timelockContract.address)
      .endCell();

    const sig1 = sign(dataToSign.hash(), admin1Kp.secretKey);
    const sig2 = sign(dataToSign.hash(), admin2Kp.secretKey);

    await timelockContract.sendUnpause(deployer.getSender(), {
      queryId,
      signer1Pubkey: pk1,
      sig1,
      signer2Pubkey: pk2,
      sig2,
    });

    const data = await timelockContract.getTimelockData();
    assert.strictEqual(data.isPaused, 0, 'Contract must be UNPAUSED after 2-of-3 consensus');
  });
});
