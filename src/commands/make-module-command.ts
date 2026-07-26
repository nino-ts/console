import { Command } from "../command";
import {
    appendProviderRegistration,
    normalizeModelName,
    normalizeModuleName,
    PathResolver,
    StubExistsError,
    writeStubFromTemplate,
    type GeneratorPathsConfig,
} from "../generator";
import { MakeControllerCommand } from "./make-controller-command";
import { MakeMigrationCommand } from "./make-migration-command";
import { MakeModelCommand } from "./make-model-command";

export interface MakeModuleCommandOptions {
    readonly paths?: GeneratorPathsConfig;
}

/**
 * Generate a domain module skeleton (Provider + routes) with optional resources.
 */
export class MakeModuleCommand extends Command {
    protected override signature =
        "make:module {name} {--controller} {--model} {--migration} {--all} {--force}";
    protected override description = "Create a new application module";

    private readonly resolver: PathResolver;

    constructor(options: MakeModuleCommandOptions = {}) {
        super();
        this.resolver = new PathResolver({
            basePath: options.paths?.basePath ?? process.cwd(),
            ...options.paths,
        });
    }

    async handle(): Promise<number> {
        const name = this.argument("name");

        if (!name) {
            this.error("Module name is required.");
            return 1;
        }

        const force = Boolean(this.option("force"));
        const withAll = Boolean(this.option("all"));
        const withController = withAll || Boolean(this.option("controller"));
        const withModel = withAll || Boolean(this.option("model"));
        const withMigration = withAll || Boolean(this.option("migration"));

        const names = normalizeModuleName(name);

        try {
            const providerResult = await writeStubFromTemplate({
                force,
                replacements: {
                    className: names.className,
                    providerClassName: names.providerClassName,
                    routesImportPath: names.routesImportPath,
                    routesRegisterName: names.routesRegisterName,
                },
                targetPath: this.resolver.moduleProviderPath(
                    names.className,
                    names.providerFileName,
                ),
                template: "module-provider",
            });

            this.success(
                `Provider ${providerResult}: ${this.resolver.moduleProviderPath(names.className, names.providerFileName)}`,
            );

            const routesResult = await writeStubFromTemplate({
                force,
                replacements: {
                    className: names.className,
                    routePrefix: names.routePrefix,
                    routesRegisterName: names.routesRegisterName,
                },
                targetPath: this.resolver.moduleRoutesPath(names.className),
                template: "module-routes",
            });

            this.success(
                `Routes ${routesResult}: ${this.resolver.moduleRoutesPath(names.className)}`,
            );

            await appendProviderRegistration(
                this.resolver.providersFile(),
                `import { ${names.providerClassName} } from "${names.providerImportPath}";`,
                names.providerClassName,
            );
            this.info(`Provider registered in ${this.resolver.providersFile()}`);

            if (withController) {
                const controllerExit = await this.generateController(names.className, force);
                if (controllerExit !== 0) {
                    return controllerExit;
                }
            }

            if (withModel) {
                const modelExit = await this.generateModel(names.className, force);
                if (modelExit !== 0) {
                    return modelExit;
                }
            }

            if (withMigration) {
                const migrationExit = await this.generateMigration(names.className, force);
                if (migrationExit !== 0) {
                    return migrationExit;
                }
            }

            return 0;
        } catch (error: unknown) {
            if (error instanceof StubExistsError) {
                this.error(error.message);
                return 1;
            }

            const message = error instanceof Error ? error.message : String(error);
            this.error(`Failed to create module: ${message}`);
            return 1;
        }
    }

    private async generateController(moduleName: string, force: boolean): Promise<number> {
        const command = new MakeControllerCommand({
            paths: {
                basePath: this.resolver.basePath,
                controllersDirectory: this.resolver.moduleControllersDirectory(moduleName),
            },
        });

        command.setArguments({ name: moduleName });
        command.setOptions({ force });
        command.setOutput({
            writeLine: (text: string) => {
                this.line(text);
            },
        });

        return command.handle();
    }

    private async generateModel(moduleName: string, force: boolean): Promise<number> {
        const command = new MakeModelCommand({
            paths: {
                basePath: this.resolver.basePath,
                modelsDirectory: this.resolver.moduleModelsDirectory(moduleName),
            },
        });

        command.setArguments({ name: moduleName });
        command.setOptions({ force });
        command.setOutput({
            writeLine: (text: string) => {
                this.line(text);
            },
        });

        return command.handle();
    }

    private async generateMigration(moduleName: string, force: boolean): Promise<number> {
        const tableName = normalizeModelName(moduleName).tableName;
        const command = new MakeMigrationCommand({
            paths: { basePath: this.resolver.basePath },
        });

        command.setArguments({ name: `create_${tableName}_table` });
        command.setOptions({ force });
        command.setOutput({
            writeLine: (text: string) => {
                this.line(text);
            },
        });

        return command.handle();
    }
}
