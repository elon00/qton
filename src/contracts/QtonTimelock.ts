import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  toNano,
} from '@ton/core';

export interface QtonTimelockConfig {
  admin1: bigint;
  admin2: bigint;
  admin3: bigint;
  delay: number;
  isPaused: number;
  targetMaster: Address;
  proposalsDict?: Cell;
}

export function qtonTimelockConfigToCell(config: QtonTimelockConfig): Cell {
  const adminsRef = beginCell()
    .storeUint(config.admin2, 256)
    .storeUint(config.admin3, 256)
    .endCell();

  return beginCell()
    .storeUint(config.admin1, 256)
    .storeUint(config.delay, 32)
    .storeUint(config.isPaused, 1)
    .storeAddress(config.targetMaster)
    .storeRef(adminsRef)
    .storeDict(config.proposalsDict || null)
    .endCell();
}

export class QtonTimelock implements Contract {
  constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

  static createFromAddress(address: Address) {
    return new QtonTimelock(address);
  }

  static createFromConfig(config: QtonTimelockConfig, code: Cell, workchain = 0) {
    const data = qtonTimelockConfigToCell(config);
    const init = { code, data };
    return new QtonTimelock(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendEmergencyPause(
    provider: ContractProvider,
    via: Sender,
    opts: {
      queryId: bigint;
      signerPubkey: bigint;
      signature: Buffer;
    }
  ) {
    const body = beginCell()
      .storeUint(0x5c723f51, 32)
      .storeUint(opts.queryId, 64)
      .storeUint(opts.signerPubkey, 256)
      .storeBuffer(opts.signature)
      .endCell();

    return await provider.internal(via, {
      value: toNano('0.1'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body,
    });
  }

  async sendUnpause(
    provider: ContractProvider,
    via: Sender,
    opts: {
      queryId: bigint;
      signer1Pubkey: bigint;
      sig1: Buffer;
      signer2Pubkey: bigint;
      sig2: Buffer;
    }
  ) {
    const sig2Ref = beginCell()
      .storeUint(opts.signer2Pubkey, 256)
      .storeBuffer(opts.sig2)
      .endCell();

    const body = beginCell()
      .storeUint(0x6d942e12, 32)
      .storeUint(opts.queryId, 64)
      .storeUint(opts.signer1Pubkey, 256)
      .storeBuffer(opts.sig1)
      .storeRef(sig2Ref)
      .endCell();

    return await provider.internal(via, {
      value: toNano('0.1'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body,
    });
  }

  async sendPropose(
    provider: ContractProvider,
    via: Sender,
    opts: {
      queryId: bigint;
      proposerPubkey: bigint;
      signature: Buffer;
      proposalId: bigint;
      actionOp: number;
      payload: Cell;
    }
  ) {
    const body = beginCell()
      .storeUint(0x2b8109ad, 32)
      .storeUint(opts.queryId, 64)
      .storeUint(opts.proposerPubkey, 256)
      .storeBuffer(opts.signature)
      .storeUint(opts.proposalId, 64)
      .storeUint(opts.actionOp, 32)
      .storeRef(opts.payload)
      .endCell();

    return await provider.internal(via, {
      value: toNano('0.1'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body,
    });
  }

  async getTimelockData(provider: ContractProvider) {
    const res = await provider.get('get_timelock_data', []);
    const delay = res.stack.readNumber();
    const isPaused = res.stack.readNumber();
    const targetMaster = res.stack.readAddress();
    const a1 = res.stack.readBigNumber();
    const a2 = res.stack.readBigNumber();
    const a3 = res.stack.readBigNumber();
    return { delay, isPaused, targetMaster, a1, a2, a3 };
  }

  async getProposalStatus(provider: ContractProvider, proposalId: bigint) {
    const res = await provider.get('get_proposal_status', [
      { type: 'int', value: proposalId },
    ]);
    const actionOp = res.stack.readNumber();
    const eta = res.stack.readNumber();
    const mask = res.stack.readNumber();
    const executed = res.stack.readNumber();
    return { actionOp, eta, mask, executed };
  }
}
