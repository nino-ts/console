import { readFile, writeFile } from "node:fs/promises";
import { insertTopLevelImport } from "./route-patcher";

export const PROVIDER_IMPORT_MARKER = "// -- nino:provider-imports --";
export const PROVIDER_LIST_MARKER = "// -- nino:providers --";

/**
 * Append a module service provider import + registration to bootstrap/providers.ts.
 */
export async function appendProviderRegistration(
    providersFile: string,
    importLine: string,
    providerClassName: string,
): Promise<void> {
    const source = await readFile(providersFile, "utf8");

    if (!source.includes(PROVIDER_IMPORT_MARKER) || !source.includes(PROVIDER_LIST_MARKER)) {
        throw new Error(
            `Providers file is missing generator markers (${PROVIDER_IMPORT_MARKER}, ${PROVIDER_LIST_MARKER}): ${providersFile}`,
        );
    }

    let updated = source;

    if (!updated.includes(importLine)) {
        updated = insertTopLevelImport(updated, importLine, PROVIDER_IMPORT_MARKER);
    }

    const listEntry = `${providerClassName},`;
    if (!updated.includes(listEntry)) {
        updated = updated.replace(
            PROVIDER_LIST_MARKER,
            `${providerClassName},\n        ${PROVIDER_LIST_MARKER}`,
        );
    }

    await writeFile(providersFile, updated, "utf8");
}
