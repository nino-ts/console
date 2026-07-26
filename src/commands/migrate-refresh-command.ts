import { Command } from "../command";
import type { MigratorLike, SeederRunnerLike } from "../contracts/cli-contracts";

export interface MigrateRefreshCommandOptions {
    readonly resolveMigrator: () => MigratorLike | Promise<MigratorLike>;
    /** Required when `--seed` is passed; reuses the application `db:seed` runner. */
    readonly resolveSeederRunner?: () => SeederRunnerLike | Promise<SeederRunnerLike>;
}

/**
 * Reset (or step-rollback) and re-run all migrations; optional `--seed`.
 */
export class MigrateRefreshCommand extends Command {
    signature = "migrate:refresh {--step=} {--seed}";
    description = "Reset and re-run all migrations";

    constructor(private readonly options: MigrateRefreshCommandOptions) {
        super();
    }

    async handle(): Promise<number> {
        try {
            const migrator = await this.options.resolveMigrator();
            const step = parseOptionalPositiveInt(this.option("step"));
            const seed = this.option("seed") === true;

            if (seed && !this.options.resolveSeederRunner) {
                this.error("Seeding requested but no seeder runner is configured.");
                return 1;
            }

            const result = await migrator.refresh(step !== undefined ? { step } : {}, (event) => {
                if (event.type === "down") {
                    this.info(`Rolling back: ${event.migration}`);
                    return;
                }
                this.info(`Migrating: ${event.migration}`);
            });

            if (result.rolledBack.length === 0 && result.migrated.length === 0) {
                this.info("Nothing to refresh.");
            } else {
                this.success(
                    `Refreshed: rolled back ${result.rolledBack.length}, migrated ${result.migrated.length}.`,
                );
            }

            if (seed) {
                const resolveSeeder = this.options.resolveSeederRunner;
                if (!resolveSeeder) {
                    this.error("Seeding requested but no seeder runner is configured.");
                    return 1;
                }
                const runner = await resolveSeeder();
                this.info("Seeding database.");
                await runner.run();
                this.success("Database seeded.");
            }

            return 0;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.error(`Refresh failed: ${message}`);
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
