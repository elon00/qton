/**
 * QTON Production Governance Tests — Timelock & 2-of-3 Multisig Controller
 * Standard: 48-Hour Delay Window, Multisig Quorum, Emergency Circuit Breaker
 */

import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell } from '@ton/core';
import { keyPairFromSeed, sign } from '@ton/crypto';
import { QtonTimelock } from '../src/contracts/QtonTimelock.js';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, before } from 'node:test';

describe('QTON Production Governance: Timelock & 2-of-3 Multisig Tests', () => {
  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let dummyMaster: SandboxContract<TreasuryContract>;
  let timelockCode: Cell;
  let timelockContract: SandboxContract<QtonTimelock>;

  // 3 Admin Keypairs
  const kp1 = keyPairFromSeed(Buffer.alloc(32, 1));
  const kp2 = keyPairFromSeed(Buffer.alloc(32, 2));
  const kp3 = keyPairFromSeed(Buffer.alloc(32, 3));

  const pk1 = BigInt('0x' + kp1.publicKey.toString('hex'));
  const pk2 = BigInt('0x' + kp2.publicKey.toString('hex'));
  const pk3 = BigInt('0x' + kp3.publicKey.toString('hex'));

  const delaySeconds = 60; // 60s for testing

  before(async () => {
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');
    dummyMaster = await blockchain.treasury('dummy_master');

    const bocStr = fs.readFileSync(path.resolve('build/qton_timelock.boc.b64'), 'utf8');
    timelockCode = Cell.fromBase64(bocStr);

    timelockContract = blockchain.openContract(
      QtonTimelock.createFromConfig(
        {
          admin1: pk1,
          admin2: pk2,
          admin3: pk3,
          delay: delaySeconds,
          isPaused: 0,
          targetMaster: dummyMaster.address,
        },
        timelockCode
      )
    );

    await timelockContract.sendDeploy(deployer.getSender(), toNano('1.0'));
  });

  it('Invariant 1: should deploy Timelock with 3 authorized admin public keys', async () => {
    const data = await timelockContract.getTimelockData();
    assert.strictEqual(data.delay, delaySeconds, 'Delay must match');
    assert.strictEqual(data.isPaused, 0, 'Initial state must be unpaused');
    assert.strictEqual(data.a1, pk1, 'Admin 1 key must match');
    assert.strictEqual(data.a2, pk2, 'Admin 2 key must match');
    assert.strictEqual(data.a3, pk3, 'Admin 3 key must match');
  });

  it('Invariant 2: emergency pause should trigger instantly on 1-of-3 signature', async () => {
    const queryId = 101n;
    const pauseOp = 0x5c723f51;

    const dataToSign = beginCell()
      .storeUint(pauseOp, 32)
      .storeUint(queryId, 64)
      .storeAddress(timelockContract.address)
      .endCell();
    const signature = sign(dataToSign.hash(), kp1.secretKey);

    await timelockContract.sendEmergencyPause(deployer.getSender(), {
      queryId,
      signerPubkey: pk1,
      signature,
    });

    const data = await timelockContract.getTimelockData();
    assert.strictEqual(data.isPaused, 1, 'Contract must be in EMERGENCY PAUSED state');
  });

  it('Invariant 3: unpause requires 2-of-3 multisig signatures', async () => {
    const queryId = 102n;
    const unpauseOp = 0x6d942e12;

    const dataToSign = beginCell()
      .storeUint(unpauseOp, 32)
      .storeUint(queryId, 64)
      .storeAddress(timelockContract.address)
      .endCell();

    const sig1 = sign(dataToSign.hash(), kp1.secretKey);
    const sig2 = sign(dataToSign.hash(), kp2.secretKey);

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

  it('Invariant 4: propose action and verify timelock delay requirement', async () => {
    const proposalId = 1n;
    const actionOp = 21; // op::mint
    const proposeOp = 0x2b8109ad;
    const payload = beginCell().storeUint(999, 32).endCell();

    const dataToSign = beginCell()
      .storeUint(proposeOp, 32)
      .storeUint(proposalId, 64)
      .storeUint(actionOp, 32)
      .storeUint(BigInt('0x' + payload.hash().toString('hex')), 256)
      .endCell();

    const signature = sign(dataToSign.hash(), kp1.secretKey);

    await timelockContract.sendPropose(deployer.getSender(), {
      queryId: 103n,
      proposerPubkey: pk1,
      signature,
      proposalId,
      actionOp,
      payload,
    });

    const status = await timelockContract.getProposalStatus(proposalId);
    assert.strictEqual(status.actionOp, actionOp, 'Stored op must match');
    assert.strictEqual(status.mask, 1, 'Initial approval mask must have bit 0 set (admin 1)');
    assert.strictEqual(status.executed, 0, 'Executed must be 0');
    assert.strictEqual(status.eta > 0, true, 'ETA must be set in the future');
  });
});
