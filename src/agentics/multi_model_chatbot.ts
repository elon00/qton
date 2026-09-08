import { ConwayAutomatonAI } from '../automaton/conway_ai';
import { QtonPqcGateway } from '../qton_pqc_gateway';
import { QtonQrEngine } from '../utils/qr_generator';

export type ModelProvider = 'gemini' | 'claude' | 'openai' | 'local';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatbotResponse {
    provider: ModelProvider;
    reply: string;
    toolCallsExecuted?: Array<{ name: string; output: any }>;
}

export class QtonAgenticChatbot {
    private activeProvider: ModelProvider;
    private automaton: ConwayAutomatonAI;
    private pqcGateway: QtonPqcGateway;

    constructor(defaultProvider: ModelProvider = 'gemini') {
        this.activeProvider = defaultProvider;
        this.automaton = new ConwayAutomatonAI(16, 16);
        this.pqcGateway = new QtonPqcGateway();
    }

    public setProvider(provider: ModelProvider) {
        this.activeProvider = provider;
    }

    public async processUserMessage(message: string): Promise<ChatbotResponse> {
        const lower = message.toLowerCase();
        const toolCalls: Array<{ name: string; output: any }> = [];
        let reply = '';

        if (lower.includes('automaton') || lower.includes('conway') || lower.includes('game of life')) {
            const state = this.automaton.step();
            const ascii = this.automaton.renderAscii();
            toolCalls.push({ name: 'conway_automaton_step', output: state });
            reply = `🤖 [QTON Automaton AI - Gen ${state.generation}]\nDensity: ${(state.density * 100).toFixed(1)}% | Entropy: ${state.entropyMetric.toFixed(3)} | Dynamic Emission Factor: ${state.emissionFactor.toFixed(2)}x\n\n${ascii}`;
        } else if (lower.includes('pqc') || lower.includes('quantum') || lower.includes('verify')) {
            const proof = this.pqcGateway.generateProofForAction('AGENT_AUTONOMOUS_AUTHORIZATION', {
                intent: message,
                provider: this.activeProvider,
            });
            const valid = QtonPqcGateway.verifyProof(proof);
            toolCalls.push({ name: 'verify_pqc_proof', output: { valid, algorithm: proof.algorithm } });
            reply = `🔐 [NIST FIPS 204 ML-DSA-65 PQC Verified]\nStatus: ${valid ? 'SUCCESS' : 'FAILED'}\nAlgorithm: ${proof.algorithm}\nSignature: ${proof.signatureHex.slice(0, 32)}...\nPayload Hash: ${proof.payloadHashHex}`;
        } else if (lower.includes('qr') || lower.includes('pay') || lower.includes('transfer')) {
            const qr = await QtonQrEngine.generateTonTransferQr('EQD000000000000000000000000000000000000000000000', 1000000000n, 'QTON AI Payment');
            toolCalls.push({ name: 'generate_qr', output: { rawUrl: qr.rawUrl } });
            reply = `📱 [QTON Payment QR Generated]\nScan below to execute on TON Testnet:\n${qr.asciiTerminal}\nDeepLink: ${qr.rawUrl}`;
        } else if (lower.includes('supply') || lower.includes('mint')) {
            reply = `⚡ [QTON Supply Architecture]\nQTON utilizes an UNBOUNDED UNLIMITED SUPPLY model on TON TEP-74.\nTokens are autonomously minted on demand via PQC-verified agentic proofs and Conway entropy conditions.`;
        } else {
            reply = `✨ [QTON Agentic Assistant (${this.activeProvider.toUpperCase()})]\nReady to manage your Quantum TON ecosystem. Capabilities include:\n1. 🧬 Conway Automaton AI Simulation\n2. 🔐 NIST FIPS 204 Post-Quantum Proofs\n3. 🚀 Launchpad Token Deployment\n4. 📱 Dynamic QR Code Invoicing\n5. ⚡ Unlimited Supply Minting`;
        }

        return {
            provider: this.activeProvider,
            reply,
            toolCallsExecuted: toolCalls,
        };
    }
}
