import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import "./styles/theme.css";
import "./styles/sidebar.css";
import "./styles/kpi.css";
import "./styles/responsive.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);