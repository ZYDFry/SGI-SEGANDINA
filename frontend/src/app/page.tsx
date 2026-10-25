"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Cargando from "@/components/Cargando";
import { useSesion } from "@/context/SesionContext";
import { rutaInicio } from "@/lib/roles";

/** Raíz: lleva al inicio del rol si hay sesión, o al login. */
export default function Inicio() {
  const { cargando, sesion } = useSesion();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;
    router.replace(sesion ? rutaInicio(sesion.usuario.rol) : "/login");
  }, [cargando, sesion, router]);

  return <Cargando />;
}
