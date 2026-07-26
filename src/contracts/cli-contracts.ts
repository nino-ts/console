/**
 * Local duck-typed contracts for CLI domain commands (zero `@ninots/*` imports).
 *
 * @packageDocumentation
 */

/**
 * Minimal migrator surface used by migrate / rollback / refresh commands.
 */
export type MigratorLike = {
    run(onMigrating?: (migration: string) => void): Promise<string[]>;
    rollback(
        options?: { step?: number },
        onRollingBack?: (migration: string) => void,
    ): Promise<string[]>;
    refresh(
        options?: { step?: number },
        onEvent?: (event: { type: "up" | "down"; migration: string }) => void,
    ): Promise<{ rolledBack: string[]; migrated: string[] }>;
};

/**
 * Minimal seeder runner surface.
 */
export type SeederRunnerLike = {
    run(): Promise<void> | void;
};

/**
 * Minimal router surface for routes:compile.
 */
export type RouterLike = {
    getRoutes(): unknown[];
};

/**
 * Emitter that turns route list into typed registry `.d.ts` content.
 */
export type EmitRouteRegistry = (routes: unknown[]) => string;
