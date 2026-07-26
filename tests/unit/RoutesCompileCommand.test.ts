/**
 * Unit tests for RoutesCompileCommand and named stub templates.
 *
 * @packageDocumentation
 */

import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RoutesCompileCommand } from "../../src/commands/routes-compile-command";
import { getStubTemplate } from "../../src/generator/stub-templates";

type FakeRoute = {
    name?: string;
    params: string[];
};

function emitRouteRegistry(routes: unknown[]): string {
    const typed = routes as FakeRoute[];
    const names = new Map<string, string[]>();
    for (const route of typed) {
        if (!route.name) {
            continue;
        }
        if (names.has(route.name)) {
            throw new Error(`Duplicate route name: ${route.name}`);
        }
        names.set(route.name, route.params);
    }

    const sorted = [...names.entries()].sort(([a], [b]) => a.localeCompare(b));
    const lines = sorted.map(([name, params]) => {
        if (params.length === 0) {
            return `    "${name}": Record<never, never>;`;
        }
        const fields = params.map((param) => `${param}: string`).join("; ");
        return `    "${name}": { ${fields} };`;
    });

    return `export type RouteRegistry = {\n${lines.join("\n")}\n};\n`;
}

describe("RoutesCompileCommand", () => {
    test("writes deterministic routes.d.ts via emitRouteRegistry", async () => {
        const outDir = await mkdtemp(join(tmpdir(), "ninots-routes-compile-"));
        const outRel = "types/routes.d.ts";
        const outPath = join(outDir, outRel);

        try {
            const routes: FakeRoute[] = [
                { name: "home", params: [] },
                { name: "users.show", params: ["id"] },
            ];

            const command = new RoutesCompileCommand({
                resolveRouter: () => ({ getRoutes: () => routes }),
                emitRouteRegistry,
            });
            command.setOptions({ out: outRel });
            command.setOutput({
                writeLine(): void {},
            });

            const cwd = process.cwd();
            process.chdir(outDir);
            try {
                const exitCode = await command.handle();
                expect(exitCode).toBe(0);
            } finally {
                process.chdir(cwd);
            }

            const content = await readFile(outPath, "utf8");
            expect(content).toContain('"home": Record<never, never>;');
            expect(content).toContain('"users.show": { id: string };');
            expect(content.indexOf('"home"')).toBeLessThan(content.indexOf('"users.show"'));
        } finally {
            await rm(outDir, { force: true, recursive: true });
        }
    });

    test("returns non-zero on duplicate route names", async () => {
        const routes: FakeRoute[] = [
            { name: "dup", params: [] },
            { name: "dup", params: [] },
        ];

        const lines: string[] = [];
        const command = new RoutesCompileCommand({
            resolveRouter: () => ({ getRoutes: () => routes }),
            emitRouteRegistry,
        });
        command.setOutput({
            writeLine(text: string): void {
                lines.push(text);
            },
        });

        const exitCode = await command.handle();
        expect(exitCode).toBe(1);
        expect(lines.some((line) => line.includes("Duplicate route name: dup"))).toBe(true);
    });
});

describe("named stub templates", () => {
    test("web-resource-routes emit .name() for all 7 actions", () => {
        const stub = getStubTemplate("web-resource-routes");
        expect(stub).toContain('.name("{{ routePrefix }}.index")');
        expect(stub).toContain('.name("{{ routePrefix }}.create")');
        expect(stub).toContain('.name("{{ routePrefix }}.store")');
        expect(stub).toContain('.name("{{ routePrefix }}.show")');
        expect(stub).toContain('.name("{{ routePrefix }}.edit")');
        expect(stub).toContain('.name("{{ routePrefix }}.update")');
        expect(stub).toContain('.name("{{ routePrefix }}.destroy")');
    });

    test("api-resource-routes emit .name() for 4 actions", () => {
        const stub = getStubTemplate("api-resource-routes");
        expect(stub).toContain('.name("{{ routePrefix }}.index")');
        expect(stub).toContain('.name("{{ routePrefix }}.show")');
        expect(stub).toContain('.name("{{ routePrefix }}.update")');
        expect(stub).toContain('.name("{{ routePrefix }}.destroy")');
    });

    test("stubs point at direct @ninots packages (not umbrella)", () => {
        expect(getStubTemplate("controller-api")).toContain("@ninots/routing");
        expect(getStubTemplate("migration")).toContain("@ninots/orm");
        expect(getStubTemplate("model")).toContain("@ninots/orm");
        expect(getStubTemplate("module-provider")).toContain("@ninots/foundation");
        expect(getStubTemplate("module-provider")).toContain("@ninots/container");
        expect(getStubTemplate("module-routes")).toContain("@ninots/routing");
        expect(getStubTemplate("controller-api")).not.toContain("@ninots/framework");
    });
});
