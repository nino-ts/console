/**
 * Type definitions for the Console package.
 *
 * @packageDocumentation
 */

/**
 * Command signature format.
 *
 * @example
 * 'serve {--port=3000} {--host=localhost}'
 * 'make:controller {name}'
 * 'routes {--format=table}'
 */
export type CommandSignature = string;

/**
 * Parsed command arguments and options.
 */
export interface ParsedArguments {
    /**
     * Positional arguments.
     */
    arguments: Record<string, string>;

    /**
     * Named options (--option=value).
     */
    options: Record<string, string | boolean>;
}

/**
 * Command definition returned by getDefinition().
 */
export interface CommandDefinition {
    /**
     * Command name (e.g., 'serve', 'make:controller').
     */
    name: string;

    /**
     * Command signature.
     */
    signature: CommandSignature;

    /**
     * Command description.
     */
    description: string;
}

/**
 * Output writer interface.
 */
export interface OutputWriter {
    /**
     * Write a line to output.
     */
    writeLine(text: string): void;
}
