import { Command } from "../command";
import type { MigratorLike } from "../contracts/cli-contracts";

export interface MigrateRollbackCommandOptions {
    readonly resolveMigrator: () => MigratorLike | Promise<MigratorLike>;
}

/**
 * Roll back the last database migration batch (or `--step` migrations).
 */
export class MigrateRollbackCommand extends Command {
    signature = "migrate:rollback {--step=}";
    description = "Rollback the last database migration batch";

    constructor(private readonly options: MigrateRollbackCommandOptions) {
        super();
    }

    async handle(): Promise<number> {
        try {
            const migrator = await this.options.resolveMigrator();
            const step = parseOptionalPositiveInt(this.option("step"));
            const rolledBack = await migrator.rollback(step !== undefined ? { step } : {}, (migration: string) => {
                this.info(`Rolling back: ${migration}`);
            });

            if (rolledBack.length === 0) {
                this.info("Nothing to rollback.");
                return 0;
            }

            this.success(`Rolled back ${rolledBack.length} migration(s).`);
            return 0;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.error(`Rollback failed: ${message}`);
            return 1;
        }
    }
}

function parseOptionalPositiveInt(value: string | boolean | undefined): number | undefined {
    if (value === undefined || value === true || value === "") {
        return undefined;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error("The --step option must be a positive integer.");
    }

    return parsed;
}
