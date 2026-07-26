import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";
import {
    Kernel,
    MakeControllerCommand,
    MakeMigrationCommand,
    MakeModelCommand,
    MakeModuleCommand,
    MakeViewCommand,
    migrationTimestamp,
    normalizeControllerName,
    normalizeModelName,
    normalizeModuleName,
    normalizeViewName,
} from "../../index";

async function createGeneratorWorkspace(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), "ninots-generator-"));

    await mkdir(join(root, "app/Http/Controllers"), { recursive: true });
    await mkdir(join(root, "app/Models"), { recursive: true });
    await mkdir(join(root, "bootstrap"), { recursive: true });
    await mkdir(join(root, "database/migrations"), { recursive: true });
    await mkdir(join(root, "resources/views"), { recursive: true });
    await mkdir(join(root, "routes"), { recursive: true });

    await writeFile(
        join(root, "bootstrap/providers.ts"),
        `import type { Application } from "@ninots/foundation";
import { AppServiceProvider } from "@/app/Providers/AppServiceProvider";
import { RouteServiceProvider } from "@/app/Providers/RouteServiceProvider";
// -- nino:provider-imports --

/**
 * Register all service providers with the application.
 */
export async function registerProviders(app: Application): Promise<void> {
    const providers = [
        AppServiceProvider,
        RouteServiceProvider,
        // -- nino:providers --
    ];

    for (const Provider of providers) {
        app.register(new Provider(app));
    }
}
`,
    );

    await writeFile(
        join(root, "routes/web.ts"),
        `import type { Router } from "@ninots/routing";

// -- nino:web-imports --

export function registerWebRoutes(router: Router): void {
    router.group({ middleware: ["web"] }, () => {
        // -- nino:web-bindings --
        // -- nino:web-routes --
    });
}
`,
    );

    await writeFile(
        join(root, "routes/api.ts"),
        `import type { Application } from "@ninots/foundation";
import type { Router } from "@ninots/routing";

// -- nino:api-imports --

export function registerApiRoutes(router: Router, app: Application): void {
    // -- nino:api-bindings --
    router.group({ prefix: "/api" }, () => {
        // -- nino:api-routes --
    });
}
`,
    );

    return root;
}

function createKernel(root: string): Kernel {
    const kernel = new Kernel();
    const paths = { basePath: root };

    kernel.register(new MakeControllerCommand({ paths }));
    kernel.register(new MakeModelCommand({ paths }));
    kernel.register(new MakeMigrationCommand({ paths }));
    kernel.register(new MakeViewCommand({ paths }));
    kernel.register(new MakeModuleCommand({ paths }));

    return kernel;
}

describe("Generator naming helpers", () => {
    test("normalizeControllerName derives route prefix and class name", () => {
        const names = normalizeControllerName("PostController");

        expect(names.className).toBe("PostController");
        expect(names.routePrefix).toBe("posts");
        expect(names.variableName).toBe("post");
    });

    test("normalizeModelName derives table name", () => {
        const names = normalizeModelName("Article");

        expect(names.className).toBe("Article");
        expect(names.tableName).toBe("articles");
    });

    test("normalizeViewName supports nested names", () => {
        const names = normalizeViewName("posts.index");

        expect(names.exportName).toBe("Index");
        expect(names.fileName).toBe("posts/index.tsx");
    });

    test("normalizeModuleName derives provider and routes paths", () => {
        const names = normalizeModuleName("billing");

        expect(names.className).toBe("Billing");
        expect(names.providerClassName).toBe("BillingServiceProvider");
        expect(names.routePrefix).toBe("billing");
        expect(names.routesRegisterName).toBe("registerBillingRoutes");
        expect(names.providerImportPath).toBe(
            "@/app/Modules/Billing/Providers/BillingServiceProvider",
        );
    });

    test("migrationTimestamp is stable format", () => {
        const timestamp = migrationTimestamp(new Date("2026-07-15T12:34:56Z"));

        expect(timestamp).toBe("2026_07_15_123456");
    });
});

describe("make:* generator commands", () => {
    let root = "";

    beforeEach(async () => {
        root = await createGeneratorWorkspace();
    });

    afterEach(async () => {
        await rm(root, { force: true, recursive: true });
    });

    test("make:controller creates plain controller class", async () => {
        const kernel = createKernel(root);
        const exitCode = await kernel.run(["make:controller", "PostController"]);

        expect(exitCode).toBe(0);
        expect(existsSync(join(root, "app/Http/Controllers/PostController.ts"))).toBe(true);

        const source = await readFile(join(root, "app/Http/Controllers/PostController.ts"), "utf8");
        expect(source).toContain("export class PostController");
        expect(source).not.toContain("store(");
    });

    test("make:controller --resource patches web routes inside web middleware group", async () => {
        const kernel = createKernel(root);
        const exitCode = await kernel.run(["make:controller", "ArticleController", "--resource"]);

        expect(exitCode).toBe(0);

        const routes = await readFile(join(root, "routes/web.ts"), "utf8");
        expect(routes).toContain('middleware: ["web"]');
        expect(routes).toContain('router.post("/articles"');
        expect(routes).toContain("new ArticleController()");

        const importLine = routes
            .split("\n")
            .find((line) => line.includes("ArticleController") && line.trimStart().startsWith("import "));
        expect(importLine?.startsWith("import ")).toBe(true);
        expect(routes.indexOf("import { ArticleController }")).toBeLessThan(
            routes.indexOf("export function registerWebRoutes"),
        );
        expect(existsSync(join(root, "resources/views/articles.tsx"))).toBe(true);
    });

    test("make:controller --resource keeps import top-level when marker is indented", async () => {
        await writeFile(
            join(root, "routes/web.ts"),
            `import type { Router } from "@ninots/routing";

export function registerWebRoutes(router: Router): void {
    // -- nino:web-imports --
    router.group({ middleware: ["web"] }, () => {
        // -- nino:web-bindings --
        // -- nino:web-routes --
    });
}
`,
        );

        const kernel = createKernel(root);
        const exitCode = await kernel.run(["make:controller", "LegacyController", "--resource"]);

        expect(exitCode).toBe(0);

        const routes = await readFile(join(root, "routes/web.ts"), "utf8");
        const importLine = routes
            .split("\n")
            .find((line) => line.includes("LegacyController") && line.trimStart().startsWith("import "));

        expect(importLine?.startsWith("import ")).toBe(true);
        expect(routes.indexOf("import { LegacyController }")).toBeLessThan(
            routes.indexOf("export function registerWebRoutes"),
        );
        expect(routes).toContain('router.post("/legacies"');
    });

    test("make:controller --api patches api routes without POST", async () => {
        const kernel = createKernel(root);
        const exitCode = await kernel.run(["make:controller", "NoteController", "--api"]);

        expect(exitCode).toBe(0);

        const routes = await readFile(join(root, "routes/api.ts"), "utf8");
        expect(routes).toContain('router.get("/notes"');
        expect(routes).not.toContain('router.post("/notes"');

        const importLine = routes
            .split("\n")
            .find((line) => line.includes("NoteController") && line.trimStart().startsWith("import "));
        expect(importLine?.startsWith("import ")).toBe(true);
        expect(routes.indexOf("import { NoteController }")).toBeLessThan(
            routes.indexOf("export function registerApiRoutes"),
        );
    });

    test("make:controller refuses overwrite without --force", async () => {
        const kernel = createKernel(root);

        expect(await kernel.run(["make:controller", "PostController"])).toBe(0);
        expect(await kernel.run(["make:controller", "PostController"])).toBe(1);
    });

    test("make:controller --force overwrites existing controller", async () => {
        const kernel = createKernel(root);
        const controllerPath = join(root, "app/Http/Controllers/PostController.ts");

        await kernel.run(["make:controller", "PostController"]);
        await writeFile(controllerPath, "export const broken = true;\n");

        expect(await kernel.run(["make:controller", "PostController", "--force"])).toBe(0);

        const source = await readFile(controllerPath, "utf8");
        expect(source).toContain("export class PostController");
    });

    test("make:model creates model stub", async () => {
        const kernel = createKernel(root);
        const exitCode = await kernel.run(["make:model", "Product"]);

        expect(exitCode).toBe(0);

        const source = await readFile(join(root, "app/Models/Product.ts"), "utf8");
        expect(source).toContain('@Table("products")');
        expect(source).toContain("export class Product");
    });

    test("make:model --migration also creates migration", async () => {
        const kernel = createKernel(root);
        const exitCode = await kernel.run(["make:model", "Order", "--migration"]);

        expect(exitCode).toBe(0);
        expect(existsSync(join(root, "app/Models/Order.ts"))).toBe(true);

        const migrationsDir = join(root, "database/migrations");
        const files = await Array.fromAsync(new Bun.Glob("*.ts").scan(migrationsDir));
        expect(files.length).toBe(1);
    });

    test("make:migration creates timestamped migration file", async () => {
        const kernel = createKernel(root);
        const exitCode = await kernel.run(["make:migration", "create_tags_table"]);

        expect(exitCode).toBe(0);

        const migrationsDir = join(root, "database/migrations");
        const files = await Array.fromAsync(new Bun.Glob("*.ts").scan(migrationsDir));

        expect(files.length).toBe(1);
        expect(files[0]).toMatch(/create_tags_table\.ts$/);

        const source = await readFile(join(migrationsDir, files[0] ?? ""), "utf8");
        expect(source).toContain("CREATE TABLE IF NOT EXISTS tags");
    });

    test("make:view creates TSX view component", async () => {
        const kernel = createKernel(root);
        const exitCode = await kernel.run(["make:view", "dashboard"]);

        expect(exitCode).toBe(0);

        const source = await readFile(join(root, "resources/views/dashboard.tsx"), "utf8");
        expect(source).toContain("export const Dashboard");
        expect(source).toContain("withLayout");
    });

    test("make:module creates provider, routes, and registers providers", async () => {
        const kernel = createKernel(root);
        const exitCode = await kernel.run(["make:module", "Billing"]);

        expect(exitCode).toBe(0);

        const providerPath = join(
            root,
            "app/Modules/Billing/Providers/BillingServiceProvider.ts",
        );
        const routesPath = join(root, "app/Modules/Billing/routes.ts");

        expect(existsSync(providerPath)).toBe(true);
        expect(existsSync(routesPath)).toBe(true);
        expect(existsSync(join(root, "src"))).toBe(false);

        const provider = await readFile(providerPath, "utf8");
        expect(provider).toContain("export class BillingServiceProvider");
        expect(provider).toContain("registerBillingRoutes");

        const routes = await readFile(routesPath, "utf8");
        expect(routes).toContain("export function registerBillingRoutes");
        expect(routes).toContain('prefix: "/billing"');

        const providers = await readFile(join(root, "bootstrap/providers.ts"), "utf8");
        expect(providers).toContain(
            'import { BillingServiceProvider } from "@/app/Modules/Billing/Providers/BillingServiceProvider";',
        );
        expect(providers).toContain("BillingServiceProvider,");
        expect(providers.indexOf("import { BillingServiceProvider }")).toBeLessThan(
            providers.indexOf("export async function registerProviders"),
        );
    });

    test("make:module --all creates controller, model, and migration under module paths", async () => {
        const kernel = createKernel(root);
        const exitCode = await kernel.run(["make:module", "Catalog", "--all"]);

        expect(exitCode).toBe(0);
        expect(
            existsSync(join(root, "app/Modules/Catalog/Http/Controllers/CatalogController.ts")),
        ).toBe(true);
        expect(existsSync(join(root, "app/Modules/Catalog/Models/Catalog.ts"))).toBe(true);
        expect(existsSync(join(root, "src"))).toBe(false);

        const migrationsDir = join(root, "database/migrations");
        const files = await Array.fromAsync(new Bun.Glob("*.ts").scan(migrationsDir));
        expect(files.length).toBe(1);
        expect(files[0]).toMatch(/create_catalogs_table\.ts$/);
    });

    test("make:module refuses overwrite without --force", async () => {
        const kernel = createKernel(root);

        expect(await kernel.run(["make:module", "Billing"])).toBe(0);
        expect(await kernel.run(["make:module", "Billing"])).toBe(1);
    });

    test("make:module --force overwrites existing module stubs", async () => {
        const kernel = createKernel(root);
        const routesPath = join(root, "app/Modules/Billing/routes.ts");

        expect(await kernel.run(["make:module", "Billing"])).toBe(0);
        await writeFile(routesPath, "export const broken = true;\n");

        expect(await kernel.run(["make:module", "Billing", "--force"])).toBe(0);

        const routes = await readFile(routesPath, "utf8");
        expect(routes).toContain("export function registerBillingRoutes");
    });

    test("make:module --controller only adds controller", async () => {
        const kernel = createKernel(root);
        const exitCode = await kernel.run(["make:module", "Orders", "--controller"]);

        expect(exitCode).toBe(0);
        expect(
            existsSync(join(root, "app/Modules/Orders/Http/Controllers/OrdersController.ts")),
        ).toBe(true);
        expect(existsSync(join(root, "app/Modules/Orders/Models/Orders.ts"))).toBe(false);

        const migrationsDir = join(root, "database/migrations");
        const files = await Array.fromAsync(new Bun.Glob("*.ts").scan(migrationsDir));
        expect(files.length).toBe(0);
    });
});
