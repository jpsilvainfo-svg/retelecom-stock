
import KPICard from "../components/KPICard"

export default function Dashboard(){
  return(
    <div>
      <h1>Dashboard</h1>

      <div className="grid">
        <KPICard title="OS Abertas" value="24" />
        <KPICard title="Frota Ativa" value="18" />
        <KPICard title="Estoque Crítico" value="12" />
        <KPICard title="Entradas" value="R$ 45.230" />
      </div>
    </div>
  )
}
