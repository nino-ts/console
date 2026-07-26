export const STUB_TEMPLATES = {
    "api-resource-routes": `        router.get("/{{ routePrefix }}", () => {{ variableName }}.index()).name("{{ routePrefix }}.index");
        router.get("/{{ routePrefix }}/:id", (request, params) => {{ variableName }}.show(request, params)).name("{{ routePrefix }}.show");
        router.put("/{{ routePrefix }}/:id", (request, params) => {{ variableName }}.update(request, params)).name("{{ routePrefix }}.update");
        router.delete("/{{ routePrefix }}/:id", (request, params) => {{ variableName }}.destroy(request, params)).name("{{ routePrefix }}.destroy");
`,
    controller: `import { Controller } from "@/app/Http/Controllers/Controller";

/**
 * {{ className }} HTTP controller.
 */
export class {{ className }} extends Controller {
}
`,
    "controller-api": `import type { RouteParams } from "@ninots/routing";
import { Controller } from "@/app/Http/Controllers/Controller";

/**
 * {{ className }} API resource controller (no POST routes).
 */
export class {{ className }} extends Controller {
    public async index(): Promise<Response> {
        return this.json([]);
    }

    public async show(_request: Request, params?: RouteParams): Promise<Response> {
        return this.json({ id: params?.id });
    }

    public async update(request: Request, params?: RouteParams): Promise<Response> {
        const data = (await request.json()) as Record<string, unknown>;
        return this.json({ id: params?.id, ...data });
    }

    public async destroy(_request: Request, params?: RouteParams): Promise<Response> {
        return this.noContent();
    }
}
`,
    "controller-resource": `import type { RouteParams } from "@ninots/routing";
import { render } from "@ninots/view";
import { Controller } from "@/app/Http/Controllers/Controller";
import { {{ viewExportName }} } from "{{ viewImportPath }}";

/**
 * {{ className }} resource controller (web + CSRF group).
 */
export class {{ className }} extends Controller {
    public async index(): Promise<Response> {
        return render({{ viewExportName }}, {});
    }

    public async create(): Promise<Response> {
        return render({{ viewExportName }}, { title: "Create" });
    }

    public async store(_request: Request): Promise<Response> {
        return this.redirect("/{{ routePrefix }}");
    }

    public async show(_request: Request, params?: RouteParams): Promise<Response> {
        return render({{ viewExportName }}, { id: params?.id });
    }

    public async edit(_request: Request, params?: RouteParams): Promise<Response> {
        return render({{ viewExportName }}, { id: params?.id, title: "Edit" });
    }

    public async update(_request: Request, params?: RouteParams): Promise<Response> {
        return this.json({ id: params?.id, updated: true });
    }

    public async destroy(_request: Request, params?: RouteParams): Promise<Response> {
        return this.noContent();
    }
}
`,
    migration: `import type { Connection, Migration } from "@ninots/orm";

/**
 * {{ className }} migration.
 */
export default class {{ className }} implements Migration {
    public async up(connection: Connection): Promise<void> {
        await connection.run(\`
            CREATE TABLE IF NOT EXISTS {{ tableName }} (
                id INTEGER PRIMARY KEY AUTOINCREMENT
            )
        \`);
    }

    public async down(connection: Connection): Promise<void> {
        await connection.run("DROP TABLE IF EXISTS {{ tableName }}");
    }
}
`,
    model: `import { Model, Table } from "@ninots/orm";

/**
 * {{ className }} model.
 */
@Table("{{ tableName }}")
export class {{ className }} extends Model {
    protected static override fillable: string[] = [];
}
`,
    view: `import { withLayout } from "@ninots/view";
import { AppLayout } from "@/resources/views/layouts/app";

export interface {{ exportName }}Props {
    title?: string;
    id?: string;
}

function {{ exportName }}Page({ title = "{{ exportName }}", id }: {{ exportName }}Props) {
    return (
        <section className="welcome">
            <h1>{title}</h1>
            {id ? <p>Resource ID: {id}</p> : null}
        </section>
    );
}

export const {{ exportName }} = withLayout(AppLayout, {{ exportName }}Page, { title: "{{ exportName }} — Ninots" });
`,
    "web-resource-routes": `        router.get("/{{ routePrefix }}", () => {{ variableName }}.index()).name("{{ routePrefix }}.index");
        router.get("/{{ routePrefix }}/create", () => {{ variableName }}.create()).name("{{ routePrefix }}.create");
        router.post("/{{ routePrefix }}", (request) => {{ variableName }}.store(request)).name("{{ routePrefix }}.store");
        router.get("/{{ routePrefix }}/:id", (request, params) => {{ variableName }}.show(request, params)).name("{{ routePrefix }}.show");
        router.get("/{{ routePrefix }}/:id/edit", (request, params) => {{ variableName }}.edit(request, params)).name("{{ routePrefix }}.edit");
        router.put("/{{ routePrefix }}/:id", (request, params) => {{ variableName }}.update(request, params)).name("{{ routePrefix }}.update");
        router.delete("/{{ routePrefix }}/:id", (request, params) => {{ variableName }}.destroy(request, params)).name("{{ routePrefix }}.destroy");
`,
    "module-provider": `import type { Application } from "@ninots/foundation";
import { ROUTER_KEY } from "@ninots/foundation";
import { ServiceProvider } from "@ninots/container";
import type { Router } from "@ninots/routing";
import { {{ routesRegisterName }} } from "{{ routesImportPath }}";

/**
 * {{ className }} module service provider.
 *
 * Loads module routes via {{ routesRegisterName }} — do not append to routes/web.ts.
 */
export class {{ providerClassName }} extends ServiceProvider {
    constructor(app: Application) {
        super(app.container);
    }

    public override register(): void {
        // Bind module services here.
    }

    public override boot(): void {
        const router = this.app.make<Router>(ROUTER_KEY);
        {{ routesRegisterName }}(router);
    }
}
`,
    "module-routes": `import type { Router } from "@ninots/routing";

/**
 * Register HTTP routes for the {{ className }} module.
 */
export function {{ routesRegisterName }}(router: Router): void {
    router.group({ prefix: "/{{ routePrefix }}", middleware: ["web"] }, () => {
        router.get("/", () => new Response("{{ className }} module")).name("{{ routePrefix }}.index");
    });
}
`,
} as const;

export type StubTemplateName = keyof typeof STUB_TEMPLATES;

export function getStubTemplate(name: StubTemplateName): string {
    return STUB_TEMPLATES[name];
}
