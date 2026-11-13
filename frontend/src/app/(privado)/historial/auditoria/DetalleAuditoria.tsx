// Detalle de un registro de auditoría (`detalle_cambio`) en texto legible, sin mostrar JSON crudo.

/** Nombre en español de cada clave conocida del detalle. Una clave desconocida se muestra tal cual. */
const ETIQUETAS: Record<string, string> = {
  motivo: "Motivo",
  cambioPendiente: "Con contraseña temporal",
  idUsuario: "Usuario afectado (id)",
  origen: "Origen",
  cambioObligatorio: "Reemplazó una contraseña temporal",
  debeCambiarContrasena: "Debe cambiar la contraseña",
  contrasenaCambiada: "Contraseña cambiada",
  dni: "DNI",
  nombres: "Nombres",
  apellidoPaterno: "Apellido paterno",
  apellidoMaterno: "Apellido materno",
  idRol: "Rol (id)",
  rol: "Rol",
  idZona: "Zona (id)",
  estadoActivo: "Activo",
  idIncidencia: "Incidencia (id)",
  idTipoEvento: "Tipo de evento (id)",
  idNivelGravedad: "Nivel de gravedad (id)",
  formato: "Formato",
  periodo: "Periodo",
  desde: "Desde",
  hasta: "Hasta",
  totalRegistros: "Registros exportados",
  nombreZona: "Nombre",
  departamento: "Departamento",
  provincia: "Provincia",
  distrito: "Distrito",
  referencia: "Referencia",
  descripcion: "Descripción",
  nombreTipoEvento: "Nombre",
  nombreNivel: "Nombre",
  orden: "Orden",
  intercambiadoCon: "Intercambiado con",
};

/** Valores codificados que se traducen (motivos de login fallido, periodos, formatos, origen). */
const VALORES: Record<string, string> = {
  DNI_NO_REGISTRADO: "DNI no registrado",
  CONTRASENA_INCORRECTA: "Contraseña incorrecta",
  USUARIO_INACTIVO: "Usuario inactivo",
  HOY: "Hoy",
  ULTIMOS_7_DIAS: "Últimos 7 días",
  ULTIMOS_30_DIAS: "Últimos 30 días",
  MES_ACTUAL: "Mes actual",
  ANIO_ACTUAL: "Año actual",
  PERSONALIZADO: "Personalizado",
  EXCEL: "Excel",
  PDF: "PDF",
  propio: "El propio usuario",
};

function etiqueta(clave: string): string {
  return ETIQUETAS[clave] ?? clave;
}

/** Valor simple como texto: Sí/No, "—" para vacío, traducción de códigos y objetos anidados en línea. */
export function valorLegible(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "string") return VALORES[valor] ?? valor;
  if (typeof valor === "number") return String(valor);
  if (Array.isArray(valor)) return valor.map(valorLegible).join(", ");
  if (typeof valor === "object") {
    return Object.entries(valor as Record<string, unknown>)
      .map(([k, v]) => `${etiqueta(k)}: ${valorLegible(v)}`)
      .join(" · ");
  }
  return String(valor);
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * Lista legible del detalle. Si trae `antes`/`despues`, muestra cada campo como "valor anterior → valor nuevo"
 * (en una creación, solo el valor nuevo); el resto de claves se listan con su etiqueta.
 */
export default function DetalleAuditoria({ detalle }: { detalle: Record<string, unknown> | null }) {
  if (!detalle || Object.keys(detalle).length === 0) return <span className="text-slate-400">Sin detalle</span>;

  const { antes, despues, ...resto } = detalle;
  const hayCambio = esObjeto(despues) || esObjeto(antes);
  const campos = hayCambio
    ? Array.from(new Set([...Object.keys(esObjeto(antes) ? antes : {}), ...Object.keys(esObjeto(despues) ? despues : {})]))
    : [];

  return (
    <dl className="space-y-0.5 text-xs">
      {Object.entries(resto).map(([clave, valor]) => (
        <div key={clave} className="flex flex-wrap gap-x-1">
          <dt className="font-semibold text-slate-600">{etiqueta(clave)}:</dt>
          <dd className="text-slate-800">{valorLegible(valor)}</dd>
        </div>
      ))}
      {campos.map((campo) => {
        const anterior = esObjeto(antes) ? antes[campo] : undefined;
        const nuevo = esObjeto(despues) ? despues[campo] : undefined;
        const creado = !esObjeto(antes);
        return (
          <div key={`cambio-${campo}`} className="flex flex-wrap gap-x-1">
            <dt className="font-semibold text-slate-600">{etiqueta(campo)}:</dt>
            <dd className="text-slate-800">
              {creado ? (
                valorLegible(nuevo)
              ) : (
                <>
                  <span className="text-slate-500 line-through decoration-slate-400">{valorLegible(anterior)}</span>
                  {" → "}
                  <span className="font-medium">{valorLegible(nuevo)}</span>
                </>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
