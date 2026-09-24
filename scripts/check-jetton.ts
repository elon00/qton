import { TonClient } from '@ton/ton';
import { Address } from '@ton/core';
import { QtonMaster } from '../src/contracts/QtonMaster';

async function main() {
    const client = new TonClient({
        endpoint: 'https://toncenter.com/api/v2/jsonRPC',
    });
    const masterAddress = Address.parse('EQAPtVJbQWDFq0ZMILt3aXvYAmOVUv3IDqmiELF8_gdtW7Jh');
    const master = client.open(QtonMaster.createFromAddress(masterAddress));
    
    const data = await master.getJettonData();
    console.log('Total Supply:', data.totalSupply.toString());
    console.log('Mintable:', data.mintable);
    console.log('Admin Address (User):', data.adminAddress.toString({ bounceable: false }));
    console.log('Admin Address (Bounceable):', data.adminAddress.toString({ bounceable: true }));

    const userWalletAddress = await master.getWalletAddress(data.adminAddress);
    console.log('User QTON Jetton Wallet (to receive tokens):', userWalletAddress.toString());
    console.log('User QTON Jetton Wallet (Non-bounceable):', userWalletAddress.toString({ bounceable: false }));
}

main().catch(console.error);
