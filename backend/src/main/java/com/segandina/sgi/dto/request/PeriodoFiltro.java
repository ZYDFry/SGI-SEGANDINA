package com.segandina.sgi.dto.request;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;

/**
 * Solo el rango de fechas, tomado de los query params. Lo usa "Mis incidencias" (RF-04), que no filtra por zona,
 * tipo ni nivel. Se resuelve con {@link RangoFechas#resolver}, con las mismas reglas que el historial.
 *
 * @param periodo periodo predefinido; sin valor, últimos 30 días
 * @param desde   primer día (AAAA-MM-DD), solo con {@link Periodo#PERSONALIZADO}
 * @param hasta   último día (AAAA-MM-DD), solo con {@link Periodo#PERSONALIZADO}
 */
public record PeriodoFiltro(
		Periodo periodo,
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
}
