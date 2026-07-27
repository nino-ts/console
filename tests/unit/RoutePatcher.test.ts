import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
    appendApiRoutes,
    appendWebRoutes,
    insertTopLevelImport,
} from "../../src/generator/route-patcher";

describe("insertTopLevelImport", () => {
    test("inserts before an unindented import marker", () => {
        const source = `import type { Router } from "@ninots/routing";

// -- nino:web-imports --

export function registerWebRoutes(router: Router): void {}
`;
        const result = insertTopLevelImport(
            source,
            'import { ArticleController } from "@/app/Http/Controllers/ArticleController";',
            "// -- nino:web-imports --",
        );

        expect(result).toContain(
            'import { ArticleController } from "@/app/Http/Controllers/ArticleController";\n// -- nino:web-imports --',
        );
        expect(result.indexOf("import { ArticleController }")).toBeLessThan(
            result.indexOf("export function registerWebRoutes"),
        );
    });

    test("inserts after last top-level import when marker is indented (legacy)", () => {
        const source = `import type { Router } from "@ninots/routing";

export function registerWebRoutes(router: Router): void {
    // -- nino:web-imports --
    router.group({ middleware: ["web"] }, () => {});
}
`;
        const result = insertTopLevelImport(
            source,
            'import { ArticleController } from "@/app/Http/Controllers/ArticleController";',
            "// -- nino:web-imports --",
        );

        const lines = result.split("\n");
        const importLine = lines.find((line) => line.includes("ArticleController"));
        expect(importLine).toBe(
            'import { ArticleController } from "@/app/Http/Controllers/ArticleController";',
        );
        expect(result.indexOf("import { ArticleController }")).toBeLessThan(
            result.indexOf("export function registerWebRoutes"),
        );
        expect(result).toContain("    // -- nino:web-imports --");
    });

    test("handles multi-line imports before insertion", () => {
        const source = `import {
    generateCsrfToken,
} from "@ninots/foundation";
import type { Router } from "@ninots/routing";

export function registerWebRoutes(router: Router): void {
    // -- nino:web-imports --
}
`;
        const result = insertTopLevelImport(
            source,
            'import { FooController } from "@/app/Http/Controllers/FooController";',
            "// -- nino:web-imports --",
        );

        expect(result.indexOf("import { FooController }")).toBeLessThan(
            result.indexOf("export function registerWebRoutes"),
        );
        expect(result).toMatch(
            /from "@ninots\/routing";\nimport \{ FooController \}/,
        );
    });
});

describe("appendWebRoutes / appendApiRoutes", () => {
    let root = "";

    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), "ninots-route-patcher-"));
    });

    afterEach(async () => {
        await rm(root, { force: true, recursive: true });
    });

    test("appendWebRoutes keeps controller import at top-level with legacy marker", async () => {
        const routesFile = join(root, "web.ts");
        await writeFile(
            routesFile,
            `import type { Router } from "@ninots/routing";

export function registerWebRoutes(router: Router): void {
    // -- nino:web-imports --
    router.group({ middleware: ["web"] }, () => {
        // -- nino:web-routes --
    });
}
`,
        );

        await appendWebRoutes(
            routesFile,
            'import { ArticleController } from "@/app/Http/Controllers/ArticleController";',
            '        router.get("/articles", () => new ArticleController().index());',
        );

        const routes = await readFile(routesFile, "utf8");
        const importLine = routes
            .split("\n")
            .find((line) => line.includes("ArticleController") && line.includes("import"));

        expect(importLine?.startsWith("import ")).toBe(true);
        expect(routes.indexOf("import { ArticleController }")).toBeLessThan(
            routes.indexOf("export function registerWebRoutes"),
        );
        expect(routes).toContain('router.get("/articles"');
    });

    test("appendApiRoutes inserts import before unindented marker", async () => {
        const routesFile = join(root, "api.ts");
        await writeFile(
            routesFile,
            `import type { Application } from "@ninots/foundation";
import type { Router } from "@ninots/routing";

// -- nino:api-imports --

export function registerApiRoutes(router: Router, app: Application): void {
    router.group({ prefix: "/api" }, () => {
        // -- nino:api-routes --
    });
}
`,
        );

        await appendApiRoutes(
            routesFile,
            'import { NoteController } from "@/app/Http/Controllers/NoteController";',
            '        router.get("/notes", () => new NoteController().index());',
        );

        const routes = await readFile(routesFile, "utf8");
        expect(routes).toContain(
            'import { NoteController } from "@/app/Http/Controllers/NoteController";\n// -- nino:api-imports --',
        );
        expect(routes.indexOf("import { NoteController }")).toBeLessThan(
            routes.indexOf("export function registerApiRoutes"),
        );
    });
});
