package com.segandina.sgi.export;

import java.time.OffsetDateTime;
import java.util.List;

import com.segandina.sgi.dto.request.Periodo;
import com.segandina.sgi.dto.request.RangoFechas;
import com.segandina.sgi.dto.response.IncidenciaHistorialResponse;

/**
 * Contenido de un reporte de incidencias, ya consultado y listo para que un {@link ExportadorReporte} lo
 * convierta en archivo.
 *
 * @param periodo    periodo aplicado (nunca {@code null}: sin periodo en la petición, el de por defecto)
 * @param rango      días del reporte, ya resueltos
 * @param generadoEn momento en que se generó el reporte
 * @param filas      incidencias del reporte, en el orden en que deben aparecer; puede estar vacía
 */
public record DatosReporte(Periodo periodo, RangoFechas rango, OffsetDateTime generadoEn,
		List<IncidenciaHistorialResponse> filas) {
}
