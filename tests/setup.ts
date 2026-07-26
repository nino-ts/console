/**
 * Test setup for @ninots/console.
 *
 * @packageDocumentation
 */

/**
 * Captures console output for testing.
 */
export class OutputCapture {
    lines: string[] = [];

    writeLine(text: string): void {
        this.lines.push(text);
    }

    getOutput(): string {
        return this.lines.join("\n");
    }

    clear(): void {
        this.lines = [];
    }
}

/**
 * Creates a new output capture for testing.
 */
export function createOutputCapture(): OutputCapture {
    return new OutputCapture();
}
