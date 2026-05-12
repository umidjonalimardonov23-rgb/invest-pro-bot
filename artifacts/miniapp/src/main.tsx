import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Load Telegram WebApp script
const script = document.createElement("script");
script.src = "https://telegram.org/js/telegram-web-app.js";
document.head.appendChild(script);

createRoot(document.getElementById("root")!).render(<App />);
