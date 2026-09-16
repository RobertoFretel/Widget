import type { Static, TObject, TProperties } from "@sinclair/typebox";
import { Elysia, type AnyElysia } from "elysia";
import type React from "react";
import { useQuery } from "@tanstack/react-query";

// --- Input del defineWidget ---

export type WidgetWithoutBackend = {
  name: string;
  query?: never;
  backend?: never;
  template: () => React.ReactElement;
};

export type WidgetWithBackend<TQuery extends TObject<TProperties>, TData> = {
  name: string;
  query: TQuery;
  defaultQuery?: Static<TQuery>; 
  backend: (context: { query: Static<TQuery> }) => TData | Promise<TData>;
  template: (props: { data: Awaited<TData> }) => React.ReactElement;
};

// --- Output del defineWidget ---

export type WidgetDefinition<TQuery extends TObject<TProperties> = any, TData = any> = {
  name: string;
  backend?: AnyElysia;
  Component: React.FC<{ defaultQuery?: Static<TQuery> }>;
};

// --- Type Guard per forzare il Narrowing sui Generici ---
function hasBackend<TQuery extends TObject<TProperties>, TData>(
  config: WidgetWithBackend<TQuery, TData> | WidgetWithoutBackend
): config is WidgetWithBackend<TQuery, TData> {
  return "query" in config && config.query !== undefined;
}

// --- OVERLOADS ---

export function defineWidget(
  config: WidgetWithoutBackend
): WidgetDefinition<never, void>;

export function defineWidget<TQuery extends TObject<TProperties>, TData>(
  config: WidgetWithBackend<TQuery, TData>
): WidgetDefinition<TQuery, TData>;

// --- IMPLEMENTAZIONE ---

export function defineWidget<TQuery extends TObject<TProperties>, TData>(
  config: WidgetWithBackend<TQuery, TData> | WidgetWithoutBackend
): WidgetDefinition<TQuery, TData> {
  
  if (hasBackend(config)) {
    const { name, query, backend, template: Template } = config;

    const backendPlugin = new Elysia({ prefix: `widget/${name}` })
      .get("/", async ({ query: reqQuery }) => {
        const result = await backend({ query: reqQuery as Static<TQuery> });
        return result;
      }, {
        query: query,
      });

    const Component: React.FC<{ defaultQuery?: Static<TQuery> }> = ({ defaultQuery: overrideQuery }) => {
      const activeQuery = overrideQuery ?? config.defaultQuery;

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
        }
      });
    
      if (isPending) return <div className="widget-loading">Caricamento {name}...</div>;
      if (error || !data) return <div className="widget-error">Errore caricamento {name}</div>;
    
      return <Template data={data} />;
    };

    return {
      name,
      backend: backendPlugin,
      Component,
    };
  }

  // Fuori dall'if, config viene ristretto a WidgetWithoutBackend
  const Template = config.template;

  return {
    name: config.name,
    Component: () => <Template />,
  } as WidgetDefinition<TQuery, TData>;
}