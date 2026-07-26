/**
 * OutputStyle class for styled console output.
 *
 * @packageDocumentation
 */

import type { OutputWriter } from "./types";

/**
 * Default console output writer.
 */
const defaultWriter: OutputWriter = {
    writeLine(_text: string): void {},
};

/**
 * ANSI color codes for terminal styling.
 */
const COLORS = {
    CYAN: "\x1b[36m",
    GREEN: "\x1b[32m",
    RED: "\x1b[31m",
    RESET: "\x1b[0m",
    YELLOW: "\x1b[33m",
} as const;

/**
 * Provides styled output methods for console commands.
 *
 * @example
 * ```typescript
 * const style = new OutputStyle();
 * style.info('Processing...'); // Cyan [INFO]
 * style.success('Done!');      // Green [SUCCESS]
 * style.error('Failed!');      // Red [ERROR]
 * ```
 */
export class OutputStyle {
    /**
     * The output writer.
     */
    private writer: OutputWriter;

    /**
     * Creates a new OutputStyle instance.
     *
     * @param writer - Optional output writer
     */
    constructor(writer: OutputWriter = defaultWriter) {
        this.writer = writer;
    }

    /**
     * Output an info message with cyan color.
     *
     * @param message - The message to output
     */
    info(message: string): void {
        this.writer.writeLine(`${COLORS.CYAN}[INFO]${COLORS.RESET} ${message}`);
    }

    /**
     * Output an error message with red color.
     *
     * @param message - The message to output
     */
    error(message: string): void {
        this.writer.writeLine(`${COLORS.RED}[ERROR]${COLORS.RESET} ${message}`);
    }

    /**
     * Output a success message with green color.
     *
     * @param message - The message to output
     */
    success(message: string): void {
        this.writer.writeLine(`${COLORS.GREEN}[SUCCESS]${COLORS.RESET} ${message}`);
    }

    /**
     * Output a warning message with yellow color.
     *
     * @param message - The message to output
     */
    warn(message: string): void {
        this.writer.writeLine(`${COLORS.YELLOW}[WARN]${COLORS.RESET} ${message}`);
    }

    /**
     * Output a plain line.
     *
     * @param message - The message to output
     */
    line(message: string): void {
        this.writer.writeLine(message);
    }

    /**
     * Output an empty line.
     */
    newLine(): void {
        this.writer.writeLine("");
    }

    /**
     * Output a formatted table.
     *
     * @param headers - Table headers
     * @param rows - Table rows
     */
    table(headers: string[], rows: string[][]): void {
        // Calculate column widths
        const widths = headers.map((h, i) => {
            const columnValues = [h, ...rows.map((r) => r[i] ?? "")];
            return Math.max(...columnValues.map((v) => v.length));
        });

        // Output header
        const headerLine = headers.map((h, i) => h.padEnd(widths[i] ?? 0)).join(" | ");
        this.writer.writeLine(headerLine);

        // Output separator
        const separator = widths.map((w) => "-".repeat(w)).join("-+-");
        this.writer.writeLine(separator);

        // Output rows
        for (const row of rows) {
            const rowLine = row.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join(" | ");
            this.writer.writeLine(rowLine);
        }
    }
}
