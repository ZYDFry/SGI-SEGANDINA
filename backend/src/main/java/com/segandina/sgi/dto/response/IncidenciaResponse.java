package com.segandina.sgi.dto.response;

import java.time.OffsetDateTime;

import com.segandina.sgi.model.Incidencia;

/**
 * Incidencia registrada, tal como se devuelve al frontend. No incluye datos sensibles del usuario.
 *
 * @param idIncidencia  id generado por la BD
 * @param fechaHora     cuándo ocurrió
 * @param descripcion   descripción guardada (sin espacios al inicio ni al final)
 * @param zona          zona de la incidencia
 * @param tipoEvento    tipo de evento
 * @param nivelGravedad nivel de gravedad
 * @param idUsuario     usuario que la registró (el dueño del token)
 */
public record IncidenciaResponse(Long idIncidencia, OffsetDateTime fechaHora, String descripcion, ZonaResponse zona,
		TipoEventoResponse tipoEvento, NivelGravedadResponse nivelGravedad, Long idUsuario) {

	/**
	 * Construye la respuesta a partir de la entidad (con sus relaciones ya cargadas).
	 *
	 * @param incidencia entidad origen
	 * @return la incidencia como DTO
	 */
	public static IncidenciaResponse desde(Incidencia incidencia) {
		return new IncidenciaResponse(
				incidencia.getIdIncidencia(),
				incidencia.getFechaHora(),
				incidencia.getDescripcion(),
				ZonaResponse.desde(incidencia.getZona()),
				TipoEventoResponse.desde(incidencia.getTipoEvento()),
				NivelGravedadResponse.desde(incidencia.getNivelGravedad()),
				incidencia.getUsuario().getIdUsuario());
	}

}
