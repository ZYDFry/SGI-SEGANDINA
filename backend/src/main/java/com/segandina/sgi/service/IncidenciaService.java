package com.segandina.sgi.service;

import java.time.Duration;

import com.segandina.sgi.dto.request.IncidenciaRequest;
import com.segandina.sgi.dto.response.IncidenciaResponse;

/**
 * Lógica de negocio de incidencias (RF-03).
 */
public interface IncidenciaService {

	/** Nombre del tipo de evento que exige una descripción más detallada. */
	String TIPO_OTRO = "Otro";

	/** Largo mínimo de la descripción (sin espacios en los extremos) cuando el tipo es {@link #TIPO_OTRO}. */
	int MIN_DESCRIPCION_OTRO = 20;

	/** Margen aceptado para una {@code fechaHora} adelantada, por desfase del reloj del celular. */
	Duration TOLERANCIA_RELOJ = Duration.ofMinutes(2);

	/**
	 * Registra una incidencia a nombre del usuario autenticado y audita {@code REGISTRAR_INCIDENCIA} en la
	 * misma transacción.
	 *
	 * @param request   datos del formulario
	 * @param idUsuario id del usuario, tomado del token (nunca del body)
	 * @return la incidencia guardada
	 * @throws com.segandina.sgi.exception.CredencialesInvalidasException si el usuario no existe o está inactivo
	 * @throws com.segandina.sgi.exception.ReglaNegocioException si la zona, el tipo o el nivel no existe o está
	 *         inactivo, si la fecha es futura o si la descripción de un tipo "Otro" es demasiado corta
	 */
	IncidenciaResponse registrar(IncidenciaRequest request, Long idUsuario);

}
