/**
 * QTON Operational Telemetry — TON Testnet health monitor.
 * Reports only live observations made during this run.
 */

import { Address } from '@ton/core';
import { TonClient } from '@ton/ton';

interface EndpointReport {
  name: string;
  url: string;
  status: 'HEALTHY' | 'DEGRADED';
  latencyMs: number;
  lastBlockSeqno?: number;
  contractState?: string;
  error?: string;
}

const MASTER_ADDRESS =
  process.env.QTON_MASTER_ADDRESS || 'kQCI8yoRda7UzQSOOypvN_trGrzNb4tGmRR9N-S9LOG-wW58';

const ENDPOINTS = (process.env.QTON_RPC_ENDPOINTS || 'https://testnet.toncenter.com/api/v2/jsonRPC')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean)
  .map((url, index) => ({ name: `TON Testnet RPC ${index + 1}`, url }));

async function checkEndpoint(name: string, url: string): Promise<EndpointReport> {
  const start = Date.now();
  try {
    const client = new TonClient({ endpoint: url });
    const masterInfo = await client.getMasterchainInfo();
    const contract = await client.getContractState(Address.parse(MASTER_ADDRESS));
    return {
      name,
      url,
      status: 'HEALTHY',
      latencyMs: Date.now() - start,
      lastBlockSeqno: masterInfo.last.seqno,
      contractState: contract.state,
    };
  } catch (error: any) {
    return {
      name,
      url,
      status: 'DEGRADED',
      latencyMs: Date.now() - start,
      error: error?.message || String(error),
    };
  }
}

async function main() {
  const reports = await Promise.all(ENDPOINTS.map((endpoint) => checkEndpoint(endpoint.name, endpoint.url)));
  const healthy = reports.filter((report) => report.status === 'HEALTHY');
  const activeObservations = healthy.filter((report) => report.contractState === 'active');

  const overallHealth =
    healthy.length === 0
      ? 'CRITICAL'
      : activeObservations.length === healthy.length && healthy.length === reports.length
        ? 'OPTIMAL'
        : 'DEGRADED';

  console.log('QTON TON Testnet operational telemetry');
  console.log('Timestamp:', new Date().toISOString());
  for (const report of reports) {
    console.log(JSON.stringify(report));
  }

  console.log(
    JSON.stringify(
      {
        qtonMaster: MASTER_ADDRESS,
        activeContractObserved: activeObservations.length > 0,
        activeObservations: activeObservations.length,
        healthyEndpoints: healthy.length,
        configuredEndpoints: reports.length,
        overallHealth,
      },
      null,
      2
    )
  );

  if (healthy.length === 0 || activeObservations.length === 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Fatal telemetry monitor error:', error);
  process.exit(1);
});
