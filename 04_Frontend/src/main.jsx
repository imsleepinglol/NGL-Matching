
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PreferenceProvider } from "./context/PreferenceContext";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PreferenceProvider>
      <App />
    </PreferenceProvider>
  </React.StrictMode>
);
