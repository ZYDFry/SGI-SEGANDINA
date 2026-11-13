"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import Cargando from "@/components/Cargando";
import MensajeCampo, { bordeCampo } from "@/components/MensajeCampo";
import SelectorRapido, { type OpcionSelector } from "@/components/SelectorRapido";
import { useSesion } from "@/context/SesionContext";
import { errorDeApi } from "@/lib/api";
import { cargarCatalogos, registrarIncidencia, type Catalogos } from "@/lib/servicios";
import type { IncidenciaResponse, NivelGravedad } from "@/lib/tipos";
import { useValidacion } from "@/lib/useValidacion";
import {
  DESCRIPCION_MAX,
  DESCRIPCION_MIN_OTRO,
  erroresDelServidor,
  esTipoOtro,
  validarIncidencia,
  type CampoIncidencia,
  type ReglaServidor,
} from "@/lib/validaciones";

const ORDEN: readonly CampoIncidencia[] = ["idZona", "idTipo", "idGravedad", "descripcion", "fecha"];
// Nombre del campo en IncidenciaRequest → campo del formulario.
const MAPA_SERVIDOR: Record<string, CampoIncidencia> = {
  idZona: "idZona",
  idTipoEvento: "idTipo",
  idNivelGravedad: "idGravedad",
  descripcion: "descripcion",
  fechaHora: "fecha",
};
// Reglas de negocio del backend (400 sin detalles) que se muestran bajo su campo.
const REGLAS_SERVIDOR: ReglaServidor<CampoIncidencia>[] = [
  { contiene: "zona seleccionada", campo: "idZona" },
  { contiene: "tipo de evento seleccionado", campo: "idTipo" },
  { contiene: "nivel de gravedad seleccionado", campo: "idGravedad" },
  { contiene: "descripción debe tener al menos", campo: "descripcion" },
  { contiene: "no puede ser futura", campo: "fecha" },
];

// Colores por orden de gravedad: 1 Baja verde, 2 Media amarillo, 3 Alta naranja, 4 Crítica rojo.
const COLORES_GRAVEDAD: Record<number, { normal: string; marcada: string }> = {
  1: { normal: "border-green-300 bg-green-50 text-green-800", marcada: "border-green-600 bg-green-600 text-white" },
  2: { normal: "border-yellow-300 bg-yellow-50 text-yellow-800", marcada: "border-yellow-400 bg-yellow-400 text-yellow-950" },
  3: { normal: "border-orange-300 bg-orange-50 text-orange-800", marcada: "border-orange-500 bg-orange-500 text-white" },
  4: { normal: "border-red-300 bg-red-50 text-red-700", marcada: "border-red-600 bg-red-600 text-white" },
};

const FORMATO_FECHA = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" });

/** Valor para un input datetime-local ("AAAA-MM-DDTHH:mm") en la hora del dispositivo. */
function aValorLocal(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

/** Convierte el valor de datetime-local a ISO 8601 con el offset del dispositivo (p. ej. -05:00). */
function aIsoConOffset(valorLocal: string): string {
  const fecha = new Date(valorLocal);
  const minutos = -fecha.getTimezoneOffset();
  const signo = minutos >= 0 ? "+" : "-";
  const abs = Math.abs(minutos);
  const offset = `${signo}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
  return `${valorLocal}:00${offset}`;
}

function opcionesGravedad(niveles: NivelGravedad[]): OpcionSelector[] {
  return niveles.map((nivel) => ({
    valor: nivel.idNivelGravedad,
    etiqueta: nivel.nombreNivel,
    clases: COLORES_GRAVEDAD[nivel.orden] ?? COLORES_GRAVEDAD[4],
  }));
}

/** Formulario Mobile-First: selectores rápidos, descripción y confirmación al guardar. */
export default function FormularioIncidencia() {
  const { sesion } = useSesion();
  const idZonaAsignada = sesion?.usuario.idZona ?? null;

  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [idZona, setIdZona] = useState<number | null>(null);
  const [idTipo, setIdTipo] = useState<number | null>(null);
  const [idGravedad, setIdGravedad] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [fechaManual, setFechaManual] = useState<string | null>(null);
  const [fechaMaxima, setFechaMaxima] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrada, setRegistrada] = useState<IncidenciaResponse | null>(null);

  const tipoElegido = catalogos?.tipos.find((t) => t.idTipoEvento === idTipo);
  const esOtro = esTipoOtro(tipoElegido?.nombreTipoEvento);
  const validacion = useValidacion(
    validarIncidencia({ idZona, idTipo, idGravedad, descripcion, fecha: fechaManual, esOtro }),
    ORDEN,
  );

  const cargar = useCallback(() => {
    cargarCatalogos()
      .then((datos) => {
        setCatalogos(datos);
        // Zona del vigilante preseleccionada, si sigue activa.
        if (idZonaAsignada !== null && datos.zonas.some((z) => z.idZona === idZonaAsignada)) {
          setIdZona((actual) => actual ?? idZonaAsignada);
        }
      })
      .catch((e) => setErrorCarga(errorDeApi(e).mensaje));
  }, [idZonaAsignada]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function reintentar() {
    setErrorCarga(null);
    cargar();
  }

  if (errorCarga) {
    return (
      <div className="mx-auto max-w-lg space-y-3">
        <Alerta tipo="error">No se pudieron cargar las opciones del formulario. {errorCarga}</Alerta>
        <Boton variante="secundario" onClick={reintentar} className="w-full">
          Reintentar
        </Boton>
      </div>
    );
  }
  if (!catalogos) return <Cargando texto="Cargando formulario…" />;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando || !validacion.intentarEnviar()) return;
    setError(null);
    setEnviando(true);
    try {
      const incidencia = await registrarIncidencia({
        idZona: idZona!,
        idTipoEvento: idTipo!,
        idNivelGravedad: idGravedad!,
        descripcion: descripcion.trim(),
        ...(fechaManual ? { fechaHora: aIsoConOffset(fechaManual) } : {}),
      });
      setRegistrada(incidencia);
      // Listo para otro registro: se conserva la zona y se quitan los avisos.
      setIdTipo(null);
      setIdGravedad(null);
      setDescripcion("");
      setFechaManual(null);
      validacion.reiniciar();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      const { campos, general } = erroresDelServidor(errorDeApi(e), MAPA_SERVIDOR, REGLAS_SERVIDOR);
      validacion.ponerErroresServidor(campos);
      setError(general);
    } finally {
      setEnviando(false);
    }
  }

  /** Cambia una selección y borra el aviso del backend de ese campo. */
  function elegir(campo: CampoIncidencia, asignar: (valor: number) => void) {
    return (valor: number) => {
      asignar(valor);
      validacion.alCambiar(campo);
    };
  }

  function alternarFecha() {
    if (fechaManual === null) {
      const ahora = aValorLocal(new Date());
      setFechaMaxima(ahora);
      setFechaManual(ahora);
    } else {
      setFechaManual(null);
    }
    validacion.alCambiar("fecha");
  }

  const errorDescripcion = validacion.error("descripcion");
  const errorFecha = validacion.error("fecha");

  return (
    <form onSubmit={enviar} noValidate className="mx-auto max-w-lg space-y-5 pb-28 sm:pb-6">
      <h1 className="text-xl font-bold text-blue-900">Registrar incidencia</h1>

      {registrada && (
        <Alerta tipo="exito">
          <p className="font-semibold">Incidencia N.° {registrada.idIncidencia} registrada</p>
          <p>
            {registrada.zona.nombreZona} · {registrada.tipoEvento.nombreTipoEvento} ·{" "}
            {registrada.nivelGravedad.nombreNivel} · {FORMATO_FECHA.format(new Date(registrada.fechaHora))}
          </p>
        </Alerta>
      )}

      <SelectorRapido
        titulo="Zona"
        campo="idZona"
        opciones={catalogos.zonas.map((z) => ({ valor: z.idZona, etiqueta: z.nombreZona }))}
        valor={idZona}
        onCambio={elegir("idZona", setIdZona)}
        error={validacion.error("idZona")}
        onSalir={() => validacion.alSalir("idZona")}
        refPrimero={validacion.registrar("idZona")}
      />

      <SelectorRapido
        titulo="Tipo de evento"
        campo="idTipo"
        opciones={catalogos.tipos.map((t) => ({ valor: t.idTipoEvento, etiqueta: t.nombreTipoEvento }))}
        valor={idTipo}
        onCambio={elegir("idTipo", setIdTipo)}
        error={validacion.error("idTipo")}
        onSalir={() => validacion.alSalir("idTipo")}
        refPrimero={validacion.registrar("idTipo")}
      />

      <SelectorRapido
        titulo="Nivel de gravedad"
        campo="idGravedad"
        opciones={opcionesGravedad(catalogos.niveles)}
        valor={idGravedad}
        onCambio={elegir("idGravedad", setIdGravedad)}
        columnas={4}
        error={validacion.error("idGravedad")}
        onSalir={() => validacion.alSalir("idGravedad")}
        refPrimero={validacion.registrar("idGravedad")}
      />

      <div>
        <label htmlFor="descripcion" className="mb-2 block text-sm font-semibold text-slate-700">
          Descripción
        </label>
        <textarea
          {...validacion.propsCampo("descripcion")}
          aria-describedby={errorDescripcion ? "error-descripcion contador-descripcion" : "contador-descripcion"}
          rows={4}
          maxLength={DESCRIPCION_MAX}
          value={descripcion}
          onChange={(e) => {
            setDescripcion(e.target.value);
            validacion.alCambiar("descripcion");
          }}
          placeholder="¿Qué pasó? Personas, vehículos, acciones tomadas…"
          className={`w-full rounded-lg border bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 ${bordeCampo(!!errorDescripcion)}`}
        />
        <MensajeCampo campo="descripcion" mensaje={errorDescripcion} />
        <div id="contador-descripcion" className="mt-1 flex justify-between text-xs text-slate-500">
          <span>{esOtro ? `Mínimo ${DESCRIPCION_MIN_OTRO} caracteres para "Otro"` : ""}</span>
          <span>
            {descripcion.length}/{DESCRIPCION_MAX}
          </span>
        </div>
      </div>

      <div>
        <button type="button" onClick={alternarFecha} className="text-sm font-semibold text-blue-900 underline">
          {fechaManual === null ? "¿Ocurrió antes? Cambiar fecha y hora" : "Usar la hora actual"}
        </button>
        {fechaManual === null ? (
          <p className="mt-1 text-xs text-slate-500">Se registrará con la hora actual.</p>
        ) : (
          <>
            <input
              {...validacion.propsCampo("fecha")}
              type="datetime-local"
              aria-label="Fecha y hora en que ocurrió"
              value={fechaManual}
              max={fechaMaxima}
              onChange={(e) => {
                setFechaManual(e.target.value);
                validacion.alCambiar("fecha");
              }}
              className={`mt-2 w-full rounded-lg border bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 ${bordeCampo(!!errorFecha)}`}
            />
            <MensajeCampo campo="fecha" mensaje={errorFecha} />
          </>
        )}
      </div>

      {error && <Alerta tipo="error">{error}</Alerta>}

      {/* En el celular el botón queda fijo abajo, al alcance del pulgar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <Boton
          type="submit"
          variante="peligro"
          disabled={enviando || validacion.hayErroresVisibles}
          className="mx-auto block w-full max-w-lg py-4 text-lg">
          {enviando ? "Registrando…" : "Registrar incidencia"}
        </Boton>
      </div>
    </form>
  );
}
