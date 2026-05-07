import React from "react";
import "./index.css";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { PopupProvider } from "./context/PopupContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <PopupProvider>
      <App />
    </PopupProvider>
  </AuthProvider>,
);
