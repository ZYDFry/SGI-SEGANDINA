"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/context/SesionContext";
import { rutaInicio } from "@/lib/roles";
import { consumirMotivoCierre } from "@/lib/sesion";
import type { Rol } from "@/lib/tipos";
import Cargando from "./Cargando";

interface Props {
  roles: Rol[];
  children: ReactNode;
}

/**
 * Muestra el contenido solo si hay sesión y el rol está permitido. Sin sesión lleva al login
 * (con aviso si el token venció); con otro rol, a la pantalla de inicio de ese rol.
 */
export default function RutaProtegida({ roles, children }: Props) {
  const { cargando, sesion } = useSesion();
  const router = useRouter();
  const permitido = !!sesion && roles.includes(sesion.usuario.rol);

  useEffect(() => {
    if (cargando) return;
    if (!sesion) {
      router.replace(consumirMotivoCierre() === "expirada" ? "/login?motivo=expirada" : "/login");
    } else if (!roles.includes(sesion.usuario.rol)) {
      router.replace(rutaInicio(sesion.usuario.rol));
    }
  }, [cargando, sesion, roles, router]);

  if (!permitido) return <Cargando />;
  return <>{children}</>;
}
