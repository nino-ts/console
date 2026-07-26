import { existsSync } from "node:fs";
import { Command } from "../command";
import {
    appendApiRoutes,
    appendWebRoutes,
    applyStubReplacements,
    getStubTemplate,
    normalizeControllerName,
    normalizeViewName,
    PathResolver,
    StubExistsError,
    writeStubFromTemplate,
    type GeneratorPathsConfig,
} from "../generator";

export interface MakeControllerCommandOptions {
    readonly paths?: GeneratorPathsConfig;
}

/**
 * Generate an HTTP controller class and optional resource routes.
 */
export class MakeControllerCommand extends Command {
    protected override signature = "make:controller {name} {--resource} {--api} {--force}";
    protected override description = "Create a new controller class";

    private readonly resolver: PathResolver;

    constructor(options: MakeControllerCommandOptions = {}) {
        super();
        this.resolver = new PathResolver({
            basePath: options.paths?.basePath ?? process.cwd(),
            ...options.paths,
        });
    }

    async handle(): Promise<number> {
        const name = this.argument("name");

        if (!name) {
            this.error("Controller name is required.");
            return 1;
        }

        const resource = Boolean(this.option("resource"));
        const api = Boolean(this.option("api"));
        const force = Boolean(this.option("force"));

        if (resource && api) {
            this.error("Use either --resource or --api, not both.");
            return 1;
        }

        const names = normalizeControllerName(name);
        const viewNames = normalizeViewName(names.routePrefix);

        try {
            const stubFile = resource
                ? "controller-resource"
                : api
                  ? "controller-api"
                  : "controller";

            const result = await writeStubFromTemplate({
                force,
                replacements: {
                    className: names.className,
                    routePrefix: names.routePrefix,
                    variableName: names.variableName,
                    viewExportName: viewNames.exportName,
                    viewImportPath: viewNames.importPath,
                },
                targetPath: this.resolver.controllerPath(names.fileName),
                template: stubFile,
            });

            this.success(`Controller ${result}: ${this.resolver.controllerPath(names.fileName)}`);

            if (resource) {
                await this.ensureResourceView(viewNames, force);
                await this.ensureWebBinding(names);
                await this.writeWebResourceRoutes(names);
            }

            if (api) {
                await this.writeApiResourceRoutes(names);
            }

            return 0;
        } catch (error: unknown) {
            if (error instanceof StubExistsError) {
                this.error(error.message);
                return 1;
            }

            const message = error instanceof Error ? error.message : String(error);
            this.error(`Failed to create controller: ${message}`);
            return 1;
        }
    }

    private async ensureResourceView(
        viewNames: ReturnType<typeof normalizeViewName>,
        force: boolean,
    ): Promise<void> {
        const targetPath = this.resolver.viewPath(viewNames.fileName);

        if (existsSync(targetPath) && !force) {
            this.info(`View already exists, skipping: ${targetPath}`);
            return;
        }

        const result = await writeStubFromTemplate({
            force,
            replacements: {
                exportName: viewNames.exportName,
            },
            targetPath,
            template: "view",
        });

        this.success(`View ${result}: ${targetPath}`);
    }

    private async ensureWebBinding(
        names: ReturnType<typeof normalizeControllerName>,
    ): Promise<void> {
        const bindingLine = `        const ${names.variableName} = new ${names.className}();`;
        const routesFile = await Bun.file(this.resolver.webRoutesFile()).text();
        const marker = "// -- nino:web-bindings --";

        if (!routesFile.includes(marker)) {
            throw new Error(`Web routes file is missing binding marker: ${marker}`);
        }

        if (!routesFile.includes(bindingLine)) {
            const updatedBindings = routesFile.replace(marker, `${bindingLine}\n        ${marker}`);
            await Bun.write(this.resolver.webRoutesFile(), updatedBindings);
        }
    }

    private async writeWebResourceRoutes(
        names: ReturnType<typeof normalizeControllerName>,
    ): Promise<void> {
        const importLine = `import { ${names.className} } from "${names.importPath}";`;
        const routeBlock = applyStubReplacements(getStubTemplate("web-resource-routes"), {
            routePrefix: names.routePrefix,
            variableName: names.variableName,
        });

        await appendWebRoutes(this.resolver.webRoutesFile(), importLine, routeBlock);
        this.info(`Web resource routes appended to ${this.resolver.webRoutesFile()}`);
    }

    private async writeApiResourceRoutes(
        names: ReturnType<typeof normalizeControllerName>,
    ): Promise<void> {
        const importLine = `import { ${names.className} } from "${names.importPath}";`;
        const routeBlock = applyStubReplacements(getStubTemplate("api-resource-routes"), {
            routePrefix: names.routePrefix,
            variableName: names.variableName,
        });

        const bindingLine = `    const ${names.variableName} = new ${names.className}();`;
        const routesFile = await Bun.file(this.resolver.apiRoutesFile()).text();

        if (!routesFile.includes(bindingLine)) {
            const marker = "// -- nino:api-bindings --";
            if (!routesFile.includes(marker)) {
                throw new Error(`API routes file is missing binding marker: ${marker}`);
            }

            const updatedBindings = routesFile.replace(
                marker,
                `${bindingLine}\n    ${marker}`,
            );
            await Bun.write(this.resolver.apiRoutesFile(), updatedBindings);
        }

        await appendApiRoutes(this.resolver.apiRoutesFile(), importLine, routeBlock);
        this.info(`API resource routes appended to ${this.resolver.apiRoutesFile()}`);
    }
}
