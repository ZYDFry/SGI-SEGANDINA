package com.segandina.sgi.dto.response;

import java.time.OffsetDateTime;

import com.segandina.sgi.model.Incidencia;

/**
 * Fila de "Mis incidencias" (RF-04): una incidencia registrada por el usuario autenticado. No repite quién la
 * registró, porque siempre es el propio usuario.
 *
 * @param idIncidencia  id de la incidencia
 * @param fechaHora     cuándo ocurrió
 * @param fechaRegistro cuándo se guardó en el sistema
 * @param descripcion   descripción
 * @param zona          zona de la incidencia
 * @param tipoEvento    tipo de evento
 * @param nivelGravedad nivel de gravedad
 * @param editableHasta hasta cuándo puede corregirla su autor; por ahora siempre {@code null} (la edición aún no
 *                      existe)
 */
public record MiIncidenciaResponse(Long idIncidencia, OffsetDateTime fechaHora, OffsetDateTime fechaRegistro,
		String descripcion, ZonaResponse zona, TipoEventoResponse tipoEvento, NivelGravedadResponse nivelGravedad,
		OffsetDateTime editableHasta) {

	/**
	 * Construye la fila a partir de la entidad, con sus relaciones ya cargadas.
	 *
	 * @param incidencia entidad origen
	 * @return la fila, con {@code editableHasta} en {@code null}
	 */
	public static MiIncidenciaResponse desde(Incidencia incidencia) {
		return new MiIncidenciaResponse(
				incidencia.getIdIncidencia(),
				incidencia.getFechaHora(),
				incidencia.getFechaRegistro(),
				incidencia.getDescripcion(),
				ZonaResponse.desde(incidencia.getZona()),
				TipoEventoResponse.desde(incidencia.getTipoEvento()),
				NivelGravedadResponse.desde(incidencia.getNivelGravedad()),
				null);
	}

}
