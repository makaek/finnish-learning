import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./ui/App";
import { ensureSession } from "./data/backend";
import "./ui/styles.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error('Root element "#root" not found');

// Establish the (anonymous) backend session in the background so progress can persist.
// Fire-and-forget: rendering never waits on it, and it degrades to local storage offline.
void ensureSession();

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
