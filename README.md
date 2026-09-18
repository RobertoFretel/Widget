# Glance

Dashboard personale costruita con **Bun**, **React 19**, **Elysia** e **TanStack Query**.  
L'idea è semplice: ogni widget è un'unità autonoma che definisce il proprio schema di query, il backend e il rendering; registrandolo in un unico file compare automaticamente sia nell'API sia nella UI.

## Avvio rapido

```bash
bun install
bun dev
```

Apri l'URL stampato dal server (solitamente `http://localhost:3000/`).

Per la build di produzione:

```bash
bun run build
bun start
```

## Creare un widget

1. Crea un file in `src/lib/widgets/`, ad esempio `src/lib/widgets/MioWidget.tsx`.
2. Usa `defineWidget` per descrivere query, backend e template.
3. Aggiungi il widget all'array `WIDGETS` in `src/lib/widgets/index.ts`.

Esempio minimo:

```tsx
import { defineWidget, scheme } from "../builder";

const querySchema = scheme.Object({
  city: scheme.String(),
});

export const MioWidget = defineWidget({
  name: "mio-widget",
  size: "left",          // left | center | right
  query: querySchema,
  defaultQuery: { city: "Perugia" },
  async backend({ query }) {
    return { message: `Ciao da ${query.city}` };
  },
  template({ data }) {
    return (
      <article className="widget">
        <h2>{data.message}</h2>
      </article>
    );
  },
});
```

## Layout

Il campo `size` posiziona il widget in una delle tre colonne della pagina:

- `left` — colonna laterale sinistra
- `center` — colonna centrale larga
- `right` — colonna laterale destra

## Dati in tempo reale

Aggiungi `update: true` per ricevere aggiornamenti continui tramite Server-Sent Events invece di un singolo fetch:

```tsx
export const MioWidget = defineWidget({
  name: "mio-widget",
  size: "right",
  query: querySchema,
  defaultQuery: {},
  update: true,
  async backend() {
    return { value: Math.random() };
  },
  template({ data }) {
    return <div>{data.value}</div>;
  },
});
```

Il backend rimarrà disponibile su `/api/widget/{nome}`; con `update: true` si attiva anche `/api/widget/{nome}/events`.

## Widget inclusi

- `Meteo` — previsioni meteo da Open-Meteo, posizionato a sinistra.
- `Sistema` — metriche di sistema in tempo reale tramite SSE, posizionato a destra.

Per approfondimenti consulta la documentazione in `openwiki/`.
