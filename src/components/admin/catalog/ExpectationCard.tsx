import Link from "next/link";
import { useEffect, useState } from "react";
import { decideCatalogExpectation } from "@/lib/adminSkiAreaCatalogApi";
import { listStationOptions } from "@/lib/adminSkiAreasApi";
import type { CatalogExpectation } from "@/types/skiAreaCatalog";
import type { StationOption } from "@/types/skiArea";

const labels={pending:"Station manquante",needs_review:"Proposition à vérifier",optional_detail:"Détail facultatif",ignored:"Ignorée",linked:"Rattachée"};
export default function ExpectationCard({item,onChanged}:{item:CatalogExpectation;onChanged:()=>void}){
 const [associating,setAssociating]=useState(false),[q,setQ]=useState(""),[options,setOptions]=useState<StationOption[]>([]),[selected,setSelected]=useState(""),[note,setNote]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{if(!associating)return;const timer=setTimeout(()=>void listStationOptions({q}).then(x=>setOptions(x.items)).catch(e=>setError(e.message)),250);return()=>clearTimeout(timer)},[associating,q]);
 const decide=async(payload:{decision:"confirm";resort_id:string;note?:string}|{decision:"ignore";note?:string})=>{setBusy(true);setError("");try{await decideCatalogExpectation(item.id,payload);onChanged();}catch(e){setError((e as Error).message)}finally{setBusy(false)}};
 const sources=item.expected_memberships.flatMap(m=>m.sources).filter((s,i,a)=>a.findIndex(x=>x.url===s.url)===i);
 return <article className={`expectation-card expectation-card--${item.resolution_state}`}><header><div><span className="admin-status">{labels[item.resolution_state]}</span><h2>{item.name}</h2><p><code>{item.station_ref}</code> · {[item.country_code,item.department].filter(Boolean).join(" · ")||"Géographie inconnue"}</p></div></header>
 <div className="expectation-domains"><h3>Domaines attendus</h3><ul>{item.expected_memberships.map(m=><li key={m.id}>{m.ski_area_id?<Link href={`/admin/domaines-skiables/${m.ski_area_id}`}>{m.area_name}</Link>:<strong>{m.area_name}</strong>}<small>{m.area_kind} · {m.state}</small></li>)}</ul></div>
 {sources.length>0&&<div className="expectation-sources"><h3>Sources vérifiées</h3>{sources.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.publisher}</a>{s.checked_on&&<> · consultée le {new Date(`${s.checked_on}T00:00:00`).toLocaleDateString("fr-FR")}</>}</p>)}</div>}
 {error&&<p className="admin-form-error" role="alert">{error}</p>}
 {associating&&<div className="expectation-associate"><label>Rechercher une station<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Nom de la station"/></label><div role="listbox" aria-label="Stations candidates">{options.map(o=><button type="button" className={selected===o.id?"is-selected":""} key={o.id} onClick={()=>setSelected(o.id)}><strong>{o.name}</strong><small>{o.slug} · {o.is_active === false ? "inactive" : "active"}</small></button>)}</div><label>Note de vérification<input value={note} onChange={e=>setNote(e.target.value)}/></label><button className="btn btn--primary" disabled={!selected||busy} onClick={()=>void decide({decision:"confirm",resort_id:selected,note:note||undefined})}>Valider l’identité et rattacher</button></div>}
 <footer className="admin-row-actions">{!(["linked","ignored"] as string[]).includes(item.resolution_state)&&<><button onClick={()=>setAssociating(v=>!v)}>Associer à une station existante</button><Link href={{pathname:"/admin/stations/new",query:{expectation_id:item.id}}}>Créer cette station</Link><button disabled={busy} onClick={()=>{const reason=window.prompt("Motif de l’ignorance (mémorisé)");if(reason!==null)void decide({decision:"ignore",note:reason||undefined})}}>Ignorer</button></>}{item.resolution_state==="linked"&&item.resort_id&&<Link href={`/admin/stations/${encodeURIComponent(item.resort_id)}`}>Voir la station rattachée</Link>}</footer></article>
}
