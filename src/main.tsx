import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AccessGate } from "./components/access-gate";
import { StoreProvider } from "./lib/store";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AccessGate>
        <StoreProvider>
          <App />
        </StoreProvider>
      </AccessGate>
    </BrowserRouter>
  </StrictMode>,
);
