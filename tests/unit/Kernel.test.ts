/**
 * Unit tests for Kernel.
 *
 * TDD: These tests define the expected behavior BEFORE implementation.
 *
 * @packageDocumentation
 */

import { describe, expect, test } from "bun:test";
import { Command } from "../../src/command";
import { Kernel } from "../../src/kernel";
import { createOutputCapture } from "../setup";

class GreetCommand extends Command {
    signature = "greet {name}";
    description = "Greet someone";

    async handle(): Promise<number> {
        const name = this.argument("name");
        this.info(`Hello, ${name}!`);
        return 0;
    }
}

class ServeCommand extends Command {
    signature = "serve {--port=3000}";
    description = "Start the server";

    async handle(): Promise<number> {
        const port = this.option("port");
        this.info(`Server running on port ${port}`);
        return 0;
    }
}

class FailCommand extends Command {
    signature = "fail";
    description = "A command that fails";

    async handle(): Promise<number> {
        this.error("Command failed");
        return 42;
    }
}

class ComplexCommand extends Command {
    signature = "complex {name} {--verbose} {--output=stdout}";
    description = "Complex command with multiple arguments and options";

    async handle(): Promise<number> {
        const name = this.argument("name");
        const verbose = this.option("verbose");
        const output = this.option("output");

        let message = `Processing ${name}`;
        if (verbose) {
            message += ` (verbose mode, output: ${output})`;
        }

        this.info(message);
        return 0;
    }
}

describe("Kernel", () => {
    describe("register()", () => {
        test("should register a command", () => {
            const kernel = new Kernel();

            kernel.register(new GreetCommand());

            expect(kernel.getCommands().length).toBe(1);
        });

        test("should register multiple commands", () => {
            const kernel = new Kernel();

            kernel.register(new GreetCommand());
            kernel.register(new ServeCommand());

            expect(kernel.getCommands().length).toBe(2);
        });
    });

    describe("run()", () => {
        test("should execute command with arguments", async () => {
            const kernel = new Kernel();
            const output = createOutputCapture();
            kernel.setOutput(output);
            kernel.register(new GreetCommand());

            const exitCode = await kernel.run(["greet", "World"]);

            expect(exitCode).toBe(0);
            expect(output.getOutput()).toContain("Hello, World!");
        });

        test("should execute command with options", async () => {
            const kernel = new Kernel();
            const output = createOutputCapture();
            kernel.setOutput(output);
            kernel.register(new ServeCommand());

            const exitCode = await kernel.run(["serve", "--port=8080"]);

            expect(exitCode).toBe(0);
            expect(output.getOutput()).toContain("8080");
        });

        test("should return 1 for unknown command", async () => {
            const kernel = new Kernel();
            const output = createOutputCapture();
            kernel.setOutput(output);

            const exitCode = await kernel.run(["unknown"]);

            expect(exitCode).toBe(1);
            expect(output.getOutput()).toContain("not found");
        });

        test("should show help when no command provided", async () => {
            const kernel = new Kernel();
            const output = createOutputCapture();
            kernel.setOutput(output);
            kernel.register(new GreetCommand());

            const exitCode = await kernel.run([]);

            expect(exitCode).toBe(0);
            expect(output.getOutput()).toContain("Available commands");
        });

        test("should return non-zero exit code when command fails", async () => {
            const kernel = new Kernel();
            const output = createOutputCapture();
            kernel.setOutput(output);
            kernel.register(new FailCommand());

            const exitCode = await kernel.run(["fail"]);

            expect(exitCode).toBe(42);
            expect(output.getOutput()).toContain("Command failed");
        });

        test("should use custom output writer when set", async () => {
            const kernel = new Kernel();
            const customWrites: string[] = [];
            const customOutput = {
                writeLine(text: string): void {
                    customWrites.push(text);
                },
            };
            kernel.setOutput(customOutput);
            kernel.register(new GreetCommand());

            await kernel.run(["greet", "Custom"]);

            expect(customWrites.some((line) => line.includes("Hello, Custom!"))).toBe(true);
        });

        test("should execute complex command with multiple options", async () => {
            const kernel = new Kernel();
            const output = createOutputCapture();
            kernel.setOutput(output);
            kernel.register(new ComplexCommand());

            const exitCode = await kernel.run(["complex", "task", "--verbose", "--output=stderr"]);

            expect(exitCode).toBe(0);
            expect(output.getOutput()).toContain("Processing task");
            expect(output.getOutput()).toContain("verbose mode");
            expect(output.getOutput()).toContain("stderr");
        });

        test("should handle boolean option without value", async () => {
            const kernel = new Kernel();
            const output = createOutputCapture();
            kernel.setOutput(output);
            kernel.register(new ComplexCommand());

            const exitCode = await kernel.run(["complex", "test", "--verbose"]);

            expect(exitCode).toBe(0);
            expect(output.getOutput()).toContain("Processing test");
            expect(output.getOutput()).toContain("stdout"); // Should use default
        });
    });

    describe("getCommands()", () => {
        test("should return all registered commands", () => {
            const kernel = new Kernel();
            kernel.register(new GreetCommand());
            kernel.register(new ServeCommand());

            const commands = kernel.getCommands();

            expect(commands.length).toBe(2);
        });
    });

    describe("findCommand()", () => {
        test("should find command by name", () => {
            const kernel = new Kernel();
            kernel.register(new GreetCommand());

            const command = kernel.findCommand("greet");

            expect(command).toBeDefined();
            expect(command?.getDefinition().name).toBe("greet");
        });

        test("should return undefined for unknown command", () => {
            const kernel = new Kernel();

            const command = kernel.findCommand("unknown");

            expect(command).toBeUndefined();
        });
    });

    describe("parseArgv()", () => {
        test("should parse option with multiple = signs", async () => {
            class UrlCommand extends Command {
                signature = "fetch {--url}";
                description = "Fetch URL";
                async handle(): Promise<number> {
                    this.info(`URL: ${this.option("url")}`);
                    return 0;
                }
            }

            const kernel = new Kernel();
            const output = createOutputCapture();
            kernel.setOutput(output);
            kernel.register(new UrlCommand());

            await kernel.run(["fetch", "--url=https://example.com?key=value"]);

            expect(output.getOutput()).toContain("https://example.com?key=value");
        });

        test("should ignore malformed options with empty key", async () => {
            class TestCommand extends Command {
                signature = "test";
                description = "Test";
                async handle(): Promise<number> {
                    this.info("OK");
                    return 0;
                }
            }

            const kernel = new Kernel();
            const output = createOutputCapture();
            kernel.setOutput(output);
            kernel.register(new TestCommand());

            // Invalid option with empty key should be skipped
            await kernel.run(["test", "--=value"]);

            expect(output.getOutput()).toContain("OK");
        });

        test("should handle more positional args than signature expects", async () => {
            const kernel = new Kernel();
            const output = createOutputCapture();
            kernel.setOutput(output);
            kernel.register(new GreetCommand()); // only expects {name}

            // Pass extra positional argument
            await kernel.run(["greet", "Alice", "extra"]);

            expect(output.getOutput()).toContain("Hello, Alice!");
        });
    });
});
