import { describe, expect, test } from "bun:test";
import {
    DbSeedCommand,
    Kernel,
    MigrateCommand,
    MigrateRefreshCommand,
    MigrateRollbackCommand,
} from "../../index";
import type { MigratorLike, SeederRunnerLike } from "../../src/contracts/cli-contracts";

function createMigratorFake(initialPending: string[] = ["2024_01_01_create_users"]): MigratorLike {
    let pending = [...initialPending];
    let applied: string[] = [];

    return {
        async run(onMigrating?: (migration: string) => void): Promise<string[]> {
            const executed = [...pending];
            for (const migration of executed) {
                onMigrating?.(migration);
            }
            applied = [...applied, ...executed];
            pending = [];
            return executed;
        },
        async rollback(
            _options?: { step?: number },
            onRollingBack?: (migration: string) => void,
        ): Promise<string[]> {
            if (applied.length === 0) {
                return [];
            }
            const migration = applied.pop() as string;
            onRollingBack?.(migration);
            pending.unshift(migration);
            return [migration];
        },
        async refresh(
            _options?: { step?: number },
            onEvent?: (event: { type: "up" | "down"; migration: string }) => void,
        ): Promise<{ rolledBack: string[]; migrated: string[] }> {
            const rolledBack: string[] = [];
            while (applied.length > 0) {
                const migration = applied.pop() as string;
                onEvent?.({ type: "down", migration });
                pending.unshift(migration);
                rolledBack.push(migration);
            }
            const migrated = await this.run((migration) => onEvent?.({ type: "up", migration }));
            return { rolledBack, migrated };
        },
    };
}

class FakeSeederRunner implements SeederRunnerLike {
    public seeded = false;

    run(): void {
        this.seeded = true;
    }
}

describe("Database CLI commands", () => {
    test("MigrateCommand runs pending migrations", async () => {
        const kernel = new Kernel();
        const lines: string[] = [];
        const migrator = createMigratorFake();

        kernel.setOutput({
            writeLine(text: string): void {
                lines.push(text);
            },
        });

        kernel.register(
            new MigrateCommand({
                resolveMigrator: () => migrator,
            }),
        );

        const exitCode = await kernel.run(["migrate"]);

        expect(exitCode).toBe(0);
        expect(lines.some((line) => line.includes("Ran 1 migration"))).toBe(true);
    });

    test("MigrateRollbackCommand reverts the last batch", async () => {
        const migrator = createMigratorFake();
        await migrator.run();

        const kernel = new Kernel();
        const lines: string[] = [];

        kernel.setOutput({
            writeLine(text: string): void {
                lines.push(text);
            },
        });

        kernel.register(
            new MigrateRollbackCommand({
                resolveMigrator: () => migrator,
            }),
        );

        const exitCode = await kernel.run(["migrate:rollback"]);

        expect(exitCode).toBe(0);
        expect(lines.some((line) => line.includes("Rolled back 1 migration"))).toBe(true);
    });

    test("MigrateRefreshCommand rolls back and re-migrates", async () => {
        const migrator = createMigratorFake();
        await migrator.run();

        const kernel = new Kernel();
        const lines: string[] = [];

        kernel.setOutput({
            writeLine(text: string): void {
                lines.push(text);
            },
        });

        kernel.register(
            new MigrateRefreshCommand({
                resolveMigrator: () => migrator,
            }),
        );

        const exitCode = await kernel.run(["migrate:refresh"]);

        expect(exitCode).toBe(0);
        expect(lines.some((line) => line.includes("Refreshed:"))).toBe(true);
    });

    test("MigrateRefreshCommand --seed runs the configured seeder", async () => {
        const migrator = createMigratorFake();
        await migrator.run();
        const seeder = new FakeSeederRunner();

        const kernel = new Kernel();
        kernel.setOutput({
            writeLine(_text: string): void {},
        });

        kernel.register(
            new MigrateRefreshCommand({
                resolveMigrator: () => migrator,
                resolveSeederRunner: () => seeder,
            }),
        );

        const exitCode = await kernel.run(["migrate:refresh", "--seed"]);

        expect(exitCode).toBe(0);
        expect(seeder.seeded).toBe(true);
    });

    test("DbSeedCommand runs configured seeder", async () => {
        const kernel = new Kernel();
        const lines: string[] = [];
        const seeder = new FakeSeederRunner();

        kernel.setOutput({
            writeLine(text: string): void {
                lines.push(text);
            },
        });

        kernel.register(
            new DbSeedCommand({
                resolveSeederRunner: () => seeder,
            }),
        );

        const exitCode = await kernel.run(["db:seed"]);

        expect(exitCode).toBe(0);
        expect(seeder.seeded).toBe(true);
        expect(lines.some((line) => line.includes("Database seeded"))).toBe(true);
    });
});
