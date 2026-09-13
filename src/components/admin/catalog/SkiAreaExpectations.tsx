import { useEffect, useState } from "react";
import ExpectationCard from "@/components/admin/catalog/ExpectationCard";
import { listCatalogExpectations } from "@/lib/adminSkiAreaCatalogApi";
import type { CatalogExpectation } from "@/types/skiAreaCatalog";

export default function SkiAreaExpectations({skiAreaId}:{skiAreaId:number}){
 const [items,setItems]=useState<CatalogExpectation[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=async()=>{setLoading(true);setError("");try{let page=1,pages=1;const found:CatalogExpectation[]=[];do{const result=await listCatalogExpectations({page,per_page:100});found.push(...result.items.filter(item=>item.expected_memberships.some(m=>m.ski_area_id===skiAreaId)));pages=result.pagination.pages;page++}while(page<=pages);setItems(found)}catch(e){setError((e as Error).message)}finally{setLoading(false)}};
 useEffect(()=>{void load()},[skiAreaId]);
 const unresolved=items.filter(i=>i.resolution_state==="pending"||i.resolution_state==="needs_review");const optional=items.filter(i=>i.resolution_state==="optional_detail");
 const stateLabel:Record<CatalogExpectation["resolution_state"],string>={pending:"À créer",needs_review:"À vérifier",optional_detail:"Fiche facultative",linked:"Rattachée",ignored:"Ignorée"};
 return <section className="ski-area-expectations"><h2>Composition complète attendue</h2><p>Toutes les stations connues du catalogue sont affichées ici, qu’elles soient actives, inactives, rattachées ou encore absentes de Snow Explorer.</p>{error&&<p className="admin-form-error">{error}</p>}{loading?<p>Chargement…</p>:items.length?<ul className="ski-area-expected-list">{items.map(item=><li key={item.id}><strong>{item.name}</strong><span className={`expectation-state expectation-state--${item.resolution_state}`}>{stateLabel[item.resolution_state]}</span></li>)}</ul>:<p className="empty-state">Aucune station répertoriée dans le catalogue pour ce domaine.</p>}<h2>Stations à créer ou à vérifier</h2>{unresolved.length?<div className="expectation-grid">{unresolved.map(i=><ExpectationCard key={i.id} item={i} onChanged={()=>void load()}/>)}</div>:<p className="empty-state">Aucune attente prioritaire.</p>}<h2>Fiches locales facultatives déjà couvertes</h2>{optional.length?<div className="expectation-grid">{optional.map(i=><ExpectationCard key={i.id} item={i} onChanged={()=>void load()}/>)}</div>:<p className="empty-state">Aucun détail facultatif.</p>}</section>
}
