"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PESTANAS = [
  { href: "/catalogos", etiqueta: "Zonas" },
  { href: "/catalogos/tipos-evento", etiqueta: "Tipos de evento" },
  { href: "/catalogos/niveles-gravedad", etiqueta: "Niveles de gravedad" },
];

/** Título y pestañas de Catálogos (RF-09); cada pestaña es una ruta para poder enlazarla y recargarla. */
export default function PestanasCatalogos() {
  const ruta = usePathname();
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold text-blue-900">Catálogos</h1>
      <p className="mb-3 text-sm text-slate-500">
        Zonas, tipos de evento y niveles de gravedad que usan los formularios. Nada se borra: se desactiva.
      </p>
      <nav aria-label="Secciones de catálogos" className="flex gap-1 overflow-x-auto border-b border-slate-300">
        {PESTANAS.map((p) => {
          const actual = ruta === p.href;
          return (
            <Link
              key={p.href}
              href={p.href}
              aria-current={actual ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold ${
                actual ? "border-blue-900 text-blue-900" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {p.etiqueta}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
