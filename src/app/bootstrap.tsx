import { createRoot } from "react-dom/client";
import { RootApp } from "./RootApp";

export async function bootstrap(): Promise<void> {
  const rootElement = document.getElementById("app");
  if (!rootElement) {
    throw new Error("Missing #app root element");
  }

  createRoot(rootElement).render(<RootApp />);

  if (import.meta.env.PROD) {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });
  }
}
