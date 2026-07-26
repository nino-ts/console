import { Command } from "../command";
import {
    normalizeMigrationName,
    normalizeModelName,
    PathResolver,
    StubExistsError,
    writeStubFromTemplate,
    type GeneratorPathsConfig,
} from "../generator";

export interface MakeMigrationCommandOptions {
    readonly paths?: GeneratorPathsConfig | PathResolver;
}

/**
 * Generate a timestamped database migration.
 */
export class MakeMigrationCommand extends Command {
    protected override signature = "make:migration {name} {--force}";
    protected override description = "Create a new database migration";

    private readonly resolver: PathResolver;

    constructor(options: MakeMigrationCommandOptions = {}) {
        super();
        if (options.paths instanceof PathResolver) {
            this.resolver = options.paths;
        } else {
            this.resolver = new PathResolver({
                basePath: options.paths?.basePath ?? process.cwd(),
                ...options.paths,
            });
        }
    }

    async handle(): Promise<number> {
        const name = this.argument("name");

        if (!name) {
            this.error("Migration name is required.");
            return 1;
        }

        const force = Boolean(this.option("force"));
        const migrationNames = normalizeMigrationName(name);
        const tableName = inferTableName(name);

        try {
            const result = await writeStubFromTemplate({
                force,
                replacements: {
                    className: migrationNames.className,
                    tableName,
                },
                targetPath: this.resolver.migrationPath(migrationNames.fileName),
                template: "migration",
            });

            this.success(`Migration ${result}: ${this.resolver.migrationPath(migrationNames.fileName)}`);
            return 0;
        } catch (error: unknown) {
            if (error instanceof StubExistsError) {
                this.error(error.message);
                return 1;
            }

            const message = error instanceof Error ? error.message : String(error);
            this.error(`Failed to create migration: ${message}`);
            return 1;
        }
    }
}

function inferTableName(migrationName: string): string {
    const normalized = migrationName
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase();

    if (normalized.startsWith("create_") && normalized.endsWith("_table")) {
        return normalized.slice("create_".length, -"_table".length);
    }

    return normalizeModelName(migrationName).tableName;
}
