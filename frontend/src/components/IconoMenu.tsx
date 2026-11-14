import type { NombreIcono } from "@/lib/roles";

// Trazos de 24×24 (estilo de línea), dibujados con el color del texto. Sin dependencias externas.
const TRAZOS: Record<NombreIcono, string[]> = {
  dashboard: ["M3 3h7v9H3z", "M14 3h7v5h-7z", "M14 12h7v9h-7z", "M3 16h7v5H3z"],
  historial: ["M3 12a9 9 0 1 0 3-6.7", "M3 4v5h5", "M12 7v5l3 2"],
  auditoria: ["M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6z", "M9 12l2 2 4-4"],
  registrar: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 8v8", "M8 12h8"],
  "mis-incidencias": ["M9 4h6v3H9z", "M7 5H5v16h14V5h-2", "M9 12h6", "M9 16h4"],
  personal: [
    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    "M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1",
    "M16 3.1a4 4 0 0 1 0 7.8",
    "M22 21v-1a6 6 0 0 0-4-5.6",
  ],
  catalogos: ["M4 4h16v4H4z", "M4 10h16v4H4z", "M4 16h16v4H4z"],
  contrasena: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4", "M12 15v2"],
  cuenta: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1"],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  cerrar: ["M6 6l12 12", "M18 6L6 18"],
  "cerrar-sesion": ["M15 4h4v16h-4", "M10 8l-4 4 4 4", "M6 12h10"],
};

/** Ícono SVG en línea del menú. Es decorativo (`aria-hidden`): el texto que lo acompaña da el nombre accesible. */
export default function IconoMenu({ nombre, className = "h-5 w-5" }: { nombre: NombreIcono; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {TRAZOS[nombre].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
