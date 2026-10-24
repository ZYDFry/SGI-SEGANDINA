package com.segandina.sgi.dto.response;

import com.segandina.sgi.model.Zona;

/**
 * Datos de una zona para el frontend (listado y formularios de RF-09).
 *
 * @param idZona       id de la zona
 * @param nombreZona   nombre único de la zona
 * @param departamento departamento
 * @param provincia    provincia
 * @param distrito     distrito
 * @param referencia   dirección o punto de referencia; puede ser {@code null}
 * @param descripcion  descripción libre; puede ser {@code null}
 * @param estadoActivo {@code false} si la zona está dada de baja
 */
public record ZonaResponse(Integer idZona, String nombreZona, String departamento, String provincia,
		String distrito, String referencia, String descripcion, Boolean estadoActivo) {

	/**
	 * Construye la respuesta a partir de la entidad.
	 *
	 * @param zona entidad origen
	 * @return la zona como DTO
	 */
	public static ZonaResponse desde(Zona zona) {
		return new ZonaResponse(
				zona.getIdZona(),
				zona.getNombreZona(),
				zona.getDepartamento(),
				zona.getProvincia(),
				zona.getDistrito(),
				zona.getReferencia(),
				zona.getDescripcion(),
				zona.getEstadoActivo());
	}

}
