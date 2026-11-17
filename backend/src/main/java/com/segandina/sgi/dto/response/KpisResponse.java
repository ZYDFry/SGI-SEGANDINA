package com.segandina.sgi.dto.response;

import java.time.LocalDate;
import java.util.List;

/**
 * Indicadores principales del dashboard (RF-05).
 *
 * @param desde              primer día del rango consultado
 * @param hasta              último día del rango consultado
 * @param incidenciasHoy     incidencias de hoy (en Lima) con los mismos filtros de zona, nivel y tipo
 * @param incidenciasPeriodo incidencias del rango
 * @param desdeAnterior      primer día del periodo anterior (mismo largo, justo antes del rango)
 * @param hastaAnterior      último día del periodo anterior (el día antes de {@code desde})
 * @param incidenciasPeriodoAnterior incidencias del periodo anterior con los mismos filtros de zona, nivel y tipo
 * @param porGravedad        incidencias del rango por nivel de gravedad, del menos al más grave
 */
public record KpisResponse(LocalDate desde, LocalDate hasta, long incidenciasHoy, long incidenciasPeriodo,
		LocalDate desdeAnterior, LocalDate hastaAnterior, long incidenciasPeriodoAnterior,
		List<ConteoGravedad> porGravedad) {

	/**
	 * Incidencias de un nivel de gravedad. Están todos los niveles activos (con 0 si no hay datos) y los
	 * inactivos que tengan incidencias en el rango.
	 *
	 * @param idNivelGravedad id del nivel
	 * @param nombreNivel     nombre del nivel
	 * @param orden           1 = menos grave
	 * @param total           incidencias del nivel en el rango
	 */
	public record ConteoGravedad(Short idNivelGravedad, String nombreNivel, Short orden, long total) {
	}

}
