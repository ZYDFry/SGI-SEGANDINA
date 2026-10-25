package com.segandina.sgi.dto.response;

import com.segandina.sgi.model.NivelGravedad;

/**
 * Nivel de gravedad para los selectores del formulario de incidencias (RF-03) y su administración (RF-09).
 *
 * @param idNivelGravedad id del nivel
 * @param nombreNivel     nombre (Baja, Media, Alta, Crítica)
 * @param orden           1 = menos grave; sirve al frontend para asignar colores
 * @param estadoActivo    {@code false} si el nivel está dado de baja
 */
public record NivelGravedadResponse(Short idNivelGravedad, String nombreNivel, Short orden, Boolean estadoActivo) {

	/**
	 * Construye la respuesta a partir de la entidad.
	 *
	 * @param nivel entidad origen
	 * @return el nivel de gravedad como DTO
	 */
	public static NivelGravedadResponse desde(NivelGravedad nivel) {
		return new NivelGravedadResponse(nivel.getIdNivelGravedad(), nivel.getNombreNivel(), nivel.getOrden(),
				nivel.getEstadoActivo());
	}

}
