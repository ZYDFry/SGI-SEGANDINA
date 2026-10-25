package com.segandina.sgi.dto.request;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

import com.segandina.sgi.config.RelojConfig;
import com.segandina.sgi.exception.ReglaNegocioException;

/**
 * Rango de días (ambos inclusive, en hora de Lima) sobre el que se filtran las incidencias por
 * {@code fecha_hora}. Lo comparten el historial (RF-04), el dashboard (RF-05) y los reportes (RF-06).
 * <p>
 * Para consultar la BD se usa el intervalo semiabierto {@code [inicio(), fin())}: desde las 00:00 de
 * {@code desde} hasta las 00:00 del día siguiente a {@code hasta}, ambos en America/Lima.
 *
 * @param desde primer día del rango
 * @param hasta último día del rango
 */
public record RangoFechas(LocalDate desde, LocalDate hasta) {

	/** Máximo de días (inclusive) de un rango personalizado: un año bisiesto completo. */
	public static final int MAX_DIAS = 366;

	/** Periodo que se usa cuando no se envía ninguno. */
	public static final Periodo PERIODO_POR_DEFECTO = Periodo.ULTIMOS_30_DIAS;

	/**
	 * Calcula el rango de un periodo a partir del día de hoy en Lima.
	 *
	 * @param periodo periodo pedido; {@code null} equivale a {@link #PERIODO_POR_DEFECTO}
	 * @param desde   primer día; solo se acepta (y es obligatorio) con {@link Periodo#PERSONALIZADO}
	 * @param hasta   último día; solo se acepta (y es obligatorio) con {@link Periodo#PERSONALIZADO}
	 * @param reloj   reloj de la aplicación (se usa en hora de Lima, sea cual sea su zona)
	 * @return el rango resuelto
	 * @throws ReglaNegocioException si se envían fechas sin {@code PERSONALIZADO}, si faltan con
	 *         {@code PERSONALIZADO}, si {@code desde > hasta} o si el rango supera {@link #MAX_DIAS} días
	 */
	public static RangoFechas resolver(Periodo periodo, LocalDate desde, LocalDate hasta, Clock reloj) {
		Periodo elegido = periodo != null ? periodo : PERIODO_POR_DEFECTO;
		if (elegido != Periodo.PERSONALIZADO && (desde != null || hasta != null)) {
			throw new ReglaNegocioException("Las fechas desde y hasta solo se aceptan con periodo=PERSONALIZADO");
		}
		LocalDate hoy = LocalDate.now(reloj.withZone(RelojConfig.ZONA_LIMA));
		return switch (elegido) {
			case HOY -> new RangoFechas(hoy, hoy);
			case ULTIMOS_7_DIAS -> new RangoFechas(hoy.minusDays(6), hoy);
			case ULTIMOS_30_DIAS -> new RangoFechas(hoy.minusDays(29), hoy);
			case MES_ACTUAL -> new RangoFechas(hoy.withDayOfMonth(1), hoy);
			case ANIO_ACTUAL -> new RangoFechas(hoy.withDayOfYear(1), hoy);
			case PERSONALIZADO -> personalizado(desde, hasta);
		};
	}

	private static RangoFechas personalizado(LocalDate desde, LocalDate hasta) {
		if (desde == null || hasta == null) {
			throw new ReglaNegocioException("Con periodo=PERSONALIZADO debe enviar desde y hasta (AAAA-MM-DD)");
		}
		if (desde.isAfter(hasta)) {
			throw new ReglaNegocioException("La fecha desde no puede ser posterior a hasta");
		}
		RangoFechas rango = new RangoFechas(desde, hasta);
		if (rango.dias() > MAX_DIAS) {
			throw new ReglaNegocioException("El rango no puede superar " + MAX_DIAS + " días");
		}
		return rango;
	}

	/** Inicio del rango (incluido): las 00:00 de {@code desde} en Lima. */
	public OffsetDateTime inicio() {
		return desde.atStartOfDay(RelojConfig.ZONA_LIMA).toOffsetDateTime();
	}

	/** Fin del rango (excluido): las 00:00 del día siguiente a {@code hasta} en Lima. */
	public OffsetDateTime fin() {
		return hasta.plusDays(1).atStartOfDay(RelojConfig.ZONA_LIMA).toOffsetDateTime();
	}

	/** Cantidad de días del rango, contando ambos extremos. */
	public long dias() {
		return ChronoUnit.DAYS.between(desde, hasta) + 1;
	}

}
