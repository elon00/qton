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

export interface QtonPqcGatewayConfig {
  pqcOperatorKey: bigint;
  lastSeqno: bigint;
  stateRootHash: bigint;
  timelockAddress: Address;
}

export function qtonPqcGatewayConfigToCell(config: QtonPqcGatewayConfig): Cell {
  return beginCell()
    .storeUint(config.pqcOperatorKey, 256)
    .storeUint(config.lastSeqno, 64)
    .storeUint(config.stateRootHash, 256)
    .storeAddress(config.timelockAddress)
    .endCell();
}

export class QtonPqcGatewayContract implements Contract {
  constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

  static createFromAddress(address: Address) {
    return new QtonPqcGatewayContract(address);
  }

  static createFromConfig(config: QtonPqcGatewayConfig, code: Cell, workchain = 0) {
    const data = qtonPqcGatewayConfigToCell(config);
    const init = { code, data };
    return new QtonPqcGatewayContract(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendAttestation(
    provider: ContractProvider,
    via: Sender,
    opts: {
      queryId: bigint;
      seqno: bigint;
      expiry: number;
      actionHash: bigint;
      pqcCommitment: bigint;
      operatorPubkey: bigint;
      operatorSig: Buffer;
      payload: Cell;
    }
  ) {
    const operatorRef = beginCell()
      .storeUint(opts.operatorPubkey, 256)
      .storeBuffer(opts.operatorSig)
      .endCell();

    const body = beginCell()
      .storeUint(0x4a91b2c4, 32)
      .storeUint(opts.queryId, 64)
      .storeUint(opts.seqno, 64)
      .storeUint(opts.expiry, 32)
      .storeUint(opts.actionHash, 256)
      .storeUint(opts.pqcCommitment, 256)
      .storeRef(operatorRef)
      .storeRef(opts.payload)
      .endCell();

    return await provider.internal(via, {
      value: toNano('0.1'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body,
    });
  }

  async getPqcGatewayData(provider: ContractProvider) {
    const res = await provider.get('get_pqc_gateway_data', []);
    const pqcOperatorKey = res.stack.readBigNumber();
    const lastSeqno = res.stack.readBigNumber();
    const stateRootHash = res.stack.readBigNumber();
    const timelockAddress = res.stack.readAddress();
    return { pqcOperatorKey, lastSeqno, stateRootHash, timelockAddress };
  }
}
