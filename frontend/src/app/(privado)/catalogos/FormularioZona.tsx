"use client";

import { useState, type FormEvent } from "react";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import CampoTexto, { describirCampo, ESTILO_CAMPO, EnvolturaCampo } from "@/components/CampoTexto";
import { bordeCampo } from "@/components/MensajeCampo";
import Modal from "@/components/Modal";
import { errorDeApi } from "@/lib/api";
import { actualizarZona, crearZona } from "@/lib/servicios";
import type { Zona } from "@/lib/tipos";
import { useValidacion } from "@/lib/useValidacion";
import {
  DEPARTAMENTO_MAX,
  DESCRIPCION_MAX,
  DISTRITO_MAX,
  erroresDelServidor,
  PROVINCIA_MAX,
  REFERENCIA_MAX,
  validarZona,
  ZONA_NOMBRE_MAX,
  type CamposZona,
} from "@/lib/validaciones";
import type { Ubicaciones } from "./GestionZonas";

type Campo = keyof CamposZona;
const ORDEN: readonly Campo[] = ["nombreZona", "departamento", "provincia", "distrito", "referencia", "descripcion"];
const MAPA_SERVIDOR: Record<string, Campo> = Object.fromEntries(ORDEN.map((c) => [c, c]));

interface Props {
  /** `null` para crear. */
  zona: Zona | null;
  /** Valores ya usados, como sugerencias (`datalist`) para escribirlos igual y que los filtros exactos funcionen. */
  ubicaciones: Ubicaciones;
  onGuardado: (mensaje: string) => void;
  onCerrar: () => void;
}

/**
 * Alta y edición de una zona con departamento, provincia, distrito, referencia y descripción, con los límites de
 * `ZonaRequest`. El nombre repetido (409) aparece bajo el nombre.
 */
export default function FormularioZona({ zona, ubicaciones, onGuardado, onCerrar }: Props) {
  const crear = zona === null;
  const [campos, setCampos] = useState<CamposZona>({
    nombreZona: zona?.nombreZona ?? "",
    departamento: zona?.departamento ?? "",
    provincia: zona?.provincia ?? "",
    distrito: zona?.distrito ?? "",
    referencia: zona?.referencia ?? "",
    descripcion: zona?.descripcion ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const validacion = useValidacion(validarZona(campos), ORDEN);

  function cambiar(campo: Campo, valor: string) {
    setCampos((anterior) => ({ ...anterior, [campo]: valor }));
    validacion.alCambiar(campo);
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando || !validacion.intentarEnviar()) return;
    setError(null);
    setEnviando(true);
    const cuerpo = {
      nombreZona: campos.nombreZona.trim(),
      departamento: campos.departamento.trim(),
      provincia: campos.provincia.trim(),
      distrito: campos.distrito.trim(),
      referencia: campos.referencia.trim() || null,
      descripcion: campos.descripcion.trim() || null,
    };
    try {
      const guardada = crear ? await crearZona(cuerpo) : await actualizarZona(zona.idZona, cuerpo);
      onGuardado(
        crear ? `Se creó la zona ${guardada.nombreZona}.` : `Se guardaron los cambios de ${guardada.nombreZona}.`,
      );
    } catch (e) {
      const { campos: porCampo, general } = erroresDelServidor(errorDeApi(e), MAPA_SERVIDOR, [
        { contiene: "Ya existe una zona", campo: "nombreZona", mensaje: "Ya existe una zona con este nombre" },
      ]);
      validacion.ponerErroresServidor(porCampo);
      setError(general);
      setEnviando(false);
    }
  }

  const propsDescripcion = validacion.propsCampo("descripcion");
  const errorDescripcion = validacion.error("descripcion");

  return (
    <Modal
      titulo={crear ? "Nueva zona" : "Editar zona"}
      subtitulo={zona?.nombreZona}
      onCerrar={onCerrar}
      bloqueado={enviando}
      ancho="lg"
    >
      <form onSubmit={enviar} noValidate className="space-y-4">
        {error && <Alerta tipo="error">{error}</Alerta>}
        <CampoTexto
          etiqueta="Nombre de la zona"
          props={validacion.propsCampo("nombreZona")}
          valor={campos.nombreZona}
          onCambio={(v) => cambiar("nombreZona", v)}
          error={validacion.error("nombreZona")}
          maxLength={ZONA_NOMBRE_MAX}
          autoComplete="off"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <CampoTexto
            etiqueta="Departamento"
            props={validacion.propsCampo("departamento")}
            valor={campos.departamento}
            onCambio={(v) => cambiar("departamento", v)}
            error={validacion.error("departamento")}
            maxLength={DEPARTAMENTO_MAX}
            list="sugerencias-departamento"
            autoComplete="off"
          />
          <CampoTexto
            etiqueta="Provincia"
            props={validacion.propsCampo("provincia")}
            valor={campos.provincia}
            onCambio={(v) => cambiar("provincia", v)}
            error={validacion.error("provincia")}
            maxLength={PROVINCIA_MAX}
            list="sugerencias-provincia"
            autoComplete="off"
          />
          <CampoTexto
            etiqueta="Distrito"
            props={validacion.propsCampo("distrito")}
            valor={campos.distrito}
            onCambio={(v) => cambiar("distrito", v)}
            error={validacion.error("distrito")}
            maxLength={DISTRITO_MAX}
            list="sugerencias-distrito"
            autoComplete="off"
          />
        </div>
        <Sugerencias id="sugerencias-departamento" valores={ubicaciones.departamentos} />
        <Sugerencias id="sugerencias-provincia" valores={ubicaciones.provincias} />
        <Sugerencias id="sugerencias-distrito" valores={ubicaciones.distritos} />
        <CampoTexto
          etiqueta="Referencia"
          opcional
          props={validacion.propsCampo("referencia")}
          valor={campos.referencia}
          onCambio={(v) => cambiar("referencia", v)}
          error={validacion.error("referencia")}
          ayuda="Dirección o punto de referencia."
          maxLength={REFERENCIA_MAX}
          autoComplete="off"
        />
        <EnvolturaCampo
          etiqueta="Descripción"
          opcional
          campo="descripcion"
          error={errorDescripcion}
          ayuda={`${campos.descripcion.trim().length}/${DESCRIPCION_MAX}`}
        >
          <textarea
            {...propsDescripcion}
            aria-describedby={describirCampo(propsDescripcion, true)}
            name="descripcion"
            rows={3}
            maxLength={DESCRIPCION_MAX}
            value={campos.descripcion}
            onChange={(e) => cambiar("descripcion", e.target.value)}
            className={`${ESTILO_CAMPO} ${bordeCampo(!!errorDescripcion)}`}
          />
        </EnvolturaCampo>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={enviando || validacion.hayErroresVisibles}>
            {enviando ? "Guardando…" : crear ? "Crear zona" : "Guardar cambios"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}

function Sugerencias({ id, valores }: { id: string; valores: string[] }) {
  return (
    <datalist id={id}>
      {valores.map((v) => (
        <option key={v} value={v} />
      ))}
    </datalist>
  );
}
