import { useRouter } from "next/router";
import SkiAreaEditor from "@/components/admin/SkiAreaEditor";
export default function EditSkiArea() { const value = Number(useRouter().query.id); return Number.isInteger(value) ? <SkiAreaEditor id={value} /> : null; }

