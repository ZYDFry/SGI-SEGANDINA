import type { UsuarioGestion } from "@/lib/tipos";

/** Nombre para tablas y mensajes: "Apellido paterno Apellido materno, Nombres". */
export function nombreCompleto(u: Pick<UsuarioGestion, "nombres" | "apellidoPaterno" | "apellidoMaterno">): string {
  return `${[u.apellidoPaterno, u.apellidoMaterno].filter(Boolean).join(" ")}, ${u.nombres}`;
}
