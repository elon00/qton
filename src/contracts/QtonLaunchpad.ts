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

export type QtonLaunchpadConfig = {
    adminAddress: Address;
    totalProjects: number;
    projectsDict?: Cell;
};

export function qtonLaunchpadConfigToCell(config: QtonLaunchpadConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeUint(config.totalProjects, 32)
        .storeDict(config.projectsDict)
        .endCell();
}

export class QtonLaunchpad implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new QtonLaunchpad(address);
    }

    static createFromConfig(config: QtonLaunchpadConfig, code: Cell, workchain = 0) {
        const data = qtonLaunchpadConfigToCell(config);
        const init = { code, data };
        return new QtonLaunchpad(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendCreateProject(
        provider: ContractProvider,
        via: Sender,
        opts: {
            nameHash: bigint;
            initialReserve: bigint;
            queryId?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.initialReserve + toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(100, 32) // op::create_project
                .storeUint(opts.queryId ?? 0, 64)
                .storeUint(opts.nameHash, 256)
                .endCell(),
        });
    }

    async getTotalProjects(provider: ContractProvider): Promise<number> {
        const res = await provider.get('get_total_projects', []);
        return res.stack.readNumber();
    }
}
