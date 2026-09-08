import crypto from 'crypto';

export interface AutomatonState {
    generation: number;
    width: number;
    height: number;
    livingCells: number;
    density: number;
    entropyMetric: number;
    emissionFactor: number;
}

export class ConwayAutomatonAI {
    public width: number;
    public height: number;
    public grid: boolean[][];
    public generation: number = 0;

    constructor(width: number = 16, height: number = 16, seedHex?: string) {
        this.width = width;
        this.height = height;
        this.grid = this.initGrid(seedHex);
    }

    private initGrid(seedHex?: string): boolean[][] {
        const seed = seedHex ? Buffer.from(seedHex, 'hex') : crypto.randomBytes(32);
        const grid: boolean[][] = [];
        for (let y = 0; y < this.height; y++) {
            const row: boolean[] = [];
            for (let x = 0; x < this.width; x++) {
                const byteIndex = (y * this.width + x) % seed.length;
                const bit = (seed[byteIndex] >> (x % 8)) & 1;
                row.push(bit === 1);
            }
            grid.push(row);
        }
        return grid;
    }

    public step(): AutomatonState {
        const nextGrid: boolean[][] = [];
        let livingCount = 0;

        for (let y = 0; y < this.height; y++) {
            const nextRow: boolean[] = [];
            for (let x = 0; x < this.width; x++) {
                const neighbors = this.countNeighbors(x, y);
                const isAlive = this.grid[y][x];

                // Conway's Game of Life B3/S23 Rules
                let nextAlive = false;
                if (isAlive && (neighbors === 2 || neighbors === 3)) {
                    nextAlive = true;
                } else if (!isAlive && neighbors === 3) {
                    nextAlive = true;
                }

                if (nextAlive) livingCount++;
                nextRow.push(nextAlive);
            }
            nextGrid.push(nextRow);
        }

        this.grid = nextGrid;
        this.generation++;

        const totalCells = this.width * this.height;
        const density = livingCount / totalCells;
        // Dynamic quantum-coupled entropy calculation
        const entropyMetric = -1 * (density > 0 && density < 1 ? density * Math.log2(density) + (1 - density) * Math.log2(1 - density) : 0);
        // Emission factor dynamically governs QTON autonomous minting
        const emissionFactor = 1.0 + (entropyMetric * 0.5);

        return {
            generation: this.generation,
            width: this.width,
            height: this.height,
            livingCells: livingCount,
            density,
            entropyMetric,
            emissionFactor,
        };
    }

    private countNeighbors(x: number, y: number): number {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = (x + dx + this.width) % this.width;
                const ny = (y + dy + this.height) % this.height;
                if (this.grid[ny][nx]) count++;
            }
        }
        return count;
    }

    public renderAscii(): string {
        return this.grid.map(row => row.map(c => (c ? '🟩' : '⬛')).join('')).join('\n');
    }
}
