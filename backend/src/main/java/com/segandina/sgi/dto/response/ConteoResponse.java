package com.segandina.sgi.dto.response;

import com.segandina.sgi.dao.ConteoAgrupado;

/**
 * Cantidad de incidencias de un grupo (zona o tipo de evento) para los gráficos del dashboard (RF-05).
 *
 * @param id     id de la zona o del tipo
 * @param nombre nombre de la zona o del tipo
 * @param total  incidencias del grupo en el rango
 */
public record ConteoResponse(Long id, String nombre, long total) {

	/**
	 * Convierte un resultado del DAO.
	 *
	 * @param conteo conteo agrupado
	 * @return el conteo como DTO
	 */
	public static ConteoResponse desde(ConteoAgrupado conteo) {
		return new ConteoResponse(conteo.id(), conteo.nombre(), conteo.total());
	}

}
