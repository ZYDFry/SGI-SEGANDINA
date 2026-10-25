package com.segandina.sgi.dto.response;

import com.segandina.sgi.model.DespliegueZona;

/**
 * Vigilantes activos de una zona (RF-07).
 *
 * @param idZona            id de la zona
 * @param nombreZona        nombre de la zona
 * @param vigilantesActivos vigilantes activos asignados (0 si no tiene)
 */
public record DespliegueZonaResponse(Integer idZona, String nombreZona, long vigilantesActivos) {

	/**
	 * Convierte una fila de la vista.
	 *
	 * @param fila fila de {@code v_despliegue_por_zona}
	 * @return el despliegue como DTO
	 */
	public static DespliegueZonaResponse desde(DespliegueZona fila) {
		return new DespliegueZonaResponse(fila.getIdZona(), fila.getNombreZona(),
				fila.getVigilantesActivos() != null ? fila.getVigilantesActivos() : 0);
	}

}
