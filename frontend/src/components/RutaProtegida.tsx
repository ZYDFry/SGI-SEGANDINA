"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/context/SesionContext";
import { RUTA_CAMBIO_CONTRASENA, rutaInicio, rutaLogin } from "@/lib/roles";
import { consumirMotivoCierre } from "@/lib/sesion";
import type { Rol } from "@/lib/tipos";
import Cargando from "./Cargando";

interface Props {
  roles: Rol[];
  children: ReactNode;
}

/**
 * Muestra el contenido solo si hay sesión, la contraseña no es temporal y el rol está permitido. Sin sesión
 * lleva al login (con aviso si el token venció); con contraseña temporal, a la pantalla de cambio; con otro
 * rol, a la pantalla de inicio de ese rol.
 */
export default function RutaProtegida({ roles, children }: Props) {
  const { cargando, sesion } = useSesion();
  const router = useRouter();
  const permitido =
    !!sesion && !sesion.usuario.debeCambiarContrasena && roles.includes(sesion.usuario.rol);

  useEffect(() => {
    if (cargando) return;
    if (!sesion) {
      router.replace(rutaLogin(consumirMotivoCierre()));
    } else if (sesion.usuario.debeCambiarContrasena) {
      router.replace(RUTA_CAMBIO_CONTRASENA);
    } else if (!roles.includes(sesion.usuario.rol)) {
      router.replace(rutaInicio(sesion.usuario.rol));
    }
  }, [cargando, sesion, roles, router]);

  if (!permitido) return <Cargando />;
  return <>{children}</>;
}
