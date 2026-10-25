package com.segandina.sgi.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import com.segandina.sgi.config.RelojConfig;
import com.segandina.sgi.dao.ConteoAgrupado;
import com.segandina.sgi.dao.ConteoDiario;
import com.segandina.sgi.dao.DespliegueZonaDao;
import com.segandina.sgi.dao.IncidenciaDao;
import com.segandina.sgi.dao.NivelGravedadDao;
import com.segandina.sgi.dto.request.Agrupacion;
import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.request.Periodo;
import com.segandina.sgi.dto.request.RangoFechas;
import com.segandina.sgi.dto.response.ConteoResponse;
import com.segandina.sgi.dto.response.DespliegueZonaResponse;
import com.segandina.sgi.dto.response.KpisResponse;
import com.segandina.sgi.dto.response.SerieTiempoResponse;
import com.segandina.sgi.dto.response.SerieTiempoResponse.Punto;
import com.segandina.sgi.exception.ReglaNegocioException;
import com.segandina.sgi.model.DespliegueZona;
import com.segandina.sgi.model.NivelGravedad;

/**
 * Pruebas del dashboard (RF-05 y RF-07) con DAO simulados y un reloj fijo el sábado 24-oct-2026 en Lima.
 */
class DashboardServiceImplTest {

	private static final Clock RELOJ = Clock.fixed(OffsetDateTime.parse("2026-10-24T10:00:00-05:00").toInstant(),
			RelojConfig.ZONA_LIMA);

	private IncidenciaDao incidenciaDao;
	private NivelGravedadDao nivelGravedadDao;
	private DespliegueZonaDao despliegueZonaDao;
	private DashboardServiceImpl dashboardService;

	@BeforeEach
	void preparar() {
		incidenciaDao = mock(IncidenciaDao.class);
		nivelGravedadDao = mock(NivelGravedadDao.class);
		despliegueZonaDao = mock(DespliegueZonaDao.class);
		dashboardService = new DashboardServiceImpl(incidenciaDao, nivelGravedadDao, despliegueZonaDao, RELOJ);
	}

	@Test
	void serieSinDatosDevuelveTodosLosDiasEnCero() {
		when(incidenciaDao.contarPorDia(any(), any())).thenReturn(List.of());

		SerieTiempoResponse serie = dashboardService.incidenciasPorTiempo(filtro(Periodo.ULTIMOS_7_DIAS), null);

		assertEquals(Agrupacion.DIA, serie.agrupacion());
		assertEquals(7, serie.puntos().size());
		assertTrue(serie.puntos().stream().allMatch(p -> p.total() == 0));
		assertEquals(LocalDate.of(2026, 10, 18), serie.puntos().get(0).inicio());
		assertEquals(LocalDate.of(2026, 10, 24), serie.puntos().get(6).fin());
	}

	@Test
	void serieDiariaRellenaLosHuecosConCero() {
		RangoFechas rango = new RangoFechas(LocalDate.of(2026, 10, 18), LocalDate.of(2026, 10, 24));
		when(incidenciaDao.contarPorDia(eq(rango), any())).thenReturn(List.of(
				new ConteoDiario(LocalDate.of(2026, 10, 18), 3),
				new ConteoDiario(LocalDate.of(2026, 10, 21), 1)));

		List<Long> totales = dashboardService.incidenciasPorTiempo(filtro(Periodo.ULTIMOS_7_DIAS), null).puntos()
				.stream().map(Punto::total).toList();

		assertEquals(List.of(3L, 0L, 0L, 1L, 0L, 0L, 0L), totales);
	}

	@Test
	void serieSemanalRecortaLaPrimeraYLaUltimaSemanaAlRango() {
		// Jueves 1-oct a sábado 24-oct: semanas de lunes a domingo
		IncidenciaFiltro filtro = personalizado("2026-10-01", "2026-10-24");
		when(incidenciaDao.contarPorDia(any(), any())).thenReturn(List.of(
				new ConteoDiario(LocalDate.of(2026, 10, 4), 2),
				new ConteoDiario(LocalDate.of(2026, 10, 5), 5),
				new ConteoDiario(LocalDate.of(2026, 10, 24), 1)));

		SerieTiempoResponse serie = dashboardService.incidenciasPorTiempo(filtro, Agrupacion.SEMANA);

		assertEquals(List.of(
				new Punto(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 4), 2),
				new Punto(LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 11), 5),
				new Punto(LocalDate.of(2026, 10, 12), LocalDate.of(2026, 10, 18), 0),
				new Punto(LocalDate.of(2026, 10, 19), LocalDate.of(2026, 10, 24), 1)), serie.puntos());
	}

	@Test
	void serieMensualCruzaElAnioYRespetaFebreroBisiesto() {
		IncidenciaFiltro filtro = personalizado("2027-12-15", "2028-03-10");
		when(incidenciaDao.contarPorDia(any(), any())).thenReturn(List.of(
				new ConteoDiario(LocalDate.of(2027, 12, 31), 4),
				new ConteoDiario(LocalDate.of(2028, 2, 29), 2)));

		SerieTiempoResponse serie = dashboardService.incidenciasPorTiempo(filtro, Agrupacion.MES);

		assertEquals(List.of(
				new Punto(LocalDate.of(2027, 12, 15), LocalDate.of(2027, 12, 31), 4),
				new Punto(LocalDate.of(2028, 1, 1), LocalDate.of(2028, 1, 31), 0),
				new Punto(LocalDate.of(2028, 2, 1), LocalDate.of(2028, 2, 29), 2),
				new Punto(LocalDate.of(2028, 3, 1), LocalDate.of(2028, 3, 10), 0)), serie.puntos());
	}

	@Test
	void agrupacionPorDefectoDependeDelLargoDelRango() {
		when(incidenciaDao.contarPorDia(any(), any())).thenReturn(List.of());

		assertEquals(Agrupacion.DIA, agrupacionUsada("2026-10-01", "2026-10-31"));
		assertEquals(Agrupacion.SEMANA, agrupacionUsada("2026-10-01", "2026-11-01"));
		assertEquals(Agrupacion.SEMANA, agrupacionUsada("2026-01-01", "2026-06-29"));
		assertEquals(Agrupacion.MES, agrupacionUsada("2026-01-01", "2026-06-30"));
	}

	@Test
	void rangoInvalidoNoConsultaLaBd() {
		assertThrows(ReglaNegocioException.class,
				() -> dashboardService.incidenciasPorTiempo(personalizado("2026-10-10", "2026-10-01"), null));
		assertThrows(ReglaNegocioException.class,
				() -> dashboardService.kpis(personalizado("2025-01-01", "2026-10-01")));
		verifyNoInteractions(incidenciaDao);
	}

	@Test
	@SuppressWarnings("unchecked")
	void kpisCompletanLosNivelesSinIncidenciasConCero() {
		when(incidenciaDao.count(any(Specification.class))).thenReturn(2L, 15L);
		when(incidenciaDao.contarPorNivel(any(), any())).thenReturn(List.of(
				new ConteoAgrupado(3L, "Alta", 10), new ConteoAgrupado(1L, "Baja", 5)));
		when(nivelGravedadDao.findAll(any(Sort.class))).thenReturn(List.of(
				nivel(1, "Baja", 1, true), nivel(2, "Media", 2, true), nivel(3, "Alta", 3, true),
				nivel(4, "Crítica", 4, false)));

		KpisResponse kpis = dashboardService.kpis(filtro(null));

		assertEquals(LocalDate.of(2026, 9, 25), kpis.desde());
		assertEquals(LocalDate.of(2026, 10, 24), kpis.hasta());
		assertEquals(2, kpis.incidenciasHoy());
		assertEquals(15, kpis.incidenciasPeriodo());
		// "Crítica" está inactivo y sin incidencias: no se muestra
		assertEquals(List.of(
				new KpisResponse.ConteoGravedad((short) 1, "Baja", (short) 1, 5),
				new KpisResponse.ConteoGravedad((short) 2, "Media", (short) 2, 0),
				new KpisResponse.ConteoGravedad((short) 3, "Alta", (short) 3, 10)), kpis.porGravedad());
	}

	@Test
	void conteosPorZonaYTipoUsanElRangoResuelto() {
		RangoFechas hoy = new RangoFechas(LocalDate.of(2026, 10, 24), LocalDate.of(2026, 10, 24));
		IncidenciaFiltro filtro = new IncidenciaFiltro(Periodo.HOY, null, null, 1, null, null);
		when(incidenciaDao.contarPorZona(hoy, filtro)).thenReturn(List.of(new ConteoAgrupado(1L, "Sede Miraflores", 4)));
		when(incidenciaDao.contarPorTipo(hoy, filtro)).thenReturn(List.of());

		assertEquals(List.of(new ConteoResponse(1L, "Sede Miraflores", 4)), dashboardService.incidenciasPorZona(filtro));
		assertEquals(List.of(), dashboardService.incidenciasPorTipo(filtro));
	}

	@Test
	void despliegueMapeaLaVista() {
		when(despliegueZonaDao.findAll(any(Sort.class))).thenReturn(List.of(
				new DespliegueZona(2, "Almacén Callao", 0L), new DespliegueZona(1, "Sede Miraflores", 3L)));

		assertEquals(List.of(new DespliegueZonaResponse(2, "Almacén Callao", 0),
				new DespliegueZonaResponse(1, "Sede Miraflores", 3)), dashboardService.despliegue());
	}

	private Agrupacion agrupacionUsada(String desde, String hasta) {
		return dashboardService.incidenciasPorTiempo(personalizado(desde, hasta), null).agrupacion();
	}

	private static IncidenciaFiltro filtro(Periodo periodo) {
		return new IncidenciaFiltro(periodo, null, null, null, null, null);
	}

	private static IncidenciaFiltro personalizado(String desde, String hasta) {
		return new IncidenciaFiltro(Periodo.PERSONALIZADO, LocalDate.parse(desde), LocalDate.parse(hasta), null, null,
				null);
	}

	private static NivelGravedad nivel(int id, String nombre, int orden, boolean activo) {
		NivelGravedad nivel = new NivelGravedad();
		nivel.setIdNivelGravedad((short) id);
		nivel.setNombreNivel(nombre);
		nivel.setOrden((short) orden);
		nivel.setEstadoActivo(activo);
		return nivel;
	}

}
