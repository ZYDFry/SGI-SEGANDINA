package com.segandina.sgi.dto.request;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

import com.segandina.sgi.config.RelojConfig;
import com.segandina.sgi.exception.ReglaNegocioException;

/**
 * Pruebas del cálculo de rangos de fechas con relojes fijos (hora de Lima, UTC-5).
 */
class RangoFechasTest {

	private static final Clock RELOJ = reloj("2026-10-24T10:00:00-05:00");

	@Test
	void sinPeriodoUsaLosUltimos30DiasIncluyendoHoy() {
		RangoFechas rango = RangoFechas.resolver(null, null, null, RELOJ);

		assertEquals(LocalDate.of(2026, 9, 25), rango.desde());
		assertEquals(LocalDate.of(2026, 10, 24), rango.hasta());
		assertEquals(30, rango.dias());
	}

	@Test
	void periodosPredefinidos() {
		assertRango(Periodo.HOY, "2026-10-24", "2026-10-24");
		assertRango(Periodo.ULTIMOS_7_DIAS, "2026-10-18", "2026-10-24");
		assertRango(Periodo.MES_ACTUAL, "2026-10-01", "2026-10-24");
		assertRango(Periodo.ANIO_ACTUAL, "2026-01-01", "2026-10-24");
	}

	@Test
	void limitesDelDiaEnHoraDeLimaConIntervaloSemiabierto() {
		RangoFechas rango = RangoFechas.resolver(Periodo.HOY, null, null, RELOJ);

		assertEquals(OffsetDateTime.parse("2026-10-24T00:00:00-05:00"), rango.inicio());
		assertEquals(OffsetDateTime.parse("2026-10-25T00:00:00-05:00"), rango.fin());
	}

	@Test
	void cambioDeDiaSeCalculaEnLimaAunqueEnUtcYaSeaOtroDia() {
		// 23:59:59 en Lima = 04:59:59 UTC del día siguiente: sigue siendo "hoy" en Lima
		Clock casiMedianoche = Clock.fixed(Instant.parse("2026-10-25T04:59:59Z"), ZoneOffset.UTC);
		RangoFechas antes = RangoFechas.resolver(Periodo.HOY, null, null, casiMedianoche);
		assertEquals(LocalDate.of(2026, 10, 24), antes.desde());

		Clock medianoche = Clock.fixed(Instant.parse("2026-10-25T05:00:00Z"), ZoneOffset.UTC);
		RangoFechas despues = RangoFechas.resolver(Periodo.HOY, null, null, medianoche);
		assertEquals(LocalDate.of(2026, 10, 25), despues.desde());
		assertEquals(OffsetDateTime.parse("2026-10-25T00:00:00-05:00"), despues.inicio());
	}

	@Test
	void finDeMes() {
		Clock fin31 = reloj("2026-10-31T23:00:00-05:00");
		assertEquals(new RangoFechas(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31)),
				RangoFechas.resolver(Periodo.MES_ACTUAL, null, null, fin31));
		assertEquals(OffsetDateTime.parse("2026-11-01T00:00:00-05:00"),
				RangoFechas.resolver(Periodo.HOY, null, null, fin31).fin());

		// Los 30 días cruzan a septiembre (que tiene 30 días)
		assertEquals(LocalDate.of(2026, 10, 2), RangoFechas.resolver(null, null, null, fin31).desde());

		// El día 1, el mes actual es solo ese día
		Clock dia1 = reloj("2026-11-01T08:00:00-05:00");
		assertEquals(new RangoFechas(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 1)),
				RangoFechas.resolver(Periodo.MES_ACTUAL, null, null, dia1));
	}

	@Test
	void anioBisiesto() {
		Clock bisiesto = reloj("2028-02-29T12:00:00-05:00");
		assertEquals(new RangoFechas(LocalDate.of(2028, 2, 1), LocalDate.of(2028, 2, 29)),
				RangoFechas.resolver(Periodo.MES_ACTUAL, null, null, bisiesto));
		assertEquals(LocalDate.of(2028, 2, 23),
				RangoFechas.resolver(Periodo.ULTIMOS_7_DIAS, null, null, bisiesto).desde());
		assertEquals(60, RangoFechas.resolver(Periodo.ANIO_ACTUAL, null, null, bisiesto).dias());

		// 2028 completo tiene 366 días: es el máximo permitido
		RangoFechas anio = RangoFechas.resolver(Periodo.PERSONALIZADO, LocalDate.of(2028, 1, 1),
				LocalDate.of(2028, 12, 31), RELOJ);
		assertEquals(366, anio.dias());
	}

	@Test
	void personalizadoDeUnSoloDia() {
		LocalDate dia = LocalDate.of(2026, 10, 1);
		RangoFechas rango = RangoFechas.resolver(Periodo.PERSONALIZADO, dia, dia, RELOJ);
		assertEquals(1, rango.dias());
	}

	@Test
	void rangoInvertidoSeRechaza() {
		assertThrows(ReglaNegocioException.class, () -> RangoFechas.resolver(Periodo.PERSONALIZADO,
				LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 1), RELOJ));
	}

	@Test
	void rangoExcesivoSeRechaza() {
		// 367 días (2026-01-01 a 2027-01-02)
		assertThrows(ReglaNegocioException.class, () -> RangoFechas.resolver(Periodo.PERSONALIZADO,
				LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 2), RELOJ));
		// 367 días en bisiesto (2028-01-01 a 2029-01-01)
		assertThrows(ReglaNegocioException.class, () -> RangoFechas.resolver(Periodo.PERSONALIZADO,
				LocalDate.of(2028, 1, 1), LocalDate.of(2029, 1, 1), RELOJ));
	}

	@Test
	void personalizadoSinAlgunaFechaSeRechaza() {
		assertThrows(ReglaNegocioException.class,
				() -> RangoFechas.resolver(Periodo.PERSONALIZADO, LocalDate.of(2026, 10, 1), null, RELOJ));
		assertThrows(ReglaNegocioException.class,
				() -> RangoFechas.resolver(Periodo.PERSONALIZADO, null, null, RELOJ));
	}

	@Test
	void fechasSinPeriodoPersonalizadoSeRechazan() {
		assertThrows(ReglaNegocioException.class,
				() -> RangoFechas.resolver(Periodo.HOY, LocalDate.of(2026, 10, 1), null, RELOJ));
		assertThrows(ReglaNegocioException.class,
				() -> RangoFechas.resolver(null, null, LocalDate.of(2026, 10, 1), RELOJ));
	}

	@Test
	void agrupacionPorDefectoSegunLargoDelRango() {
		LocalDate inicio = LocalDate.of(2026, 1, 1);
		assertEquals(Agrupacion.DIA, Agrupacion.porDefecto(new RangoFechas(inicio, inicio.plusDays(30))));
		assertEquals(Agrupacion.SEMANA, Agrupacion.porDefecto(new RangoFechas(inicio, inicio.plusDays(31))));
		assertEquals(Agrupacion.SEMANA, Agrupacion.porDefecto(new RangoFechas(inicio, inicio.plusDays(179))));
		assertEquals(Agrupacion.MES, Agrupacion.porDefecto(new RangoFechas(inicio, inicio.plusDays(180))));
	}

	private static void assertRango(Periodo periodo, String desde, String hasta) {
		RangoFechas rango = RangoFechas.resolver(periodo, null, null, RELOJ);
		assertEquals(LocalDate.parse(desde), rango.desde(), periodo + " desde");
		assertEquals(LocalDate.parse(hasta), rango.hasta(), periodo + " hasta");
	}

	private static Clock reloj(String instante) {
		return Clock.fixed(OffsetDateTime.parse(instante).toInstant(), RelojConfig.ZONA_LIMA);
	}

}
