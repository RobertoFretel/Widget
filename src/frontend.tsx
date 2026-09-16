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
  return <Component key={widget.name} />;
});

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App widgets={widgets} />
  </StrictMode>
);

// https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data
(import.meta.hot.data.root ??= createRoot(elem)).render(app);
