import { readFile, writeFile } from "node:fs/promises";

const WEB_IMPORT_MARKER = "// -- nino:web-imports --";
const WEB_ROUTE_MARKER = "// -- nino:web-routes --";
const API_IMPORT_MARKER = "// -- nino:api-imports --";
const API_ROUTE_MARKER = "// -- nino:api-routes --";

export async function appendWebRoutes(
    routesFile: string,
    importLine: string,
    routeBlock: string,
): Promise<void> {
    await appendRoutes(routesFile, WEB_IMPORT_MARKER, WEB_ROUTE_MARKER, importLine, routeBlock);
}

export async function appendApiRoutes(
    routesFile: string,
    importLine: string,
    routeBlock: string,
): Promise<void> {
    await appendRoutes(routesFile, API_IMPORT_MARKER, API_ROUTE_MARKER, importLine, routeBlock);
}

async function appendRoutes(
    routesFile: string,
    importMarker: string,
    routeMarker: string,
    importLine: string,
    routeBlock: string,
): Promise<void> {
    const source = await readFile(routesFile, "utf8");

    if (!source.includes(importMarker) || !source.includes(routeMarker)) {
        throw new Error(
            `Routes file is missing generator markers (${importMarker}, ${routeMarker}): ${routesFile}`,
        );
    }

    let updated = source;

    if (!updated.includes(importLine)) {
        updated = insertTopLevelImport(updated, importLine, importMarker);
    }

    if (!updated.includes(routeBlock.trim())) {
        updated = updated.replace(routeMarker, `${routeBlock}\n        ${routeMarker}`);
    }

    await writeFile(routesFile, updated, "utf8");
}

/**
 * Insert an import at true file top-level (never inside a function body).
 *
 * Prefers placing the import immediately before an unindented import marker.
 * If the marker is indented (legacy starter layouts), falls back to inserting
 * after the last top-level import statement.
 */
export function insertTopLevelImport(
    source: string,
    importLine: string,
    importMarker: string,
): string {
    if (source.includes(importLine)) {
        return source;
    }

    const lines = source.split("\n");
    const unindentedMarkerIndex = lines.findIndex((line) => line === importMarker);

    if (unindentedMarkerIndex !== -1) {
        lines.splice(unindentedMarkerIndex, 0, importLine);
        return lines.join("\n");
    }

    const insertAt = findTopLevelImportInsertionIndex(lines);
    lines.splice(insertAt, 0, importLine);
    return lines.join("\n");
}

function findTopLevelImportInsertionIndex(lines: readonly string[]): number {
    let insertAt = 0;
    let index = 0;

    while (index < lines.length) {
        const line = lines[index] ?? "";
        const trimmed = line.trimStart();

        if (isImportStatementStart(trimmed)) {
            let end = index;
            while (end < lines.length && !(lines[end] ?? "").includes(";")) {
                end += 1;
            }
            insertAt = Math.min(end + 1, lines.length);
            index = end + 1;
            continue;
        }

        if (
            insertAt === 0 &&
            (trimmed === "" ||
                trimmed.startsWith("//") ||
                trimmed.startsWith("/*") ||
                trimmed.startsWith("*") ||
                trimmed.startsWith("*/"))
        ) {
            index += 1;
            continue;
        }

        break;
    }

    return insertAt;
}

function isImportStatementStart(trimmed: string): boolean {
    return (
        trimmed.startsWith("import ") ||
        trimmed.startsWith("import\t") ||
        trimmed.startsWith("import{") ||
        trimmed === "import"
    );
}
