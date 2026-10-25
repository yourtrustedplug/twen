import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { installGlobalErrorReporting } from "./lib/error-reporting";
import "./index.css";

installGlobalErrorReporting();

createRoot(document.getElementById("root")!).render(<App />);
