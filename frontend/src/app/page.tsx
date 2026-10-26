"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Cargando from "@/components/Cargando";
import { useSesion } from "@/context/SesionContext";
import { destinoInicial } from "@/lib/roles";

/** Raíz: lleva al inicio del rol (o al cambio de contraseña temporal) si hay sesión, o al login. */
export default function Inicio() {
  const { cargando, sesion } = useSesion();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;
    router.replace(sesion ? destinoInicial(sesion.usuario) : "/login");
  }, [cargando, sesion, router]);

  return <Cargando />;
}
