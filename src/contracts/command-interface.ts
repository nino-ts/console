import type { CommandDefinition, OutputWriter, ParsedArguments } from "../types";

/**
 * Contract for a Console Command.
 */
export interface CommandInterface {
    handle(): Promise<number>;
    getDefinition(): CommandDefinition;
    setArguments(args: ParsedArguments["arguments"]): void;
    setOptions(options: ParsedArguments["options"]): void;
    setOutput(output: OutputWriter): void;
}
