import { Command } from "../command";
import {
    normalizeModelName,
    PathResolver,
    StubExistsError,
    writeStubFromTemplate,
    type GeneratorPathsConfig,
} from "../generator";
import { MakeMigrationCommand } from "./make-migration-command";

export interface MakeModelCommandOptions {
    readonly paths?: GeneratorPathsConfig;
}

/**
 * Generate a model class and optional migration.
 */
export class MakeModelCommand extends Command {
    protected override signature = "make:model {name} {--migration} {--force}";
    protected override description = "Create a new model class";

    private readonly resolver: PathResolver;

    constructor(options: MakeModelCommandOptions = {}) {
        super();
        this.resolver = new PathResolver({
            basePath: options.paths?.basePath ?? process.cwd(),
            ...options.paths,
        });
    }

    async handle(): Promise<number> {
        const name = this.argument("name");

        if (!name) {
            this.error("Model name is required.");
            return 1;
        }

        const withMigration = Boolean(this.option("migration"));
        const force = Boolean(this.option("force"));
        const names = normalizeModelName(name);

        try {
            const result = await writeStubFromTemplate({
                force,
                replacements: {
                    className: names.className,
                    tableName: names.tableName,
                },
                targetPath: this.resolver.modelPath(names.fileName),
                template: "model",
            });

            this.success(`Model ${result}: ${this.resolver.modelPath(names.fileName)}`);

            if (withMigration) {
                const migrationCommand = new MakeMigrationCommand({
                    paths: { basePath: this.resolver.basePath },
                });
                migrationCommand.setArguments({
                    name: `create_${names.tableName}_table`,
                });
                migrationCommand.setOptions({ force });
                migrationCommand.setOutput({
                    writeLine: (text: string) => {
                        this.line(text);
                    },
                });

                const migrationExitCode = await migrationCommand.handle();
                if (migrationExitCode !== 0) {
                    return migrationExitCode;
                }
            }

            return 0;
        } catch (error: unknown) {
            if (error instanceof StubExistsError) {
                this.error(error.message);
                return 1;
            }

            const message = error instanceof Error ? error.message : String(error);
            this.error(`Failed to create model: ${message}`);
            return 1;
        }
    }
}
