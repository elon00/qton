import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano
} from '@ton/core';

export type QtonMasterConfig = {
    totalSupply: bigint;
    adminAddress: Address;
    content: Cell;
    walletCode: Cell;
};

export function qtonMasterConfigToCell(config: QtonMasterConfig): Cell {
    return beginCell()
        .storeCoins(config.totalSupply)
        .storeAddress(config.adminAddress)
        .storeRef(config.content)
        .storeRef(config.walletCode)
        .endCell();
}

export class QtonMaster implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new QtonMaster(address);
    }

    static createFromConfig(config: QtonMasterConfig, code: Cell, workchain = 0) {
        const data = qtonMasterConfigToCell(config);
        const init = { code, data };
        return new QtonMaster(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMint(
        provider: ContractProvider,
        via: Sender,
        opts: {
            toAddress: Address;
            jettonAmount: bigint;
            forwardTonAmount: bigint;
            totalTonAmount: bigint;
            queryId?: number;
        }
    ) {
        const masterMsg = beginCell()
            .storeUint(0x178d4519, 32) // op::internal_transfer
            .storeUint(opts.queryId ?? 0, 64)
            .storeCoins(opts.jettonAmount)
            .storeAddress(this.address)
            .storeAddress(via.address ?? this.address)
            .storeCoins(opts.forwardTonAmount)
            .storeUint(0, 1) // forward payload (empty)
            .endCell();

        await provider.internal(via, {
            value: opts.totalTonAmount,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(21, 32) // op::mint
                .storeUint(opts.queryId ?? 0, 64)
                .storeAddress(opts.toAddress)
                .storeCoins(opts.totalTonAmount - toNano('0.05'))
                .storeRef(masterMsg)
                .endCell(),
        });
    }

    async getJettonData(provider: ContractProvider) {
        const res = await provider.get('get_jetton_data', []);
        const totalSupply = res.stack.readBigNumber();
        const mintable = res.stack.readNumber();
        const adminAddress = res.stack.readAddress();
        const content = res.stack.readCell();
        const walletCode = res.stack.readCell();
        return {
            totalSupply,
            mintable: mintable === -1, // -1 is true in TVM
            adminAddress,
            content,
            walletCode,
        };
    }

    async getWalletAddress(provider: ContractProvider, ownerAddress: Address): Promise<Address> {
        const res = await provider.get('get_wallet_address', [
            { type: 'slice', cell: beginCell().storeAddress(ownerAddress).endCell() }
        ]);
        return res.stack.readAddress();
    }
}
