package com.segandina.sgi.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.segandina.sgi.config.JwtProperties;
import com.segandina.sgi.config.SecurityConfig;
import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.request.Periodo;
import com.segandina.sgi.dto.response.ArchivoReporte;
import com.segandina.sgi.exception.ReglaNegocioException;
import com.segandina.sgi.export.FormatoReporte;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.ReporteService;
import com.segandina.sgi.service.impl.JwtTokenServiceImpl;

/**
 * Pruebas de los endpoints de reportes (RF-06) con la seguridad real y el servicio simulado (sin BD).
 */
@WebMvcTest(ReporteController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = "jwt.secreto=secreto-de-pruebas-con-mas-de-32-bytes!")
class ReporteControllerTest {

	private static final long ID_USUARIO = 5L;

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtEncoder jwtEncoder;

	@Autowired
	private JwtProperties jwtProperties;

	@MockitoBean
	private ReporteService reporteService;

	@Test
	void excelSeDescargaComoAdjuntoConLosFiltros() throws Exception {
		IncidenciaFiltro filtro = new IncidenciaFiltro(Periodo.PERSONALIZADO, LocalDate.of(2026, 10, 1),
				LocalDate.of(2026, 10, 24), 1, (short) 2, null);
		when(reporteService.exportar(FormatoReporte.EXCEL, filtro, ID_USUARIO)).thenReturn(
				new ArchivoReporte("incidencias_2026-10-24.xlsx", FormatoReporte.EXCEL, new byte[] { 1, 2, 3 }));

		mockMvc.perform(get("/api/reportes/excel").param("periodo", "PERSONALIZADO").param("desde", "2026-10-01")
				.param("hasta", "2026-10-24").param("idZona", "1").param("idNivelGravedad", "2")
				.header("Authorization", bearer("Supervisor")))
				.andExpect(status().isOk())
				.andExpect(content().contentType(FormatoReporte.EXCEL.tipoContenido()))
				.andExpect(header().string("Content-Disposition",
						"attachment; filename=\"incidencias_2026-10-24.xlsx\""))
				.andExpect(content().bytes(new byte[] { 1, 2, 3 }));
		verify(reporteService).exportar(FormatoReporte.EXCEL, filtro, ID_USUARIO);
	}

	@Test
	void pdfSeDescargaComoAdjunto() throws Exception {
		when(reporteService.exportar(any(), any(), any())).thenReturn(
				new ArchivoReporte("incidencias_2026-10-24.pdf", FormatoReporte.PDF, new byte[] { 9 }));

		mockMvc.perform(get("/api/reportes/pdf").param("periodo", "HOY")
				.header("Authorization", bearer("Administrador")))
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.APPLICATION_PDF))
				.andExpect(header().string("Content-Disposition",
						"attachment; filename=\"incidencias_2026-10-24.pdf\""));
		verify(reporteService).exportar(FormatoReporte.PDF,
				new IncidenciaFiltro(Periodo.HOY, null, null, null, null, null), ID_USUARIO);
	}

	@Test
	void vigilanteRecibe403() throws Exception {
		mockMvc.perform(get("/api/reportes/excel").header("Authorization", bearer("Vigilante")))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/reportes/pdf").header("Authorization", bearer("Vigilante")))
				.andExpect(status().isForbidden());
		verifyNoInteractions(reporteService);
	}

	@Test
	void sinTokenResponde401() throws Exception {
		mockMvc.perform(get("/api/reportes/pdf")).andExpect(status().isUnauthorized());
	}

	@Test
	void periodoDesconocidoResponde400() throws Exception {
		mockMvc.perform(get("/api/reportes/excel").param("periodo", "AYER")
				.header("Authorization", bearer("Supervisor")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalles[0]").value("periodo: valor no válido 'AYER'"));
		verifyNoInteractions(reporteService);
	}

	@Test
	void reglaIncumplidaRespondeJson400() throws Exception {
		when(reporteService.exportar(any(), any(), any()))
				.thenThrow(new ReglaNegocioException("La fecha desde no puede ser posterior a hasta"));

		mockMvc.perform(get("/api/reportes/pdf").param("periodo", "PERSONALIZADO").param("desde", "2026-10-10")
				.param("hasta", "2026-10-01").header("Authorization", bearer("Supervisor")))
				.andExpect(status().isBadRequest())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$.mensaje").value("La fecha desde no puede ser posterior a hasta"));
	}

	private String bearer(String nombreRol) {
		Rol rol = new Rol();
		rol.setNombreRol(nombreRol);
		Usuario usuario = new Usuario();
		usuario.setIdUsuario(ID_USUARIO);
		usuario.setDni("12345678");
		usuario.setRol(rol);
		return "Bearer " + new JwtTokenServiceImpl(jwtEncoder, jwtProperties).generarToken(usuario).token();
	}

}
