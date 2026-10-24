package com.segandina.sgi.dto.response;

import com.segandina.sgi.model.TipoEvento;

/**
 * Tipo de evento para los selectores del formulario de incidencias (RF-03).
 *
 * @param idTipoEvento     id del tipo
 * @param nombreTipoEvento nombre (Robo, Accidente, Alerta, Otro)
 */
public record TipoEventoResponse(Short idTipoEvento, String nombreTipoEvento) {

	/**
	 * Construye la respuesta a partir de la entidad.
	 *
	 * @param tipo entidad origen
	 * @return el tipo de evento como DTO
	 */
	public static TipoEventoResponse desde(TipoEvento tipo) {
		return new TipoEventoResponse(tipo.getIdTipoEvento(), tipo.getNombreTipoEvento());
	}

}
