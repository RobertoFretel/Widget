import type { Static, TObject, TProperties } from "@sinclair/typebox";
import { Elysia, t, type AnyElysia } from "elysia";
import type React from "react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

const SSE_INTERVAL_MS = 5000;

// --- TIPI DI OUTPUT ---

export type WidgetDefinition<TQuery extends TObject<TProperties> = any, TData = any> = {
  name: string;
  backend?: AnyElysia;
  Component: React.FC;
  size: "left" | "center" | "right";
};

// --- CONFIGURAZIONI ---

export type StaticWidgetConfig = {
  name: string;
  template: () => React.ReactElement;
};

export type DynamicWidgetConfig<TQuery extends TObject<TProperties>, TData> = {
  name: string;
  size: "left" | "center" | "right";
  query: TQuery;
  defaultQuery: Static<TQuery>;
  backend: (context: { query: Static<TQuery> }) => TData | Promise<TData>;
  template: (props: { data: Awaited<TData> }) => React.ReactElement;
  update?: boolean;
};

// --- CLASSE WIDGET ---

function serializeQueryParams(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

function useSseWidget<TData>(url: string) {
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    const source = new EventSource(url);

    source.onmessage = (event) => {
      setIsPending(false);
      setError(null);
      setData(JSON.parse(event.data));
    };

    source.onerror = () => {
      setIsPending(false);
      setError(new Error("Connessione SSE interrotta"));
    };

    return () => {
      source.close();
    };
  }, [url]);

  return { isPending, error, data };
}

export class Widget<TQuery extends TObject<TProperties> = any, TData = any> {
  public readonly name: string;
  public readonly size: "left" | "center" | "right";
  public readonly update: boolean;
  public readonly query?: TQuery;
  public readonly defaultQuery: Static<TQuery>;
  public readonly backendHandler?: (context: { query: Static<TQuery> }) => TData | Promise<TData>;
  public readonly template: React.ComponentType<any>;

  // Overload 1: Widget con Backend
  constructor(config: DynamicWidgetConfig<TQuery, TData>);
  // Overload 2: Widget Statico
  constructor(config: StaticWidgetConfig);
  // Implementazione Costruttore
  constructor(config: any) {
    this.name = config.name;
    this.query = config.query;
    this.defaultQuery = config.defaultQuery;
    this.backendHandler = config.backend;
    this.template = config.template;
    this.size = config.size;
    this.update = config.update ?? false;
  }

  public build(): WidgetDefinition<TQuery, TData> {
    const { name, query, defaultQuery, backendHandler, template: Template, size, update } = this;

    if (!query || !backendHandler) {
      return {
        name,
        Component: () => <Template />,
        size: size
      } as WidgetDefinition<TQuery, TData>;
    }

    const backendPlugin = new Elysia({ prefix: `widget/${name}` })
      .get("/", async ({ query: reqQuery }) => {
        return await backendHandler({ query: reqQuery as Static<TQuery> });
      },{
        query
      });

    if (update) {
      backendPlugin.get("/events", async ({ query: reqQuery }) => {
        let interval: ReturnType<typeof setInterval> | null = null;
        let closed = false;

        const stream = new ReadableStream({
          async start(controller) {
            const send = async () => {
              if (closed) return;
              try {
                const data = await backendHandler({ query: reqQuery as Static<TQuery> });
                const payload = `data: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(new TextEncoder().encode(payload));
              } catch (err) {
                const payload = `event: error\ndata: ${JSON.stringify({ message: (err as Error).message })}\n\n`;
                controller.enqueue(new TextEncoder().encode(payload));
              }
            };

            await send();
            interval = setInterval(send, SSE_INTERVAL_MS);
          },
          cancel() {
            closed = true;
            if (interval) clearInterval(interval);
          }
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          }
        });
      }, { query });
    }

    const QueryComponent: React.FC = () => {
      const activeQuery = defaultQuery;
      const searchParams = serializeQueryParams(activeQuery);

      const { isPending, error, data } = useQuery({
        queryKey: [name, activeQuery],
        queryFn: async () => {
          const res = await fetch(`/api/widget/${name}${searchParams}`);
          if (!res.ok) throw new Error("Errore recupero dati");
          return res.json();
        },
      });

      if (isPending) return <div className="widget-loading">Caricamento {name}...</div>;
      if (error || !data) return <div className="widget-error">Errore caricamento {name}</div>;

      return <Template data={data} />;
    };

    const SseComponent: React.FC = () => {
      const searchParams = serializeQueryParams(defaultQuery);
      const { isPending, error, data } = useSseWidget<Awaited<TData>>(`/api/widget/${name}/events${searchParams}`);

      if (isPending) return <div className="widget-loading">Caricamento {name}...</div>;
      if (error || !data) return <div className="widget-error">Errore caricamento {name}</div>;

      return <Template data={data} />;
    };

    const Component = update ? SseComponent : QueryComponent;

    return {
      name,
      backend: backendPlugin,
      Component,
      size: size
    };
  }
}

// Helper opzionale per chi preferisce la sintassi 'createWidget' senza 'new'
export const defineWidget = <TQuery extends TObject<TProperties>, TData>(
  config: DynamicWidgetConfig<TQuery, TData>
) => new Widget(config).build();

export const scheme = t