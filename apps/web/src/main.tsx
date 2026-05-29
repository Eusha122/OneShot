import React from "react";
import ReactDOM from "react-dom/client";
import "katex/dist/katex.min.css";
import { App } from "./app/App";
import { DocsView } from "./pages/docs/DocsView";
import { AdminDocsPanel } from "./pages/docs/AdminDocsPanel";
import "./styles/global.css";

const path = window.location.pathname;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {path === "/docs" ? <DocsView /> : path === "/admin/docs" ? <AdminDocsPanel /> : <App />}
  </React.StrictMode>,
);
