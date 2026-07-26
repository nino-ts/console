import { Command } from "../command";
import {
    normalizeViewName,
    PathResolver,
    StubExistsError,
    writeStubFromTemplate,
    type GeneratorPathsConfig,
} from "../generator";

export interface MakeViewCommandOptions {
    readonly paths?: GeneratorPathsConfig;
}

/**
 * Generate a TSX view component.
 */
export class MakeViewCommand extends Command {
    protected override signature = "make:view {name} {--force}";
    protected override description = "Create a new view component";

    private readonly resolver: PathResolver;

    constructor(options: MakeViewCommandOptions = {}) {
        super();
        this.resolver = new PathResolver({
            basePath: options.paths?.basePath ?? process.cwd(),
            ...options.paths,
        });
    }

    async handle(): Promise<number> {
        const name = this.argument("name");

        if (!name) {
            this.error("View name is required.");
            return 1;
        }

        const force = Boolean(this.option("force"));
        const names = normalizeViewName(name);

        try {
            const result = await writeStubFromTemplate({
                force,
                replacements: {
                    exportName: names.exportName,
                },
                targetPath: this.resolver.viewPath(names.fileName),
                template: "view",
            });

            this.success(`View ${result}: ${this.resolver.viewPath(names.fileName)}`);
            return 0;
        } catch (error: unknown) {
            if (error instanceof StubExistsError) {
                this.error(error.message);
                return 1;
            }

            const message = error instanceof Error ? error.message : String(error);
            this.error(`Failed to create view: ${message}`);
            return 1;
        }
    }
}
