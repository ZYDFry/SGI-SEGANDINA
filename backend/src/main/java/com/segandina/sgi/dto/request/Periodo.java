package com.segandina.sgi.dto.request;

/**
 * Periodos predefinidos para filtrar incidencias por {@code fecha_hora} (RF-04, RF-05 y RF-06). Los días se
 * cuentan en hora de Lima e incluyen el día de hoy. Ver {@link RangoFechas#resolver}.
 */
public enum Periodo {

	/** Solo el día de hoy. */
	HOY,

	/** Hoy y los 6 días anteriores. */
	ULTIMOS_7_DIAS,

	/** Hoy y los 29 días anteriores. Es el periodo por defecto. */
	ULTIMOS_30_DIAS,

	/** Desde el día 1 del mes actual hasta hoy. */
	MES_ACTUAL,

	/** Desde el 1 de enero del año actual hasta hoy. */
	ANIO_ACTUAL,

	/** Rango explícito con {@code desde} y {@code hasta}. */
	PERSONALIZADO

}
