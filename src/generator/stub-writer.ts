import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { applyStubReplacements } from "./naming";
import { getStubTemplate, type StubTemplateName } from "./stub-templates";

export type StubWriteResult = "created" | "overwritten";

export class StubExistsError extends Error {
    constructor(targetPath: string) {
        super(`File already exists: ${targetPath}. Use --force to overwrite.`);
        this.name = "StubExistsError";
    }
}

export async function writeGeneratedFile(options: {
    readonly targetPath: string;
    readonly content: string;
    readonly force: boolean;
}): Promise<StubWriteResult> {
    const exists = existsSync(options.targetPath);

    if (exists && !options.force) {
        throw new StubExistsError(options.targetPath);
    }

    await mkdir(path.dirname(options.targetPath), { recursive: true });
    await writeFile(options.targetPath, options.content, "utf8");

    return exists ? "overwritten" : "created";
}

export async function writeStubFromTemplate(options: {
    readonly template: StubTemplateName;
    readonly targetPath: string;
    readonly replacements: Record<string, string>;
    readonly force: boolean;
}): Promise<StubWriteResult> {
    const content = applyStubReplacements(getStubTemplate(options.template), options.replacements);

    return writeGeneratedFile({
        content,
        force: options.force,
        targetPath: options.targetPath,
    });
}
