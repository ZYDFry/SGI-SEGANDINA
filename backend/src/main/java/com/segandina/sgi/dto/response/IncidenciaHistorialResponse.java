package com.segandina.sgi.dto.response;

import java.time.OffsetDateTime;

import com.segandina.sgi.model.Incidencia;
import com.segandina.sgi.model.Usuario;

/**
 * Fila del historial de incidencias (RF-04). Incluye quién la registró, sin datos sensibles.
 *
 * @param idIncidencia  id de la incidencia
 * @param fechaHora     cuándo ocurrió
 * @param fechaRegistro cuándo se guardó en el sistema
 * @param descripcion   descripción
 * @param zona          zona de la incidencia
 * @param tipoEvento    tipo de evento
 * @param nivelGravedad nivel de gravedad
 * @param usuario       usuario que la registró
 */
public record IncidenciaHistorialResponse(Long idIncidencia, OffsetDateTime fechaHora, OffsetDateTime fechaRegistro,
		String descripcion, ZonaResponse zona, TipoEventoResponse tipoEvento, NivelGravedadResponse nivelGravedad,
		Registrador usuario) {

	/**
	 * Usuario que registró la incidencia.
	 *
	 * @param idUsuario      id del usuario
	 * @param dni            DNI
	 * @param nombreCompleto nombres y apellidos
	 */
	public record Registrador(Long idUsuario, String dni, String nombreCompleto) {

		static Registrador desde(Usuario usuario) {
			StringBuilder nombre = new StringBuilder(usuario.getNombres()).append(' ')
					.append(usuario.getApellidoPaterno());
			if (usuario.getApellidoMaterno() != null && !usuario.getApellidoMaterno().isBlank()) {
				nombre.append(' ').append(usuario.getApellidoMaterno());
			}
			return new Registrador(usuario.getIdUsuario(), usuario.getDni(), nombre.toString());
		}

	}

	/**
	 * Construye la fila a partir de la entidad, con sus relaciones ya cargadas.
	 *
	 * @param incidencia entidad origen
	 * @return la fila del historial
	 */
	public static IncidenciaHistorialResponse desde(Incidencia incidencia) {
		return new IncidenciaHistorialResponse(
				incidencia.getIdIncidencia(),
				incidencia.getFechaHora(),
				incidencia.getFechaRegistro(),
				incidencia.getDescripcion(),
				ZonaResponse.desde(incidencia.getZona()),
				TipoEventoResponse.desde(incidencia.getTipoEvento()),
				NivelGravedadResponse.desde(incidencia.getNivelGravedad()),
				Registrador.desde(incidencia.getUsuario()));
	}

}
