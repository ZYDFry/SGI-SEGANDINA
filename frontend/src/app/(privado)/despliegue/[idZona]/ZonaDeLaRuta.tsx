"use client";

import { useParams } from "next/navigation";
import Alerta from "@/components/Alerta";
import PantallaZona from "./PantallaZona";

/** Lee el id de la zona de la ruta (`/despliegue/7`); un valor que no es un número muestra un aviso. */
export default function ZonaDeLaRuta() {
  const { idZona } = useParams<{ idZona: string }>();
  const id = /^\d{1,9}$/.test(idZona ?? "") ? Number(idZona) : null;
  return id === null ? <Alerta tipo="error">La zona indicada no es válida.</Alerta> : <PantallaZona idZona={id} />;
}
