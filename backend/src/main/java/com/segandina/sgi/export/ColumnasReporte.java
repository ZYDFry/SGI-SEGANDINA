package com.segandina.sgi.export;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import com.segandina.sgi.config.RelojConfig;
import com.segandina.sgi.dto.request.Periodo;
import com.segandina.sgi.dto.response.IncidenciaHistorialResponse;

/**
 * Columnas y formatos comunes a todos los exportadores, para que Excel y PDF muestren lo mismo. Las fechas se
 * muestran en hora de Lima.
 */
final class ColumnasReporte {

	/** Encabezados, en orden: las columnas del historial (RF-04) más la descripción. */
	static final List<String> ENCABEZADOS = List.of("N°", "Fecha y hora", "Zona", "Tipo de evento", "Gravedad",
			"Registrado por", "Descripción");

	static final String TITULO = "Reporte de incidencias";

	private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
	private static final DateTimeFormatter FECHA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

	private ColumnasReporte() {
	}

	/** Fecha y hora en Lima, sin zona (para celdas de fecha de Excel). */
	static LocalDateTime enLima(OffsetDateTime fechaHora) {
		return fechaHora.atZoneSameInstant(RelojConfig.ZONA_LIMA).toLocalDateTime();
	}

	/** {@code dd/MM/yyyy HH:mm} en hora de Lima. */
	static String fechaHora(OffsetDateTime fechaHora) {
		return enLima(fechaHora).format(FECHA_HORA);
	}

	/** {@code DNI - nombre completo} de quien registró la incidencia. */
	static String registrador(IncidenciaHistorialResponse fila) {
		return fila.usuario().dni() + " - " + fila.usuario().nombreCompleto();
	}

	/** Periodo y días aplicados, p. ej. {@code Últimos 30 días (25/09/2026 al 24/10/2026)}. */
	static String periodoAplicado(DatosReporte datos) {
		return etiqueta(datos.periodo()) + " (" + fecha(datos.rango().desde()) + " al "
				+ fecha(datos.rango().hasta()) + ")";
	}

	private static String fecha(LocalDate dia) {
		return dia.format(FECHA);
	}

	private static String etiqueta(Periodo periodo) {
		return switch (periodo) {
			case HOY -> "Hoy";
			case ULTIMOS_7_DIAS -> "Últimos 7 días";
			case ULTIMOS_30_DIAS -> "Últimos 30 días";
			case MES_ACTUAL -> "Mes actual";
			case ANIO_ACTUAL -> "Año actual";
			case PERSONALIZADO -> "Personalizado";
		};
	}

}
