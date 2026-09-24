import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { TonClient, WalletContractV4 } from '@ton/ton';
import { Address, Cell, toNano, fromNano, internal, SendMode } from '@ton/core';
import { QtonMaster } from '../src/contracts/QtonMaster';
import { QtonLaunchpad } from '../src/contracts/QtonLaunchpad';
import { buildOnchainMetadata } from '../src/utils/jetton-content';
import { QtonQrEngine } from '../src/utils/qr_generator';
import fs from 'fs';
import path from 'path';

const WALLET_FILE = path.resolve('mainnet-wallet.json');
const DEPLOYMENT_FILE = path.resolve('deployment-mainnet.json');
const RPC_ENDPOINT = process.env.QTON_MAINNET_RPC || 'https://toncenter.com/api/v2/jsonRPC';
const MIN_DEPLOY_BALANCE = toNano('0.25');
const OWNER_ADMIN_ADDRESS = Address.parse(
  process.env.QTON_OWNER_ADDRESS || 'UQAJO_hgYMZq3ULuzFv7927z-WgsM0BApc0IRniDrHORTzm3'
);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 6, baseDelayMs = 3000): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = err?.message || String(err);
      if ((msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('timeout')) && i < maxRetries - 1) {
        const waitTime = baseDelayMs * (i + 1);
        console.log(`⚠️  Rate-limited by Toncenter RPC (429), cooling down for ${waitTime / 1000}s...`);
        await sleep(waitTime);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Exceeded maximum RPC retries');
}

function parseMnemonic(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    const words = Array.isArray(parsed) ? parsed : parsed?.mnemonic;
    if (Array.isArray(words) && words.length >= 12 && words.every((word) => typeof word === 'string')) {
      return words;
    }
  } catch {
    const words = raw.trim().split(/\s+/);
    if (words.length >= 12) return words;
  }
  throw new Error('invalid mnemonic format');
}

async function getWallet(): Promise<{ mnemonic: string[]; keyPair: any; wallet: WalletContractV4 }> {
  let mnemonic: string[];

  const secret = (process.env.MAINNET_WALLET_MNEMONIC || process.env.TON_WALLET_MNEMONIC)?.trim();
  if (secret) {
    mnemonic = parseMnemonic(secret);
  } else if (fs.existsSync(WALLET_FILE)) {
    const data = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
    mnemonic = parseMnemonic(JSON.stringify(data.mnemonic));
  } else {
    // Generate fresh mainnet wallet dedicated to this deployment
    mnemonic = await mnemonicNew(24);
    fs.writeFileSync(
      WALLET_FILE,
      JSON.stringify({
        mnemonic,
        createdAt: new Date().toISOString(),
        network: 'ton-mainnet',
        note: 'Keep this 24-word seed phrase safe and private.'
      }, null, 2),
      { mode: 0o600 }
    );
    console.log('⚡ Generated new TON Mainnet deployer wallet credentials -> mainnet-wallet.json');
  }

  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  return { mnemonic, keyPair, wallet };
}

function writeDeploymentRecord(record: Record<string, unknown>) {
  fs.writeFileSync(DEPLOYMENT_FILE, JSON.stringify(record, null, 2) + '\n');
}

async function main() {
  console.log('=====================================================================');
  console.log('💎 QTON TON MAINNET DEPLOYMENT ENGINE');
  console.log('=====================================================================');
  console.log('🌐 Network: TON Mainnet');
  console.log('🔌 RPC Endpoint:', RPC_ENDPOINT);

  const client = new TonClient({ endpoint: RPC_ENDPOINT });
  const { mnemonic, keyPair, wallet } = await getWallet();

  const deployerBounceable = wallet.address.toString({ testOnly: false, bounceable: true });
  const deployerNonBounceable = wallet.address.toString({ testOnly: false, bounceable: false });
  const deployerRaw = wallet.address.toRawString();

  let balance = 0n;
  let accountState = 'uninitialized';
  try {
    const res = await fetch(`https://toncenter.com/api/v2/getAddressInformation?address=${deployerRaw}`);
    const data = await res.json() as any;
    if (data?.ok && data?.result) {
      balance = BigInt(data.result.balance || 0);
      accountState = data.result.state || 'uninitialized';
    }
  } catch (e: any) {
    try {
      const info = await client.getWalletInformation(wallet.address);
      balance = BigInt(info.balance);
      accountState = info.state;
    } catch {}
  }

  const ownerBounceable = OWNER_ADMIN_ADDRESS.toString({ testOnly: false, bounceable: true });
  const ownerNonBounceable = OWNER_ADMIN_ADDRESS.toString({ testOnly: false, bounceable: false });

  console.log('📍 Deployer Address (Bounceable):    ', deployerBounceable);
  console.log('📍 Deployer Address (Non-Bounceable):', deployerNonBounceable);
  console.log('👑 Permanent Owner / Admin Wallet:   ', ownerNonBounceable);
  console.log('💰 Deployer Mainnet Balance:         ', fromNano(balance), 'TON');
  console.log('📊 On-Chain State:                   ', accountState);
  console.log('🔍 TonScan Explorer (Deployer):      ', 'https://tonscan.org/address/' + deployerBounceable);
  console.log('🔍 TonScan Explorer (Owner Admin):   ', 'https://tonscan.org/address/' + ownerBounceable);

  // Load compiled FunC BOCs
  const masterCode = Cell.fromBase64(fs.readFileSync(path.resolve('build/qton_master.boc.b64'), 'utf8'));
  const walletCode = Cell.fromBase64(fs.readFileSync(path.resolve('build/qton_wallet.boc.b64'), 'utf8'));
  const launchpadCode = Cell.fromBase64(fs.readFileSync(path.resolve('build/qton_launchpad.boc.b64'), 'utf8'));

  const content = buildOnchainMetadata({
    name: 'Quantum TON',
    symbol: 'QTON',
    description: 'Quantum-Secured TON Infrastructure & Autonomous Jetton Launchpad with NIST FIPS 204 ML-DSA-65 Integration',
    decimals: '9',
  });

  const qtonMaster = QtonMaster.createFromConfig(
    {
      totalSupply: 0n,
      adminAddress: OWNER_ADMIN_ADDRESS,
      content,
      walletCode,
    },
    masterCode
  );

  const qtonLaunchpad = QtonLaunchpad.createFromConfig(
    {
      adminAddress: OWNER_ADMIN_ADDRESS,
      totalProjects: 0,
    },
    launchpadCode
  );

  const masterBounceable = qtonMaster.address.toString({ testOnly: false, bounceable: true });
  const masterNonBounceable = qtonMaster.address.toString({ testOnly: false, bounceable: false });
  const launchpadBounceable = qtonLaunchpad.address.toString({ testOnly: false, bounceable: true });
  const launchpadNonBounceable = qtonLaunchpad.address.toString({ testOnly: false, bounceable: false });

  console.log('\n---------------------------------------------------------------------');
  console.log('📦 COMPUTED MAINNET CONTRACT TARGETS:');
  console.log('---------------------------------------------------------------------');
  console.log('🏆 QTON Master Jetton Root:   ', masterBounceable);
  console.log('   Explorer:                  ', 'https://tonscan.org/address/' + masterBounceable);
  console.log('🚀 QTON Decentralized Launchpad:', launchpadBounceable);
  console.log('   Explorer:                  ', 'https://tonscan.org/address/' + launchpadBounceable);
  console.log('---------------------------------------------------------------------\n');

  // Check gas funding
  if (balance < MIN_DEPLOY_BALANCE) {
    const fundingAmount = toNano('0.3');
    const qr = await QtonQrEngine.generateTonTransferQr(
      deployerNonBounceable,
      fundingAmount,
      'Fund QTON Mainnet Deployer'
    );

    fs.writeFileSync(path.resolve('mainnet_wallet_qr.svg'), qr.svgString);

    const baseRecord = {
      network: 'ton-mainnet',
      chainId: -239,
      caip2: 'ton:-239',
      rpcEndpoint: RPC_ENDPOINT,
      status: 'AWAITING_GAS_FUNDING',
      deployer: {
        addressBounceable: deployerBounceable,
        addressNonBounceable: deployerNonBounceable,
        raw: deployerRaw,
        currentBalanceTon: fromNano(balance),
        requiredMinTon: fromNano(MIN_DEPLOY_BALANCE),
        recommendedFundTon: '0.3',
      },
      ownerAdmin: {
        addressBounceable: ownerBounceable,
        addressNonBounceable: ownerNonBounceable,
        role: 'Permanent Contract Admin & Unlimited Mint Authority'
      },
      contracts: {
        qtonMaster: {
          predictedAddressBounceable: masterBounceable,
          predictedAddressNonBounceable: masterNonBounceable,
          name: 'Quantum TON (QTON)',
          symbol: 'QTON',
          supplyModel: 'UNLIMITED_MINTABLE',
          explorer: 'https://tonscan.org/address/' + masterBounceable,
          tonviewer: 'https://tonviewer.com/' + masterBounceable,
        },
        qtonLaunchpad: {
          predictedAddressBounceable: launchpadBounceable,
          predictedAddressNonBounceable: launchpadNonBounceable,
          name: 'QTON Decentralized Launchpad',
          explorer: 'https://tonscan.org/address/' + launchpadBounceable,
          tonviewer: 'https://tonviewer.com/' + launchpadBounceable,
        },
      },
      paymentDeepLink: qr.rawUrl,
      updatedAt: new Date().toISOString(),
    };

    writeDeploymentRecord(baseRecord);

    console.log('⚠️  INSUFFICIENT MAINNET TON FOR CONTRACT BROADCAST');
    console.log(`Current Balance: ${fromNano(balance)} TON | Required: at least ${fromNano(MIN_DEPLOY_BALANCE)} TON (~$1.30 USD)`);
    console.log('\n📲 SCAN QR OR SEND 0.3 TON TO DEPLOYER VIA TONKEEPER / TELEGRAM WALLET:');
    console.log(qr.asciiTerminal);
    console.log(`\nAddress to fund: ${deployerNonBounceable}`);
    console.log(`Deep Link:       ${qr.rawUrl}`);
    console.log('💾 QR SVG saved to: mainnet_wallet_qr.svg');
    console.log('📋 Deployment targets recorded in: deployment-mainnet.json');
    console.log('\n👉 Send ~0.3 TON to the address above, then re-run `npm run deploy:mainnet` to complete instant on-chain broadcast!\n');
    return;
  }

  // Balance is sufficient: execute on-chain deployment
  console.log('🚀 Funding confirmed! Cooling down 3s for RPC gateway...');
  await sleep(3000);

  const walletContract = client.open(wallet);
  const seqno = await retryWithBackoff(() => walletContract.getSeqno());
  console.log('Current seqno:', seqno);

  await sleep(2500);

  console.log('Broadcasting QTON Master and Launchpad initialization...');
  await retryWithBackoff(() =>
    walletContract.sendTransfer({
      secretKey: keyPair.secretKey,
      seqno,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      messages: [
        internal({
          to: qtonMaster.address,
          value: toNano('0.08'),
          init: qtonMaster.init,
          bounce: false,
          body: Cell.EMPTY,
        }),
        internal({
          to: qtonLaunchpad.address,
          value: toNano('0.08'),
          init: qtonLaunchpad.init,
          bounce: false,
          body: Cell.EMPTY,
        }),
      ],
    })
  );

  console.log('📡 Deployment transaction broadcasted with seqno:', seqno);

  const broadcastRecord = {
    network: 'ton-mainnet',
    chainId: -239,
    caip2: 'ton:-239',
    rpcEndpoint: RPC_ENDPOINT,
    status: 'BROADCAST_PENDING_CONFIRMATION',
    deployer: deployerBounceable,
    contracts: {
      qtonMaster: {
        address: masterBounceable,
        explorer: 'https://tonscan.org/address/' + masterBounceable,
        tonviewer: 'https://tonviewer.com/' + masterBounceable,
      },
      qtonLaunchpad: {
        address: launchpadBounceable,
        explorer: 'https://tonscan.org/address/' + launchpadBounceable,
        tonviewer: 'https://tonviewer.com/' + launchpadBounceable,
      },
    },
    broadcastAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeDeploymentRecord(broadcastRecord);

  // Poll for on-chain confirmation
  for (let attempt = 1; attempt <= 15; attempt++) {
    await sleep(6000);
    const currentSeqno = await retryWithBackoff(() => walletContract.getSeqno()).catch(() => seqno);
    await sleep(2000);
    const masterState = await retryWithBackoff(() => client.getContractState(qtonMaster.address)).catch(() => null);
    await sleep(2000);
    const launchpadState = await retryWithBackoff(() => client.getContractState(qtonLaunchpad.address)).catch(() => null);

    if (currentSeqno > seqno && masterState?.state === 'active' && launchpadState?.state === 'active') {
      const confirmedRecord = {
        ...broadcastRecord,
        status: 'CONFIRMED_ACTIVE_ON_MAINNET',
        confirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      writeDeploymentRecord(confirmedRecord);
      console.log('🎉 SUCCESS: Both QTON contracts confirmed LIVE and ACTIVE on TON Mainnet!');
      console.log('Explorer QTON Master:   ', 'https://tonscan.org/address/' + masterBounceable);
      console.log('Explorer QTON Launchpad:', 'https://tonscan.org/address/' + launchpadBounceable);
      return;
    }
    console.log(`Polling for TON Mainnet block inclusion (${attempt}/15)...`);
  }

  console.log('⏳ Broadcast sent, waiting for network finality. Review explorer links in deployment-mainnet.json.');
}

main().catch((error) => {
  console.error('Deployment error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
