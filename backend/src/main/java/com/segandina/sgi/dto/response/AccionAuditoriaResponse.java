package com.segandina.sgi.dto.response;

import com.segandina.sgi.model.AccionAuditoria;

/**
 * Opción del filtro de acciones de la consulta de auditoría (RF-08).
 *
 * @param valor    valor que se envía en {@code accion} (p. ej. {@code LOGIN_FALLIDO})
 * @param etiqueta texto en español para mostrar
 */
public record AccionAuditoriaResponse(String valor, String etiqueta) {

	/**
	 * Convierte una acción del enum.
	 *
	 * @param accion acción origen
	 * @return la opción del filtro
	 */
	public static AccionAuditoriaResponse desde(AccionAuditoria accion) {
		return new AccionAuditoriaResponse(accion.name(), accion.getEtiqueta());
	}

}
