/**
 * Name normalization helpers for CLI generators.
 */

export interface ControllerNames {
    readonly className: string;
    readonly fileName: string;
    readonly importPath: string;
    readonly routePrefix: string;
    readonly variableName: string;
}

export interface ModelNames {
    readonly className: string;
    readonly fileName: string;
    readonly importPath: string;
    readonly tableName: string;
}

export interface MigrationNames {
    readonly className: string;
    readonly fileName: string;
}

export interface ViewNames {
    readonly exportName: string;
    readonly fileName: string;
    readonly importPath: string;
}

export interface ModuleNames {
    readonly className: string;
    readonly providerClassName: string;
    readonly providerFileName: string;
    readonly providerImportPath: string;
    readonly routesImportPath: string;
    readonly routesRegisterName: string;
    readonly routePrefix: string;
}

function stripSuffix(value: string, suffix: string): string {
    if (value.endsWith(suffix)) {
        return value.slice(0, -suffix.length);
    }

    return value;
}

function toPascalCase(value: string): string {
    return value
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .split(/[^a-zA-Z0-9]+/)
        .filter((part) => part.length > 0)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join("");
}

function toKebabCase(value: string): string {
    return value
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
}

function toSnakeCase(value: string): string {
    return value
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase();
}

function pluralize(value: string): string {
    if (value.endsWith("s")) {
        return value;
    }

    if (value.endsWith("y") && value.length > 1 && !"aeiou".includes(value.at(-2) ?? "")) {
        return `${value.slice(0, -1)}ies`;
    }

    return `${value}s`;
}

export function normalizeControllerName(input: string): ControllerNames {
    const base = stripSuffix(toPascalCase(input), "Controller");
    const className = `${base}Controller`;
    const fileName = className;
    const routePrefix = pluralize(toKebabCase(base));
    const variableName = base.charAt(0).toLowerCase() + base.slice(1);

    return {
        className,
        fileName,
        importPath: `@/app/Http/Controllers/${fileName}`,
        routePrefix,
        variableName,
    };
}

export function normalizeModelName(input: string): ModelNames {
    const className = stripSuffix(toPascalCase(input), "Model");
    const fileName = className;
    const tableName = pluralize(toSnakeCase(className));

    return {
        className,
        fileName,
        importPath: `@/app/Models/${fileName}`,
        tableName,
    };
}

export function normalizeMigrationName(input: string): MigrationNames {
    const normalized = toSnakeCase(input);
    const className = normalized
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");

    return {
        className,
        fileName: `${migrationTimestamp()}_${normalized}.ts`,
    };
}

export function migrationTimestamp(date: Date = new Date()): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");

    return `${year}_${month}_${day}_${hours}${minutes}${seconds}`;
}

export function normalizeViewName(input: string): ViewNames {
    const normalized = input.replace(/\./g, "/");
    const segments = normalized.split("/").filter((segment) => segment.length > 0);
    const fileBase = segments.length > 0 ? segments[segments.length - 1] ?? input : input;
    const fileName = `${toKebabCase(fileBase)}.tsx`;
    const exportName = toPascalCase(fileBase);
    const importPath =
        segments.length > 1
            ? `@/resources/views/${segments.slice(0, -1).map(toKebabCase).join("/")}/${toKebabCase(fileBase)}`
            : `@/resources/views/${toKebabCase(fileBase)}`;

    return {
        exportName,
        fileName: segments.length > 1 ? `${segments.slice(0, -1).map(toKebabCase).join("/")}/${fileName}` : fileName,
        importPath,
    };
}

export function normalizeModuleName(input: string): ModuleNames {
    const className = stripSuffix(toPascalCase(input), "Module");
    const providerClassName = `${className}ServiceProvider`;
    const providerFileName = providerClassName;
    const routesRegisterName = `register${className}Routes`;
    const routePrefix = toKebabCase(className);

    return {
        className,
        providerClassName,
        providerFileName,
        providerImportPath: `@/app/Modules/${className}/Providers/${providerFileName}`,
        routesImportPath: `@/app/Modules/${className}/routes`,
        routesRegisterName,
        routePrefix,
    };
}

export function applyStubReplacements(
    template: string,
    replacements: Record<string, string>,
): string {
    let content = template;

    for (const [key, value] of Object.entries(replacements)) {
        content = content.replaceAll(`{{ ${key} }}`, value);
    }

    return content;
}
