package com.segandina.sgi.dto.request;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;

/**
 * Filtros de consulta de incidencias, tomados de los query params (RF-04, RF-05 y RF-06). Todos son
 * opcionales y se combinan con AND. El rango de fechas se resuelve con {@link RangoFechas#resolver}.
 *
 * @param periodo         periodo predefinido; sin valor, últimos 30 días
 * @param desde           primer día (AAAA-MM-DD), solo con {@link Periodo#PERSONALIZADO}
 * @param hasta           último día (AAAA-MM-DD), solo con {@link Periodo#PERSONALIZADO}
 * @param idZona          solo incidencias de esa zona
 * @param idNivelGravedad solo incidencias de ese nivel de gravedad
 * @param idTipoEvento    solo incidencias de ese tipo de evento
 */
public record IncidenciaFiltro(
		Periodo periodo,
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
		Integer idZona,
		Short idNivelGravedad,
		Short idTipoEvento) {
}
