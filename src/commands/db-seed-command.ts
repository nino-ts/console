import { Command } from "../command";
import type { SeederRunnerLike } from "../contracts/cli-contracts";

export interface DbSeedCommandOptions {
    readonly resolveSeederRunner: () => SeederRunnerLike | Promise<SeederRunnerLike>;
}

/**
 * Seed the database using the application DatabaseSeeder.
 */
export class DbSeedCommand extends Command {
    signature = "db:seed";
    description = "Seed the database with records";

    constructor(private readonly options: DbSeedCommandOptions) {
        super();
    }

    async handle(): Promise<number> {
        try {
            const runner = await this.options.resolveSeederRunner();
            this.info("Seeding database.");
            await runner.run();
            this.success("Database seeded.");
            return 0;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.error(`Seeding failed: ${message}`);
            return 1;
        }
    }
}
