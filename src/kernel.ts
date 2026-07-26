/**
 * Kernel class for managing and running console commands.
 *
 * @packageDocumentation
 */

import type { Command } from "./command";
import type { KernelInterface } from "./contracts/kernel-interface";
import type { OutputWriter, ParsedArguments } from "./types";

/**
 * Default console output writer.
 */
const defaultWriter: OutputWriter = {
    writeLine(_text: string): void {},
};

/**
 * The console kernel that manages and executes commands.
 *
 * @example
 * ```typescript
 * const kernel = new Kernel();
 * kernel.register(new ServeCommand());
 * kernel.register(new MakeControllerCommand());
 * await kernel.run(process.argv.slice(2));
 * ```
 */
export class Kernel implements KernelInterface {
    /**
     * Registered commands.
     */
    private commands: Command[] = [];

    /**
     * Output writer.
     */
    private output: OutputWriter = defaultWriter;

    /**
     * Register a command.
     *
     * @param command - The command to register
     * @returns This kernel for chaining
     */
    register(command: Command): this {
        this.commands.push(command);
        return this;
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
     * Run a command from command line arguments.
     *
     * @param argv - Command line arguments (without node and script)
     * @returns Exit code
     */
    async run(argv: string[]): Promise<number> {
        const commandName = argv[0];

        // No command provided - show help
        if (!commandName) {
            this.showHelp();
            return 0;
        }

        // Find the command
        const command = this.findCommand(commandName);
        if (!command) {
            this.output.writeLine(`[ERROR] Command "${commandName}" not found`);
            return 1;
        }

        // Parse arguments and options
        const parsed = this.parseArgv(command, argv.slice(1));
        command.setArguments(parsed.arguments);
        command.setOptions(parsed.options);
        command.setOutput(this.output);

        // Execute the command
        return command.handle();
    }

    /**
     * Find a command by name.
     *
     * @param name - Command name
     * @returns The command or undefined
     */
    findCommand(name: string): Command | undefined {
        return this.commands.find((c) => c.getDefinition().name === name);
    }

    /**
     * Get all registered commands.
     *
     * @returns Array of commands
     */
    getCommands(): Command[] {
        return this.commands;
    }

    /**
     * Show help information.
     */
    private showHelp(): void {
        this.output.writeLine("Ninots Console");
        this.output.writeLine("");
        this.output.writeLine("Available commands:");

        for (const command of this.commands) {
            const def = command.getDefinition();
            this.output.writeLine(`  ${def.name.padEnd(20)} ${def.description}`);
        }
    }

    /**
     * Parse command line arguments for a command.
     *
     * @param command - The command
     * @param argv - Arguments (without command name)
     * @returns Parsed arguments and options
     */
    private parseArgv(command: Command, argv: string[]): ParsedArguments {
        const signature = command.getDefinition().signature;
        const result: ParsedArguments = {
            arguments: {},
            options: {},
        };

        // Extract argument names from signature
        const argMatches = signature.matchAll(/\{(\w+)\}/g);
        const argNames = [...argMatches].map((m) => m[1]).filter((n): n is string => n !== undefined);

        // Separate options from positional arguments
        const positional: string[] = [];
        for (const arg of argv) {
            if (arg.startsWith("--")) {
                // Parse option
                const [key, ...valueParts] = arg.slice(2).split("=");
                const value = valueParts.join("=");
                if (key) {
                    result.options[key] = value || true;
                }
            } else {
                positional.push(arg);
            }
        }

        // Map positional arguments
        for (let i = 0; i < argNames.length && i < positional.length; i++) {
            const argName = argNames[i];
            const argValue = positional[i];
            if (argName && argValue) {
                result.arguments[argName] = argValue;
            }
        }

        return result;
    }
}
