import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { TonClient, WalletContractV4 } from '@ton/ton';
import { Cell, toNano, fromNano, internal, SendMode } from '@ton/core';
import { QtonMaster } from '../src/contracts/QtonMaster';
import { QtonLaunchpad } from '../src/contracts/QtonLaunchpad';
import { buildOnchainMetadata } from '../src/utils/jetton-content';
import { QtonQrEngine } from '../src/utils/qr_generator';
import fs from 'fs';
import path from 'path';

const WALLET_FILE = path.resolve('testnet-wallet.json');
const DEPLOYMENT_FILE = path.resolve('deployment-testnet.json');
const RPC_ENDPOINT = process.env.QTON_TESTNET_RPC || 'https://testnet.toncenter.com/api/v2/jsonRPC';
const MIN_DEPLOY_BALANCE = toNano('0.25');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function getWallet() {
  let mnemonic: string[];

  const secret = process.env.TESTNET_WALLET_MNEMONIC?.trim();
  if (secret) {
    mnemonic = parseMnemonic(secret);
  } else if (process.env.QTON_ALLOW_LOCAL_WALLET_FILE === 'true' && fs.existsSync(WALLET_FILE)) {
    const data = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
    mnemonic = parseMnemonic(JSON.stringify(data.mnemonic));
  } else if (process.env.QTON_ALLOW_LOCAL_WALLET_GENERATION === 'true') {
    mnemonic = await mnemonicNew(24);
    fs.writeFileSync(
      WALLET_FILE,
      JSON.stringify({ mnemonic, createdAt: new Date().toISOString(), testnetOnly: true }, null, 2),
      { mode: 0o600 }
    );
    console.log('Created a local testnet-only wallet file with mode 0600.');
  } else {
    throw new Error(
      'TESTNET_WALLET_MNEMONIC is required. Local wallet file/generation is disabled unless explicitly opted in.'
    );
  }

  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  return { keyPair, wallet };
}

function writeDeploymentRecord(record: Record<string, unknown>) {
  fs.writeFileSync(DEPLOYMENT_FILE, JSON.stringify(record, null, 2) + '\n');
}

async function main() {
  console.log('QTON TON Testnet deployment tool');
  console.log('RPC:', RPC_ENDPOINT);

  const client = new TonClient({ endpoint: RPC_ENDPOINT });
  const { keyPair, wallet } = await getWallet();
  const deployerAddress = wallet.address.toString({ testOnly: true });

  const info = await client.getWalletInformation(wallet.address);
  const balance = BigInt(info.balance);
  console.log('Deployer:', deployerAddress);
  console.log('Testnet balance:', fromNano(balance), 'TON');

  const masterCode = Cell.fromBase64(fs.readFileSync(path.resolve('build/qton_master.boc.b64'), 'utf8'));
  const walletCode = Cell.fromBase64(fs.readFileSync(path.resolve('build/qton_wallet.boc.b64'), 'utf8'));
  const launchpadCode = Cell.fromBase64(fs.readFileSync(path.resolve('build/qton_launchpad.boc.b64'), 'utf8'));

  const content = buildOnchainMetadata({
    name: 'Quantum TON',
    symbol: 'QTON',
    description: 'QTON research/testnet Jetton. Application-layer ML-DSA-65 experiments do not imply whole-system FIPS validation.',
    decimals: '9',
  });

  const qtonMaster = QtonMaster.createFromConfig(
    {
      totalSupply: 0n,
      adminAddress: wallet.address,
      content,
      walletCode,
    },
    masterCode
  );

  const qtonLaunchpad = QtonLaunchpad.createFromConfig(
    {
      adminAddress: wallet.address,
      totalProjects: 0,
    },
    launchpadCode
  );

  const masterAddress = qtonMaster.address.toString({ testOnly: true });
  const launchpadAddress = qtonLaunchpad.address.toString({ testOnly: true });

  const baseRecord = {
    network: 'ton-testnet',
    rpcEndpoint: RPC_ENDPOINT,
    deployer: deployerAddress,
    status: 'ADDRESSES_COMPUTED_NOT_BROADCAST',
    contracts: {
      qtonMaster: {
        address: masterAddress,
        explorer: 'https://testnet.tonscan.org/address/' + masterAddress,
        tonviewer: 'https://testnet.tonviewer.com/' + masterAddress,
      },
      qtonLaunchpad: {
        address: launchpadAddress,
        explorer: 'https://testnet.tonscan.org/address/' + launchpadAddress,
        tonviewer: 'https://testnet.tonviewer.com/' + launchpadAddress,
      },
    },
    updatedAt: new Date().toISOString(),
  };
  writeDeploymentRecord(baseRecord);

  console.log('Computed QTON Master:', masterAddress);
  console.log('Computed QTON Launchpad:', launchpadAddress);

  if (process.env.QTON_ENABLE_TESTNET_DEPLOY !== 'true') {
    console.log('Deployment broadcast disabled. Set QTON_ENABLE_TESTNET_DEPLOY=true to explicitly authorize testnet deployment.');
    return;
  }

  if (balance < MIN_DEPLOY_BALANCE) {
    console.log('Insufficient testnet TON. Required at least', fromNano(MIN_DEPLOY_BALANCE), 'TON.');
    const qr = await QtonQrEngine.generateTonTransferQr(deployerAddress, toNano('1.0'), 'Fund QTON testnet deployer');
    console.log(qr.asciiTerminal);
    throw new Error('insufficient testnet balance for two contract deployments plus gas');
  }

  const walletContract = client.open(wallet);
  const seqno = await walletContract.getSeqno();

  await walletContract.sendTransfer({
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
  });

  writeDeploymentRecord({
    ...baseRecord,
    status: 'BROADCAST_NOT_CONFIRMED',
    broadcastAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  for (let attempt = 1; attempt <= 12; attempt++) {
    await sleep(5000);
    const currentSeqno = await walletContract.getSeqno().catch(() => seqno);
    const [masterState, launchpadState] = await Promise.all([
      client.getContractState(qtonMaster.address).catch(() => null),
      client.getContractState(qtonLaunchpad.address).catch(() => null),
    ]);

    if (currentSeqno > seqno && masterState?.state === 'active' && launchpadState?.state === 'active') {
      writeDeploymentRecord({
        ...baseRecord,
        status: 'CONFIRMED_ACTIVE_ON_TESTNET',
        confirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log('Both contracts confirmed active on TON Testnet.');
      return;
    }
    console.log(`Waiting for deployment confirmation (${attempt}/12)...`);
  }

  throw new Error('deployment broadcast was not confirmed active within the polling window');
}

main().catch((error) => {
  console.error('Deployment failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
