import type { Static, TObject, TProperties } from "@sinclair/typebox";
import { Elysia, type AnyElysia } from "elysia";
import type React from "react";
import { useQuery } from "@tanstack/react-query";

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
};

// --- CLASSE WIDGET ---

export class Widget<TQuery extends TObject<TProperties> = any, TData = any> {
  public readonly name: string;
  public readonly size: "left" | "center" | "right";
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
  }

  public build(): WidgetDefinition<TQuery, TData> {
    const { name, query, defaultQuery, backendHandler, template: Template, size } = this;

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

    const Component: React.FC = () => {
      const activeQuery = defaultQuery;

      const { isPending, error, data } = useQuery({
        queryKey: [name, activeQuery],
        queryFn: async () => {
          let searchParams = "";
          if (activeQuery) {
            const params = new URLSearchParams();
            Object.entries(activeQuery).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                params.append(key, String(value));
              }
            });
            const queryString = params.toString();
            if (queryString) searchParams = `?${queryString}`;
          }

          const res = await fetch(`/api/widget/${name}${searchParams}`);
          if (!res.ok) throw new Error("Errore recupero dati");
          return res.json();
        },
      });

      if (isPending) return <div className="widget-loading">Caricamento {name}...</div>;
      if (error || !data) return <div className="widget-error">Errore caricamento {name}</div>;

      return <Template data={data} />;
    };

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