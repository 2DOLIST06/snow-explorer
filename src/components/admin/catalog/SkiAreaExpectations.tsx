import { useEffect, useState } from "react";
import ExpectationCard from "@/components/admin/catalog/ExpectationCard";
import { listCatalogExpectations } from "@/lib/adminSkiAreaCatalogApi";
import type { CatalogExpectation } from "@/types/skiAreaCatalog";

export default function SkiAreaExpectations({skiAreaId}:{skiAreaId:number}){
 const [items,setItems]=useState<CatalogExpectation[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=async()=>{setLoading(true);setError("");try{let page=1,pages=1;const found:CatalogExpectation[]=[];do{const result=await listCatalogExpectations({page,per_page:100});found.push(...result.items.filter(item=>item.expected_memberships.some(m=>m.ski_area_id===skiAreaId)));pages=result.pagination.pages;page++}while(page<=pages);setItems(found)}catch(e){setError((e as Error).message)}finally{setLoading(false)}};
 useEffect(()=>{void load()},[skiAreaId]);
 const unresolved=items.filter(i=>i.resolution_state==="pending"||i.resolution_state==="needs_review");const optional=items.filter(i=>i.resolution_state==="optional_detail");
 return <section className="ski-area-expectations"><h2>Stations attendues mais non créées</h2><p>Ces entrées ne sont pas des relations publiques et ne produisent aucun lien vers une station suggérée.</p>{error&&<p className="admin-form-error">{error}</p>}{loading?<p>Chargement…</p>:unresolved.length?<div className="expectation-grid">{unresolved.map(i=><ExpectationCard key={i.id} item={i} onChanged={()=>void load()}/>)}</div>:<p className="empty-state">Aucune attente prioritaire.</p>}<h2>Fiches locales facultatives déjà couvertes</h2>{optional.length?<div className="expectation-grid">{optional.map(i=><ExpectationCard key={i.id} item={i} onChanged={()=>void load()}/>)}</div>:<p className="empty-state">Aucun détail facultatif.</p>}</section>
}
