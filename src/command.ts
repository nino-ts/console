/**
 * Base Command class for CLI commands.
 *
 * @packageDocumentation
 */

import type { CommandDefinition, OutputWriter } from "./types";
import type { CommandInterface } from "./contracts/command-interface";

/**
 * Default console output writer.
 */
const defaultWriter: OutputWriter = {
    writeLine(_text: string): void {},
};

/**
 * Base class for console commands.
 *
 * @example
 * ```typescript
 * class GreetCommand extends Command {
 *   signature = 'greet {name} {--loud}';
 *   description = 'Greet someone';
 *
 *   async handle(): Promise<number> {
 *     const name = this.argument('name');
 *     const loud = this.option('loud');
 *     const message = loud ? `HELLO, ${name.toUpperCase()}!` : `Hello, ${name}!`;
 *     this.info(message);
 *     return 0;
 *   }
 * }
 * ```
 */
export abstract class Command implements CommandInterface {
    /**
     * The command signature (e.g., 'make:controller {name} {--resource}').
     */
    protected abstract signature: string;

    /**
     * The command description.
     */
    protected abstract description: string;

    /**
     * Parsed arguments.
     */
    private args: Record<string, string> = {};

    /**
     * Parsed options.
     */
    private opts: Record<string, string | boolean> = {};

    /**
     * Output writer.
     */
    private output: OutputWriter = defaultWriter;

    /**
     * Execute the command.
     *
     * @returns Exit code (0 for success, non-zero for failure)
     */
    abstract handle(): Promise<number>;

    /**
     * Get the command definition.
     *
     * @returns The command definition
     */
    getDefinition(): CommandDefinition {
        const name = this.signature.split(" ")[0] ?? "";
        return {
            description: this.description,
            name,
            signature: this.signature,
        };
    }

    /**
     * Get an argument value.
     *
     * @param name - Argument name
     * @returns The argument value or undefined
     */
    argument(name: string): string | undefined {
        return this.args[name];
    }

    /**
     * Get an option value.
     *
     * @param name - Option name
     * @returns The option value, or default from signature
     */
    option(name: string): string | boolean | undefined {
        // Check if option was provided
        if (this.opts[name] !== undefined) {
            return this.opts[name];
        }

        // Look for default in signature
        const defaultMatch = this.signature.match(new RegExp(`\\{--${name}=([^}]+)\\}`));
        if (defaultMatch) {
            return defaultMatch[1];
        }

        return undefined;
    }

    /**
     * Set the arguments.
     *
     * @param args - Arguments object
     */
    setArguments(args: Record<string, string>): void {
        this.args = args;
    }

    /**
     * Set the options.
     *
     * @param opts - Options object
     */
    setOptions(opts: Record<string, string | boolean>): void {
        this.opts = opts;
    }

    /**
     * Set the output writer.
     *
     * @param writer - Output writer
     */
    setOutput(writer: OutputWriter): void {
        this.output = writer;
    }

    /**
     * Output an info message.
     *
     * @param message - The message
     */
    info(message: string): void {
        this.output.writeLine(`[INFO] ${message}`);
    }

    /**
     * Output an error message.
     *
     * @param message - The message
     */
    error(message: string): void {
        this.output.writeLine(`[ERROR] ${message}`);
    }

    /**
     * Output a success message.
     *
     * @param message - The message
     */
    success(message: string): void {
        this.output.writeLine(`[SUCCESS] ${message}`);
    }

    /**
     * Output a warning message.
     *
     * @param message - The message
     */
    warn(message: string): void {
        this.output.writeLine(`[WARN] ${message}`);
    }

    /**
     * Output a plain line.
     *
     * @param message - The message
     */
    line(message: string): void {
        this.output.writeLine(message);
    }
}
