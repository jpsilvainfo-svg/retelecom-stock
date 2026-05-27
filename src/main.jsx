
import "./styles/theme.css"
import "./styles/layout.css"
import "./styles/sidebar.css"
import "./styles/cards.css"
import "./styles/mobile.css"

import Sidebar from "./components/Sidebar"
import Dashboard from "./pages/Dashboard"

export default function App(){
  return(
    <div className="app">
      <Sidebar />

      <main className="content">
        <Dashboard />
      </main>
    </div>
  )
}
