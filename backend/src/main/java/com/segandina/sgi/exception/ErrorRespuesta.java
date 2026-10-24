package com.segandina.sgi.exception;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Formato uniforme de error de la API: {@code { timestamp, status, mensaje, detalles }}.
 *
 * @param timestamp momento del error
 * @param status    código HTTP
 * @param mensaje   mensaje legible para el usuario
 * @param detalles  errores puntuales (p. ej. por campo); lista vacía si no hay
 */
public record ErrorRespuesta(OffsetDateTime timestamp, int status, String mensaje, List<String> detalles) {

	/**
	 * Crea un error con la fecha y hora actual.
	 *
	 * @param status   código HTTP
	 * @param mensaje  mensaje legible
	 * @param detalles errores puntuales
	 * @return el error listo para serializar
	 */
	public static ErrorRespuesta de(int status, String mensaje, List<String> detalles) {
		return new ErrorRespuesta(OffsetDateTime.now(), status, mensaje, detalles);
	}

}
