/**
 * @ninots/console - CLI Framework
 *
 * @packageDocumentation
 */

export { DbSeedCommand, type DbSeedCommandOptions } from "./src/commands/db-seed-command";
export { MakeControllerCommand, type MakeControllerCommandOptions } from "./src/commands/make-controller-command";
export { MakeMigrationCommand, type MakeMigrationCommandOptions } from "./src/commands/make-migration-command";
export { MakeModelCommand, type MakeModelCommandOptions } from "./src/commands/make-model-command";
export { MakeModuleCommand, type MakeModuleCommandOptions } from "./src/commands/make-module-command";
export { MakeViewCommand, type MakeViewCommandOptions } from "./src/commands/make-view-command";
export { MigrateCommand, type MigrateCommandOptions } from "./src/commands/migrate-command";
export {
    MigrateRefreshCommand,
    type MigrateRefreshCommandOptions,
} from "./src/commands/migrate-refresh-command";
export {
    MigrateRollbackCommand,
    type MigrateRollbackCommandOptions,
} from "./src/commands/migrate-rollback-command";
export {
    RoutesCompileCommand,
    type RoutesCompileCommandOptions,
} from "./src/commands/routes-compile-command";

export { Command } from "./src/command";
export {
    PathResolver,
    StubExistsError,
    applyStubReplacements,
    migrationTimestamp,
    normalizeControllerName,
    normalizeMigrationName,
    normalizeModelName,
    normalizeModuleName,
    normalizeViewName,
    type GeneratorPathsConfig,
    type StubWriteResult,
} from "./src/generator";
export type { CommandInterface } from "./src/contracts/command-interface";
export type {
    EmitRouteRegistry,
    MigratorLike,
    RouterLike,
    SeederRunnerLike,
} from "./src/contracts/cli-contracts";
export type { KernelInterface } from "./src/contracts/kernel-interface";
export { Kernel } from "./src/kernel";
export { OutputStyle } from "./src/output-style";
export type {
    CommandDefinition,
    CommandSignature,
    ParsedArguments,
} from "./src/types";
