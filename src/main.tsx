import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Apply stored theme (dark/light) before React mounts to avoid flash
try {
	const stored = localStorage.getItem('itrackd-theme');
	if (stored === 'dark') document.documentElement.classList.add('dark');
	else if (stored === 'light') document.documentElement.classList.remove('dark');
} catch (err) {
	// ignore
}

createRoot(document.getElementById("root")!).render(<App />);
