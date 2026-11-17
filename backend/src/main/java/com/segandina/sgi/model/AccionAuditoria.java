package com.segandina.sgi.model;

/**
 * Acciones críticas que se registran en la tabla {@code auditoria} (RF-08).
 * <p>
 * El nombre de cada constante es el valor que se guarda en {@code accion_realizada}; la etiqueta es el texto
 * en español que se muestra en el filtro de la consulta de auditoría.
 */
public enum AccionAuditoria {

	LOGIN_OK("Inicio de sesión correcto"),
	LOGIN_FALLIDO("Inicio de sesión fallido"),
	CREAR_USUARIO("Crear usuario"),
	MODIFICAR_USUARIO("Modificar usuario"),
	CAMBIAR_ESTADO_USUARIO("Activar o desactivar usuario"),
	CAMBIAR_CONTRASENA("Cambiar contraseña propia"),
	RESTABLECER_CONTRASENA("Restablecer contraseña"),
	REASIGNAR_ZONA("Reasignar zona de vigilante"),
	REGISTRAR_INCIDENCIA("Registrar incidencia"),
	EXPORTAR_REPORTE("Exportar reporte"),
	CREAR_ZONA("Crear zona"),
	MODIFICAR_ZONA("Modificar zona"),
	CAMBIAR_ESTADO_ZONA("Activar o desactivar zona"),
	CREAR_TIPO_EVENTO("Crear tipo de evento"),
	MODIFICAR_TIPO_EVENTO("Modificar tipo de evento"),
	CAMBIAR_ESTADO_TIPO_EVENTO("Activar o desactivar tipo de evento"),
	MODIFICAR_NIVEL_GRAVEDAD("Modificar nivel de gravedad");

	private final String etiqueta;

	AccionAuditoria(String etiqueta) {
		this.etiqueta = etiqueta;
	}

	/** Texto legible en español de la acción. */
	public String getEtiqueta() {
		return etiqueta;
	}

	/**
	 * Etiqueta del valor guardado en {@code accion_realizada}.
	 *
	 * @param valor texto guardado en la BD
	 * @return la etiqueta de la acción, o el mismo texto si no corresponde a ninguna acción conocida
	 */
	public static String etiquetaDe(String valor) {
		for (AccionAuditoria accion : values()) {
			if (accion.name().equals(valor)) {
				return accion.etiqueta;
			}
		}
		return valor;
	}

}
