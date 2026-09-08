import QRCode from 'qrcode';

export interface QrResult {
    rawUrl: string;
    asciiTerminal: string;
    svgString: string;
    dataUrl: string;
}

export class QtonQrEngine {
    public static async generateTonTransferQr(
        address: string,
        nanoAmount?: bigint,
        memo?: string
    ): Promise<QrResult> {
        let rawUrl = `ton://transfer/${address}`;
        const params: string[] = [];
        if (nanoAmount !== undefined) {
            params.push(`amount=${nanoAmount.toString()}`);
        }
        if (memo) {
            params.push(`text=${encodeURIComponent(memo)}`);
        }
        if (params.length > 0) {
            rawUrl += `?${params.join('&')}`;
        }

        const asciiTerminal = await QRCode.toString(rawUrl, { type: 'terminal', small: true });
        const svgString = await QRCode.toString(rawUrl, { type: 'svg' });
        const dataUrl = await QRCode.toDataURL(rawUrl);

        return {
            rawUrl,
            asciiTerminal,
            svgString,
            dataUrl,
        };
    }

    public static async generateGenericQr(urlOrText: string): Promise<QrResult> {
        const asciiTerminal = await QRCode.toString(urlOrText, { type: 'terminal', small: true });
        const svgString = await QRCode.toString(urlOrText, { type: 'svg' });
        const dataUrl = await QRCode.toDataURL(urlOrText);

        return {
            rawUrl: urlOrText,
            asciiTerminal,
            svgString,
            dataUrl,
        };
    }
}
