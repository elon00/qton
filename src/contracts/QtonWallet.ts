import {
    Address,
    beginCell,
    Cell,
    Contract,
    ContractProvider,
    Sender,
    SendMode,
    toNano
} from '@ton/core';

export class QtonWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new QtonWallet(address);
    }

    async sendTransfer(
        provider: ContractProvider,
        via: Sender,
        opts: {
            toAddress: Address;
            jettonAmount: bigint;
            forwardTonAmount: bigint;
            totalTonAmount: bigint;
            responseAddress?: Address;
            queryId?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.totalTonAmount,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0xf8a7ea5, 32) // op::transfer
                .storeUint(opts.queryId ?? 0, 64)
                .storeCoins(opts.jettonAmount)
                .storeAddress(opts.toAddress)
                .storeAddress(opts.responseAddress ?? via.address ?? this.address)
                .storeUint(0, 1) // custom payload empty
                .storeCoins(opts.forwardTonAmount)
                .storeUint(0, 1) // forward payload empty
                .endCell(),
        });
    }

    async getWalletData(provider: ContractProvider) {
        const res = await provider.get('get_wallet_data', []);
        const balance = res.stack.readBigNumber();
        const ownerAddress = res.stack.readAddress();
        const jettonMasterAddress = res.stack.readAddress();
        const jettonWalletCode = res.stack.readCell();
        return {
            balance,
            ownerAddress,
            jettonMasterAddress,
            jettonWalletCode,
        };
    }
}
