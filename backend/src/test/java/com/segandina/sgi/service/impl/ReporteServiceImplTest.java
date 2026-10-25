package com.segandina.sgi.service.impl;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import com.segandina.sgi.config.RelojConfig;
import com.segandina.sgi.dao.IncidenciaDao;
import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.request.Periodo;
import com.segandina.sgi.dto.response.ArchivoReporte;
import com.segandina.sgi.exception.CredencialesInvalidasException;
import com.segandina.sgi.exception.ReglaNegocioException;
import com.segandina.sgi.export.DatosReporte;
import com.segandina.sgi.export.ExportadorReporte;
import com.segandina.sgi.export.FormatoReporte;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Incidencia;
import com.segandina.sgi.model.NivelGravedad;
import com.segandina.sgi.model.TipoEvento;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.model.Zona;
import com.segandina.sgi.service.AuditoriaService;
import com.segandina.sgi.service.ReporteService;

/**
 * Pruebas unitarias de la exportación de reportes (RF-06) con DAO, auditoría y exportadores simulados y un
 * reloj fijo.
 */
class ReporteServiceImplTest {

	private static final long ID_USUARIO = 3L;
	// 00:30 del 24/10 en Lima (05:30 UTC): el nombre del archivo usa la fecha de Lima
	private static final OffsetDateTime AHORA = OffsetDateTime.parse("2026-10-24T00:30:00-05:00");
	private static final byte[] EXCEL = { 1, 2, 3 };
	private static final byte[] PDF = { 4, 5 };

	private IncidenciaDao incidenciaDao;
	private AuditoriaService auditoriaService;
	private ExportadorReporte excel;
	private ExportadorReporte pdf;
	private ReporteServiceImpl reporteService;
	private Usuario supervisor;

	@BeforeEach
	void preparar() {
		incidenciaDao = mock(IncidenciaDao.class);
		UsuarioDao usuarioDao = mock(UsuarioDao.class);
		auditoriaService = mock(AuditoriaService.class);
		excel = exportador(FormatoReporte.EXCEL, EXCEL);
		pdf = exportador(FormatoReporte.PDF, PDF);
		Clock reloj = Clock.fixed(Instant.from(AHORA), RelojConfig.ZONA_LIMA);
		reporteService = new ReporteServiceImpl(incidenciaDao, usuarioDao, auditoriaService, reloj,
				List.of(excel, pdf));

		supervisor = new Usuario();
		supervisor.setIdUsuario(ID_USUARIO);
		supervisor.setEstadoActivo(true);
		when(usuarioDao.findById(ID_USUARIO)).thenReturn(Optional.of(supervisor));
	}

	@Test
	void excelUsaElExportadorCorrectoYNombraElArchivoConLaFechaDeLima() {
		when(incidenciaDao.findAll(any(Specification.class), eq(IncidenciaDao.ORDEN_HISTORIAL)))
				.thenReturn(List.of(incidencia()));

		ArchivoReporte archivo = reporteService.exportar(FormatoReporte.EXCEL, sinFiltros(), ID_USUARIO);

		assertEquals("incidencias_2026-10-24.xlsx", archivo.nombreArchivo());
		assertEquals(FormatoReporte.EXCEL, archivo.formato());
		assertArrayEquals(EXCEL, archivo.contenido());
		verify(pdf, never()).exportar(any());

		DatosReporte datos = capturarDatos(excel);
		// Sin periodo se usa el de por defecto, y así se informa en el reporte
		assertEquals(Periodo.ULTIMOS_30_DIAS, datos.periodo());
		assertEquals(LocalDate.of(2026, 9, 25), datos.rango().desde());
		assertEquals(LocalDate.of(2026, 10, 24), datos.rango().hasta());
		assertEquals(AHORA, datos.generadoEn());
		assertEquals(1, datos.filas().size());
		assertEquals(50L, datos.filas().get(0).idIncidencia());
	}

	@Test
	void pdfAuditaLosFiltrosUsados() {
		when(incidenciaDao.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());
		IncidenciaFiltro filtro = new IncidenciaFiltro(Periodo.PERSONALIZADO, LocalDate.of(2026, 10, 1),
				LocalDate.of(2026, 10, 15), 2, null, (short) 4);

		ArchivoReporte archivo = reporteService.exportar(FormatoReporte.PDF, filtro, ID_USUARIO);

		assertEquals("incidencias_2026-10-24.pdf", archivo.nombreArchivo());
		assertArrayEquals(PDF, archivo.contenido());
		@SuppressWarnings("unchecked")
		ArgumentCaptor<Map<String, Object>> detalle = ArgumentCaptor.forClass(Map.class);
		verify(auditoriaService).registrar(eq(AccionAuditoria.EXPORTAR_REPORTE), detalle.capture(), eq(null),
				eq(supervisor));
		Map<String, Object> esperado = new LinkedHashMap<>();
		esperado.put("formato", "PDF");
		esperado.put("periodo", "PERSONALIZADO");
		esperado.put("desde", "2026-10-01");
		esperado.put("hasta", "2026-10-15");
		esperado.put("idZona", 2);
		esperado.put("idNivelGravedad", null);
		esperado.put("idTipoEvento", (short) 4);
		esperado.put("totalRegistros", 0);
		assertEquals(esperado, detalle.getValue());
	}

	@Test
	void rangoInvalidoNoGeneraNiAudita() {
		IncidenciaFiltro filtro = new IncidenciaFiltro(Periodo.PERSONALIZADO, LocalDate.of(2026, 10, 10),
				LocalDate.of(2026, 10, 1), null, null, null);

		assertThrows(ReglaNegocioException.class,
				() -> reporteService.exportar(FormatoReporte.EXCEL, filtro, ID_USUARIO));

		verifyNoInteractions(incidenciaDao, auditoriaService);
		verify(excel, never()).exportar(any());
	}

	@Test
	void masDelMaximoDeFilasSeRechaza() {
		when(incidenciaDao.count(any(Specification.class))).thenReturn(ReporteService.MAX_FILAS + 1L);

		ReglaNegocioException ex = assertThrows(ReglaNegocioException.class,
				() -> reporteService.exportar(FormatoReporte.PDF, sinFiltros(), ID_USUARIO));

		assertTrue(ex.getMessage().contains("acote"));
		verify(incidenciaDao, never()).findAll(any(Specification.class), any(Sort.class));
		verifyNoInteractions(auditoriaService);
		verify(pdf, never()).exportar(any());
	}

	@Test
	void usuarioInactivoRecibe401() {
		supervisor.setEstadoActivo(false);

		assertThrows(CredencialesInvalidasException.class,
				() -> reporteService.exportar(FormatoReporte.PDF, sinFiltros(), ID_USUARIO));

		verifyNoInteractions(incidenciaDao, auditoriaService);
	}

	@Test
	void dosExportadoresDelMismoFormatoSonUnError() {
		ExportadorReporte otroExcel = exportador(FormatoReporte.EXCEL, EXCEL);

		assertThrows(IllegalStateException.class, () -> new ReporteServiceImpl(incidenciaDao, mock(UsuarioDao.class),
				auditoriaService, Clock.systemUTC(), List.of(excel, otroExcel)));
	}

	private static IncidenciaFiltro sinFiltros() {
		return new IncidenciaFiltro(null, null, null, null, null, null);
	}

	private static ExportadorReporte exportador(FormatoReporte formato, byte[] contenido) {
		ExportadorReporte exportador = mock(ExportadorReporte.class);
		when(exportador.formato()).thenReturn(formato);
		when(exportador.exportar(any())).thenReturn(contenido);
		return exportador;
	}

	private static DatosReporte capturarDatos(ExportadorReporte exportador) {
		ArgumentCaptor<DatosReporte> datos = ArgumentCaptor.forClass(DatosReporte.class);
		verify(exportador).exportar(datos.capture());
		return datos.getValue();
	}

	private static Incidencia incidencia() {
		Zona zona = new Zona();
		zona.setIdZona(1);
		zona.setNombreZona("Sede Miraflores");
		TipoEvento tipo = new TipoEvento();
		tipo.setIdTipoEvento((short) 1);
		tipo.setNombreTipoEvento("Robo");
		NivelGravedad nivel = new NivelGravedad();
		nivel.setIdNivelGravedad((short) 3);
		nivel.setNombreNivel("Alta");
		Usuario vigilante = new Usuario();
		vigilante.setIdUsuario(9L);
		vigilante.setDni("45678912");
		vigilante.setNombres("José");
		vigilante.setApellidoPaterno("Núñez");

		Incidencia incidencia = new Incidencia();
		incidencia.setIdIncidencia(50L);
		incidencia.setFechaHora(AHORA.minusHours(2));
		incidencia.setDescripcion("Sustracción de celular");
		incidencia.setZona(zona);
		incidencia.setTipoEvento(tipo);
		incidencia.setNivelGravedad(nivel);
		incidencia.setUsuario(vigilante);
		return incidencia;
	}

}
