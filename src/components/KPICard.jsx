
export default function KPICard({title,value}){
  return(
    <div className="card">
      <span>{title}</span>
      <h2>{value}</h2>
      <div className="line"></div>
    </div>
  )
}
