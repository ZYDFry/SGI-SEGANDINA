package com.segandina.sgi.dto.response;

import java.time.LocalDate;
import java.util.List;

import com.segandina.sgi.dto.request.Agrupacion;

/**
 * Incidencias por tramo de tiempo para el gráfico de evolución del dashboard (RF-05). Incluye todos los
 * tramos del rango, también los que no tienen incidencias.
 *
 * @param agrupacion agrupación usada (pedida o por defecto)
 * @param desde      primer día del rango
 * @param hasta      último día del rango
 * @param puntos     tramos en orden cronológico
 */
public record SerieTiempoResponse(Agrupacion agrupacion, LocalDate desde, LocalDate hasta, List<Punto> puntos) {

	/**
	 * Un tramo de la serie. El primero y el último se recortan a los bordes del rango (p. ej. una semana que
	 * empieza antes de {@code desde} arranca en {@code desde}).
	 *
	 * @param inicio primer día del tramo
	 * @param fin    último día del tramo (inclusive)
	 * @param total  incidencias del tramo
	 */
	public record Punto(LocalDate inicio, LocalDate fin, long total) {
	}

}
