import "./index.css";
import Logo from "./assets/logo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient()

export const App: React.FC<{ widgets: Record<"right" | "left" | "center", React.ReactElement[]> }> = ({ widgets }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-column body-content">
        <header className="header-container content-bounds">
          <div className="header flex padding-inline-widget widget-content-frame">
            <div className="logo" aria-hidden="true">
              <Logo />
            </div>
          </div>
        </header>
        <div className="content-bounds grow">
          <main className="page content-ready" id="page" aria-live="polite" aria-busy="false">
            <div className="page-content" id="page-content">
              <div className="page-columns">
                <div className="page-column page-column-small">
                  {widgets.left.map(w => w)}
                </div>
                <div className="page-column page-column-full">
                  {widgets.center.map(w => w)}
                </div>
                <div className="page-column page-column-small">
                  {widgets.right.map(w => w)}
                </div>
              </div>
            </div>
          </main>
        </div>
        <footer className="footer flex items-center flex-column">
          <div>
            <a className="size-h3" href="https://github.com/RobertoFretel" target="_blank" rel="noreferrer">RobertoFretel</a>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
}

export default App;
