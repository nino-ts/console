/**
 * Unit tests for OutputStyle.
 *
 * TDD: These tests define the expected behavior BEFORE implementation.
 *
 * @packageDocumentation
 */

import { describe, expect, test } from "bun:test";
import { OutputStyle } from "../../src/output-style";
import { createOutputCapture } from "../setup";

describe("OutputStyle", () => {
    describe("info()", () => {
        test("should output info styled message", () => {
            const capture = createOutputCapture();
            const style = new OutputStyle(capture);

            style.info("Info message");

            expect(capture.getOutput()).toContain("Info message");
        });

        test("should include ANSI cyan color code", () => {
            const capture = createOutputCapture();
            const style = new OutputStyle(capture);

            style.info("Colored info");

            const output = capture.getOutput();
            expect(output).toContain("\x1b[36m"); // Cyan color
            expect(output).toContain("\x1b[0m"); // Reset color
        });
    });

    describe("error()", () => {
        test("should output error styled message", () => {
            const capture = createOutputCapture();
            const style = new OutputStyle(capture);

            style.error("Error message");

            expect(capture.getOutput()).toContain("Error message");
        });

        test("should include ANSI red color code", () => {
            const capture = createOutputCapture();
            const style = new OutputStyle(capture);

            style.error("Colored error");

            const output = capture.getOutput();
            expect(output).toContain("\x1b[31m"); // Red color
            expect(output).toContain("\x1b[0m"); // Reset color
        });
    });

    describe("success()", () => {
        test("should output success styled message", () => {
            const capture = createOutputCapture();
            const style = new OutputStyle(capture);

            style.success("Success message");

            expect(capture.getOutput()).toContain("Success message");
        });

        test("should include ANSI green color code", () => {
            const capture = createOutputCapture();
            const style = new OutputStyle(capture);

            style.success("Colored success");

            const output = capture.getOutput();
            expect(output).toContain("\x1b[32m"); // Green color
            expect(output).toContain("\x1b[0m"); // Reset color
        });
    });

    describe("warn()", () => {
        test("should output warning styled message", () => {
            const capture = createOutputCapture();
            const style = new OutputStyle(capture);

            style.warn("Warning message");

            expect(capture.getOutput()).toContain("Warning message");
        });

        test("should include ANSI yellow color code", () => {
            const capture = createOutputCapture();
            const style = new OutputStyle(capture);

            style.warn("Colored warning");

            const output = capture.getOutput();
            expect(output).toContain("\x1b[33m"); // Yellow color
            expect(output).toContain("\x1b[0m"); // Reset color
        });
    });

    describe("line()", () => {
        test("should output plain message", () => {
            const capture = createOutputCapture();
            const style = new OutputStyle(capture);

            style.line("Plain line");

            expect(capture.getOutput()).toBe("Plain line");
        });
    });

    describe("newLine()", () => {
        test("should output empty line", () => {
            const capture = createOutputCapture();
            const style = new OutputStyle(capture);

            style.newLine();

            expect(capture.lines.length).toBe(1);
            expect(capture.lines[0]).toBe("");
        });
    });

    describe("table()", () => {
        test("should output formatted table", () => {
            const capture = createOutputCapture();
            const style = new OutputStyle(capture);

            style.table(
                ["Name", "Age"],
                [
                    ["John", "30"],
                    ["Jane", "25"],
                ],
            );

            const output = capture.getOutput();
            expect(output).toContain("Name");
            expect(output).toContain("Age");
            expect(output).toContain("John");
            expect(output).toContain("30");
        });

        test("should handle empty rows", () => {
            const capture = createOutputCapture();
            const style = new OutputStyle(capture);

            style.table(["Name", "Age"], []);

            const output = capture.getOutput();
            expect(output).toContain("Name");
            expect(output).toContain("Age");
        });

        test("should handle missing cells in rows", () => {
            const capture = createOutputCapture();
            const style = new OutputStyle(capture);

            style.table(
                ["Name", "Age", "City"],
                [
                    ["John", "30"], // Missing 'City'
                    ["Jane"], // Missing 'Age' and 'City'
                ],
            );

            const output = capture.getOutput();
            expect(output).toContain("Name");
            expect(output).toContain("John");
            expect(output).toContain("Jane");
        });

        test("should handle single column table", () => {
            const capture = createOutputCapture();
            const style = new OutputStyle(capture);

            style.table(["Name"], [["John"], ["Jane"]]);

            const output = capture.getOutput();
            expect(output).toContain("Name");
            expect(output).toContain("John");
            expect(output).toContain("Jane");
        });
    });
});
