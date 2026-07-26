export {
    applyStubReplacements,
    migrationTimestamp,
    normalizeControllerName,
    normalizeMigrationName,
    normalizeModelName,
    normalizeModuleName,
    normalizeViewName,
    type ControllerNames,
    type MigrationNames,
    type ModelNames,
    type ModuleNames,
    type ViewNames,
} from "./naming";
export { PathResolver, type GeneratorPathsConfig } from "./path-resolver";
export {
    appendProviderRegistration,
    PROVIDER_IMPORT_MARKER,
    PROVIDER_LIST_MARKER,
} from "./provider-patcher";
export { appendApiRoutes, appendWebRoutes, insertTopLevelImport } from "./route-patcher";
export { getStubTemplate, STUB_TEMPLATES, type StubTemplateName } from "./stub-templates";
export {
    StubExistsError,
    writeGeneratedFile,
    writeStubFromTemplate,
    type StubWriteResult,
} from "./stub-writer";
