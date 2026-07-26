import { join } from "node:path";
import { Command } from "../command";
import type { EmitRouteRegistry, RouterLike } from "../contracts/cli-contracts";

export interface RoutesCompileCommandOptions {
    readonly resolveRouter: () => RouterLike | Promise<RouterLike>;
    /**
     * Injected emitter (typically `emitRouteRegistry` from `@ninots/routing` in the app).
     */
    readonly emitRouteRegistry: EmitRouteRegistry;
}

/**
 * Compile a typed route registry (`.d.ts`) from the application's Router.
 *
 * Boot path: inject `resolveRouter` + `emitRouteRegistry` —
 * typically `bootstrap()` → `ROUTER_KEY` → `getRoutes()`. Writes via `Bun.write`.
 */
export class RoutesCompileCommand extends Command {
    signature = "routes:compile {--out=types/routes.d.ts}";
    description = "Compile typed route registry from registered routes";

    constructor(private readonly options: RoutesCompileCommandOptions) {
        super();
    }

    async handle(): Promise<number> {
        try {
            const router = await this.options.resolveRouter();
            const outOption = this.option("out");
            const outRel = typeof outOption === "string" && outOption.length > 0 ? outOption : "types/routes.d.ts";
            const outPath = join(process.cwd(), outRel);

            const content = this.options.emitRouteRegistry(router.getRoutes());
            await Bun.write(outPath, content);
            this.success(`Wrote ${outRel}`);
            return 0;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.error(`routes:compile failed: ${message}`);
            return 1;
        }
    }
}
