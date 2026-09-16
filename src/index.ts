import { Elysia } from "elysia"
import { serve } from "bun";
import index from "./index.html";
import { WIDGETS } from "./lib/widgets";

export const api = new Elysia({ prefix: 'api' })
  .onError(({ code, error, set }) => {
    console.log(error)
    if (code === 'INTERNAL_SERVER_ERROR') {
      set.status = 502
      return { message: 'Upstream fetch failed :(' }
    }
  })

for (const widget of WIDGETS) {
  if (widget.backend) {
    api.use(widget.backend)
  }
}
export type Api = typeof api

const server = serve({
  routes: {
    "/*": index,
    "/api/*": api.fetch
  },
});

console.log(`🚀 Server running at ${server.url}`);
