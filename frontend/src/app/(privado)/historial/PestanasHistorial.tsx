"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSesion } from "@/context/SesionContext";
import { ROLES_ADMIN } from "@/lib/roles";

const PESTANAS = [
  { href: "/historial", etiqueta: "Incidencias", soloAdmin: false },
  { href: "/historial/auditoria", etiqueta: "Auditoría", soloAdmin: true },
];

/** Pestañas del historial; "Auditoría" solo se muestra al Administrador. */
export default function PestanasHistorial() {
  const { sesion } = useSesion();
  const ruta = usePathname();
  const esAdmin = !!sesion && ROLES_ADMIN.includes(sesion.usuario.rol);
  const visibles = PESTANAS.filter((p) => !p.soloAdmin || esAdmin);
  if (visibles.length < 2) return null;

  return (
    <nav aria-label="Secciones del historial" className="mb-4 flex gap-1 border-b border-slate-300">
      {visibles.map((p) => {
        const actual = ruta === p.href;
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={actual ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
              actual ? "border-blue-900 text-blue-900" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {p.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
