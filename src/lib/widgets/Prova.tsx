import { t } from "elysia";
import { defineWidget } from "../builder";

export const Prova = defineWidget({
  name: "prova",
  size: "right",
  query: t.Object({
    location: t.String(),
  }),
  backend({ query }) {
    return {
      message: query.location
    }
  },
  template: ({ data }) => {
    return (
      <main>Ciaoo sono dentro prova: {data.message}</main>
    )
  },
  defaultQuery: {
    location: "Lazio"
  }
});