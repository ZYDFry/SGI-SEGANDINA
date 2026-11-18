"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import Cargando from "@/components/Cargando";
import MensajeCampo, { bordeCampo } from "@/components/MensajeCampo";
import MotivoDesactivado, { textoMotivo } from "@/components/MotivoDesactivado";
import SelectorBuscable, { type OpcionBuscable } from "@/components/SelectorBuscable";
import SelectorRapido, { type OpcionSelector } from "@/components/SelectorRapido";
import { errorDeApi } from "@/lib/api";
import { RUTA_MIS_INCIDENCIAS } from "@/lib/roles";
import { coloresGravedad } from "@/lib/gravedad";
import { formatearFechaHora } from "@/lib/fechas";
import {
  cargarCatalogos,
  corregirIncidencia,
  refrescarUsuario,
  registrarIncidencia,
  type Catalogos,
} from "@/lib/servicios";
import type { IncidenciaResponse, MiIncidencia, NivelGravedad, Usuario, Zona } from "@/lib/tipos";
import { idError, useValidacion } from "@/lib/useValidacion";
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
  // Vigilante: sin zona, zona inactiva o zona distinta de la asignada
  { contiene: "zona asignada", campo: "idZona" },
  // Corrección: el Vigilante no puede mover la incidencia a otra zona
  { contiene: "no puede cambiar la zona", campo: "idZona" },
  { contiene: "tipo de evento seleccionado", campo: "idTipo" },
  { contiene: "nivel de gravedad seleccionado", campo: "idGravedad" },
  { contiene: "descripción debe tener al menos", campo: "descripcion" },
  { contiene: "no puede ser futura", campo: "fecha" },
];

const ETIQUETAS: Record<CampoIncidencia, string> = {
  idZona: "Zona",
  idTipo: "Tipo de evento",
  idGravedad: "Nivel de gravedad",
  descripcion: "Descripción",
  fecha: "Fecha y hora",
};

const AVISO_SIN_ZONA = "No tienes una zona asignada; avisa al Administrador.";
const AVISO_ZONA_INACTIVA = "Tu zona asignada está inactiva; avisa al Administrador.";

/** Zona asignada si está en el catálogo de activas; `undefined` si no tiene o está inactiva. */
function zonaActiva(zonas: Zona[], idZona: number | null): Zona | undefined {
  return idZona === null ? undefined : zonas.find((z) => z.idZona === idZona && z.estadoActivo);
}

/** Con más tipos de evento que esto, el tipo se elige con el desplegable con búsqueda en vez de botones. */
const MAX_TIPOS_EN_BOTONES = 8;

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

/** Texto del enlace que abre o cierra el campo de fecha, según el modo. */
function textoBotonFecha(abierto: boolean, corrigiendo: boolean): string {
  if (abierto) return corrigiendo ? "Conservar la fecha registrada" : "Usar la hora actual";
  return corrigiendo ? "Cambiar fecha y hora" : "¿Ocurrió antes? Cambiar fecha y hora";
}

function opcionesGravedad(niveles: NivelGravedad[]): OpcionSelector[] {
  return niveles.map((nivel) => ({
    valor: nivel.idNivelGravedad,
    etiqueta: nivel.nombreNivel,
    clases: coloresGravedad(nivel.orden),
  }));
}

/** Zonas activas para el selector: nombre, distrito en la segunda línea; provincia y referencia solo para buscar. */
function opcionesZona(zonas: Zona[]): OpcionBuscable[] {
  return zonas
    .filter((z) => z.estadoActivo)
    .map((z) => ({
      valor: z.idZona,
      etiqueta: z.nombreZona,
      detalle: z.distrito,
      busqueda: `${z.provincia} ${z.referencia ?? ""}`,
    }));
}

/** Modo corrección (RF-03): la incidencia propia que se corrige y qué hacer al terminar. */
export interface Correccion {
  incidencia: MiIncidencia;
  onCorregida: (incidencia: IncidenciaResponse) => void;
  onCancelar: () => void;
  /** Avisa al modal que hay un envío en curso (para que no se cierre a medias). */
  onEnviando?: (enviando: boolean) => void;
}

/**
 * Formulario Mobile-First: selectores rápidos, descripción y confirmación al guardar. Al abrirlo se vuelve a leer el
 * usuario (la zona pudo cambiar desde el login): el Vigilante ve su zona fija y solo registra en ella; el
 * Administrador elige cualquier zona activa.
 *
 * Con `correccion` es el formulario de "Corregir" de Mis incidencias: parte de los valores de la incidencia, el
 * Vigilante ve fija la zona de la incidencia, la fecha registrada se conserva salvo que la cambie, y al guardar envía
 * `PUT /api/incidencias/{id}` con las mismas validaciones del registro.
 */
export default function FormularioIncidencia({ correccion }: { correccion?: Correccion } = {}) {
  const original = correccion?.incidencia;
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [idZona, setIdZona] = useState<number | null>(original?.zona.idZona ?? null);
  const [idTipo, setIdTipo] = useState<number | null>(original?.tipoEvento.idTipoEvento ?? null);
  const [idGravedad, setIdGravedad] = useState<number | null>(original?.nivelGravedad.idNivelGravedad ?? null);
  const [descripcion, setDescripcion] = useState(original?.descripcion ?? "");
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

  const esVigilante = usuario?.rol === "Vigilante";
  const zonaAsignada = catalogos && usuario ? zonaActiva(catalogos.zonas, usuario.idZona) : undefined;
  // Vigilante sin zona o con la zona inactiva: no puede registrar hasta que el Administrador lo resuelva.
  const bloqueoZona =
    !esVigilante || zonaAsignada || original ? undefined : usuario?.idZona === null ? AVISO_SIN_ZONA : AVISO_ZONA_INACTIVA;

  const cargar = useCallback(() => {
    Promise.all([cargarCatalogos(), refrescarUsuario()])
      .then(([datos, yo]) => {
        setCatalogos(datos);
        setUsuario(yo);
        // El Vigilante solo registra en su zona: se fija la asignada (o ninguna, si no tiene o está inactiva).
        // Al corregir se mantiene la zona de la incidencia.
        if (yo.rol === "Vigilante" && !original) setIdZona(zonaActiva(datos.zonas, yo.idZona)?.idZona ?? null);
      })
      .catch((e) => setErrorCarga(errorDeApi(e).mensaje));
  }, [original]);

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
    correccion?.onEnviando?.(true);
    const datos = {
      idZona: idZona!,
      idTipoEvento: idTipo!,
      idNivelGravedad: idGravedad!,
      descripcion: descripcion.trim(),
      ...(fechaManual ? { fechaHora: aIsoConOffset(fechaManual) } : {}),
    };
    try {
      if (correccion && original) {
        correccion.onCorregida(await corregirIncidencia(original.idIncidencia, datos));
        return;
      }
      const incidencia = await registrarIncidencia(datos);
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
      // La zona del vigilante pudo cambiar con el formulario abierto: se vuelve a leer para mostrar la actual.
      if (esVigilante && campos.idZona && !original) cargar();
    } finally {
      setEnviando(false);
      correccion?.onEnviando?.(false);
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
      // Al corregir se parte de la fecha registrada; al registrar, de la hora actual.
      setFechaManual(original ? aValorLocal(new Date(original.fechaHora)) : ahora);
    } else {
      setFechaManual(null);
    }
    validacion.alCambiar("fecha");
  }

  const errorZona = validacion.error("idZona");
  const errorDescripcion = validacion.error("descripcion");
  const motivoBloqueo = enviando ? undefined : (bloqueoZona ?? textoMotivo(validacion.primerErrorVisible(), ETIQUETAS));
  const errorFecha = validacion.error("fecha");

  return (
    <form onSubmit={enviar} noValidate className={original ? "space-y-5" : "mx-auto max-w-lg space-y-5 pb-28 sm:pb-6"}>
      {!original && <h1 className="text-xl font-bold text-blue-900">Registrar incidencia</h1>}

      {registrada && (
        <Alerta tipo="exito">
          <p className="font-semibold">Incidencia N.° {registrada.idIncidencia} registrada</p>
          <p>
            {registrada.zona.nombreZona} · {registrada.tipoEvento.nombreTipoEvento} ·{" "}
            {registrada.nivelGravedad.nombreNivel} · {FORMATO_FECHA.format(new Date(registrada.fechaHora))}
          </p>
          <Link href={RUTA_MIS_INCIDENCIAS} className="mt-1 inline-block font-semibold underline">
            Ver mis incidencias
          </Link>
        </Alerta>
      )}

      {esVigilante ? (
        <div>
          <p id="titulo-zona" className="mb-2 block text-sm font-semibold text-slate-700">
            {original ? "Zona" : "Zona asignada"}
          </p>
          {/* Solo lectura: el Vigilante registra únicamente en su zona asignada */}
          <div
            id="idZona"
            ref={validacion.registrar("idZona")}
            tabIndex={-1}
            aria-labelledby="titulo-zona"
            aria-describedby={errorZona ? idError("idZona") : undefined}
            className={`rounded-lg border bg-slate-50 px-3 py-3 focus:outline-none focus:ring-2 ${bordeCampo(!!errorZona)}`}>
            {original ? (
              // Al corregir, la zona de la incidencia (el Vigilante no puede cambiarla)
              <>
                <p className="text-base font-semibold text-blue-900">{original.zona.nombreZona}</p>
                <p className="text-sm text-slate-600">{original.zona.distrito}</p>
              </>
            ) : zonaAsignada ? (
              <>
                <p className="text-base font-semibold text-blue-900">{zonaAsignada.nombreZona}</p>
                <p className="text-sm text-slate-600">{zonaAsignada.distrito}</p>
              </>
            ) : (
              <Alerta tipo="error">{bloqueoZona}</Alerta>
            )}
          </div>
          <MensajeCampo campo="idZona" mensaje={errorZona} />
        </div>
      ) : (
        <SelectorBuscable
          titulo="Zona"
          campo="idZona"
          placeholder="Elige una zona"
          placeholderBusqueda="Buscar por nombre, distrito o referencia…"
          opciones={opcionesZona(catalogos.zonas)}
          valor={idZona}
          onCambio={elegir("idZona", setIdZona)}
          destacado={usuario?.idZona ?? null}
          error={errorZona}
          onSalir={() => validacion.alSalir("idZona")}
          refPrimero={validacion.registrar("idZona")}
        />
      )}

      {catalogos.tipos.length > MAX_TIPOS_EN_BOTONES ? (
        <SelectorBuscable
          titulo="Tipo de evento"
          campo="idTipo"
          placeholder="Elige un tipo de evento"
          opciones={catalogos.tipos.map((t) => ({ valor: t.idTipoEvento, etiqueta: t.nombreTipoEvento }))}
          valor={idTipo}
          onCambio={elegir("idTipo", setIdTipo)}
          error={validacion.error("idTipo")}
          onSalir={() => validacion.alSalir("idTipo")}
          refPrimero={validacion.registrar("idTipo")}
        />
      ) : (
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
      )}

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
          {textoBotonFecha(fechaManual !== null, !!original)}
        </button>
        {fechaManual === null ? (
          <p className="mt-1 text-xs text-slate-500">
            {original
              ? `Se conserva la registrada: ${formatearFechaHora(original.fechaHora)}.`
              : "Se registrará con la hora actual."}
          </p>
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

      {original ? (
        <div className="space-y-1">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Boton type="button" variante="secundario" onClick={correccion?.onCancelar} disabled={enviando}>
              Cancelar
            </Boton>
            <Boton
              type="submit"
              disabled={enviando || validacion.hayErroresVisibles}
              title={motivoBloqueo}
              aria-describedby={motivoBloqueo ? "motivo-correccion" : undefined}>
              {enviando ? "Guardando…" : "Guardar corrección"}
            </Boton>
          </div>
          <MotivoDesactivado id="motivo-correccion" texto={motivoBloqueo} className="text-right" />
        </div>
      ) : (
        // En el celular el botón queda fijo abajo, al alcance del pulgar y por encima de la barra inferior
        <div className="fixed inset-x-0 bottom-[var(--alto-barra-inferior,0px)] z-30 space-y-1 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <Boton
          type="submit"
          variante="peligro"
          disabled={enviando || !!bloqueoZona || validacion.hayErroresVisibles}
          title={motivoBloqueo}
          aria-describedby={motivoBloqueo ? "motivo-incidencia" : undefined}
          className="mx-auto block w-full max-w-lg py-4 text-lg">
          {enviando ? "Registrando…" : "Registrar incidencia"}
        </Boton>
        <MotivoDesactivado id="motivo-incidencia" texto={motivoBloqueo} className="mx-auto max-w-lg text-center" />
        </div>
      )}
    </form>
  );
}
