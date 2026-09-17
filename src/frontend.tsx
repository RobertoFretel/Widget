/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { WIDGETS } from "./lib/widgets";

const widgets = WIDGETS.map(widget => {
  const Component = widget.Component;
  return {
    widget: <Component key={widget.name} />,
    size: widget.size
  }
});

const widgetsByColumn = widgets.reduce<Record<"left" | "center" | "right", React.ReactElement[]>>(
  (acc, item) => {
    acc[item.size].push(item.widget);
    return acc;
  },
  { left: [], center: [], right: [] }
);

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App widgets={widgetsByColumn} />
  </StrictMode>
);

// https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data
(import.meta.hot.data.root ??= createRoot(elem)).render(app);
