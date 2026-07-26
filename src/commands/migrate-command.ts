import { Command } from "../command";
import type { MigratorLike } from "../contracts/cli-contracts";

export interface MigrateCommandOptions {
    readonly resolveMigrator: () => MigratorLike | Promise<MigratorLike>;
}

/**
 * Run pending database migrations (forward-only).
 */
export class MigrateCommand extends Command {
    signature = "migrate";
    description = "Run pending database migrations";

    constructor(private readonly options: MigrateCommandOptions) {
        super();
    }

    async handle(): Promise<number> {
        try {
            const migrator = await this.options.resolveMigrator();
            const executed = await migrator.run((migration: string) => {
                this.info(`Migrating: ${migration}`);
            });

            if (executed.length === 0) {
                this.info("Nothing to migrate.");
                return 0;
            }

            this.success(`Ran ${executed.length} migration(s).`);
            return 0;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.error(`Migration failed: ${message}`);
            return 1;
        }
    }
}
