/**
 * Unit tests for Command.
 *
 * TDD: These tests define the expected behavior BEFORE implementation.
 *
 * @packageDocumentation
 */

import { describe, expect, test } from "bun:test";
import { Command } from "../../src/command";
import { createOutputCapture } from "../setup";

/**
 * Test command implementation.
 */
class TestCommand extends Command {
    signature = "test:command {name} {--option=default}";
    description = "A test command";

    async handle(): Promise<number> {
        const name = this.argument("name");
        const option = this.option("option");
        this.info(`Name: ${name}, Option: ${option}`);
        return 0;
    }
}

class FailingCommand extends Command {
    signature = "fail";
    description = "A failing command";

    async handle(): Promise<number> {
        this.error("Something went wrong");
        return 1;
    }
}

describe("Command", () => {
    describe("getDefinition()", () => {
        test("should return command name from signature", () => {
            const command = new TestCommand();

            const definition = command.getDefinition();

            expect(definition.name).toBe("test:command");
        });

        test("should return signature", () => {
            const command = new TestCommand();

            const definition = command.getDefinition();

            expect(definition.signature).toBe("test:command {name} {--option=default}");
        });

        test("should return description", () => {
            const command = new TestCommand();

            const definition = command.getDefinition();

            expect(definition.description).toBe("A test command");
        });
    });

    describe("argument()", () => {
        test("should get argument value", () => {
            const command = new TestCommand();
            command.setArguments({ name: "John" });

            expect(command.argument("name")).toBe("John");
        });

        test("should return undefined for missing argument", () => {
            const command = new TestCommand();
            command.setArguments({});

            expect(command.argument("missing")).toBeUndefined();
        });
    });

    describe("option()", () => {
        test("should get option value", () => {
            const command = new TestCommand();
            command.setOptions({ option: "custom" });

            expect(command.option("option")).toBe("custom");
        });

        test("should return default value from signature", () => {
            const command = new TestCommand();
            command.setOptions({});

            expect(command.option("option")).toBe("default");
        });

        test("should return boolean option value", () => {
            const command = new TestCommand();
            command.setOptions({ verbose: true });

            expect(command.option("verbose")).toBe(true);
        });

        test("should return undefined for option without default", () => {
            class NoDefaultCommand extends Command {
                signature = "test {--flag}";
                description = "Test";
                async handle(): Promise<number> {
                    return 0;
                }
            }

            const command = new NoDefaultCommand();
            command.setOptions({});

            expect(command.option("flag")).toBeUndefined();
        });
    });

    describe("output methods", () => {
        test("info() should output info message", () => {
            const command = new TestCommand();
            const output = createOutputCapture();
            command.setOutput(output);

            command.info("Test message");

            expect(output.getOutput()).toContain("Test message");
        });

        test("error() should output error message", () => {
            const command = new FailingCommand();
            const output = createOutputCapture();
            command.setOutput(output);

            command.error("Error message");

            expect(output.getOutput()).toContain("Error message");
        });

        test("line() should output plain message", () => {
            const command = new TestCommand();
            const output = createOutputCapture();
            command.setOutput(output);

            command.line("Plain line");

            expect(output.getOutput()).toBe("Plain line");
        });

        test("success() should output success message", () => {
            const command = new TestCommand();
            const output = createOutputCapture();
            command.setOutput(output);

            command.success("Success!");

            expect(output.getOutput()).toContain("Success!");
        });

        test("warn() should output warning message", () => {
            const command = new TestCommand();
            const output = createOutputCapture();
            command.setOutput(output);

            command.warn("Warning!");

            expect(output.getOutput()).toContain("Warning!");
        });
    });

    describe("handle()", () => {
        test("should return exit code 0 on success", async () => {
            const command = new TestCommand();
            const output = createOutputCapture();
            command.setOutput(output);
            command.setArguments({ name: "Test" });
            command.setOptions({ option: "value" });

            const exitCode = await command.handle();

            expect(exitCode).toBe(0);
        });

        test("should return exit code 1 on failure", async () => {
            const command = new FailingCommand();
            const output = createOutputCapture();
            command.setOutput(output);

            const exitCode = await command.handle();

            expect(exitCode).toBe(1);
        });
    });
});
