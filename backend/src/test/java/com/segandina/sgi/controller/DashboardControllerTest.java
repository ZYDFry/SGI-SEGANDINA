package com.segandina.sgi.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.segandina.sgi.config.JwtProperties;
import com.segandina.sgi.config.SecurityConfig;
import com.segandina.sgi.dto.request.Agrupacion;
import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.request.Periodo;
import com.segandina.sgi.dto.request.PeriodoFiltro;
import com.segandina.sgi.dto.response.CargaZonaResponse;
import com.segandina.sgi.dto.response.MiIncidenciaResponse;
import com.segandina.sgi.dto.response.CatalogosFiltroResponse;
import com.segandina.sgi.dto.response.DespliegueZonaResponse;
import com.segandina.sgi.dto.response.KpisResponse;
import com.segandina.sgi.dto.response.SerieTiempoResponse;
import com.segandina.sgi.dto.response.VigilanteZonaResponse;
import com.segandina.sgi.dto.response.ZonaResponse;
import com.segandina.sgi.exception.RecursoNoEncontradoException;
import com.segandina.sgi.exception.ReglaNegocioException;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.CatalogoService;
import com.segandina.sgi.service.DashboardService;
import com.segandina.sgi.service.DespliegueService;
import com.segandina.sgi.service.IncidenciaService;
import com.segandina.sgi.service.impl.JwtTokenServiceImpl;

/**
 * Pruebas de los endpoints del historial (RF-04) y del dashboard (RF-05, RF-07) con la seguridad real y los
 * servicios simulados (sin BD).
 */
@WebMvcTest({ DashboardController.class, DespliegueController.class, IncidenciaController.class,
		CatalogoController.class })
@Import(SecurityConfig.class)
@TestPropertySource(properties = "jwt.secreto=secreto-de-pruebas-con-mas-de-32-bytes!")
class DashboardControllerTest {

	private static final LocalDate HOY = LocalDate.of(2026, 10, 24);

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtEncoder jwtEncoder;

	@Autowired
	private JwtProperties jwtProperties;

	@MockitoBean
	private DashboardService dashboardService;

	@MockitoBean
	private IncidenciaService incidenciaService;

	@MockitoBean
	private DespliegueService despliegueService;

	@MockitoBean
	private CatalogoService catalogoService;

	@Test
	void kpisPasanLosFiltrosAlServicio() throws Exception {
		IncidenciaFiltro filtro = new IncidenciaFiltro(Periodo.HOY, null, null, 1, (short) 3, null);
		when(dashboardService.kpis(filtro)).thenReturn(new KpisResponse(HOY, HOY, 2, 2,
				HOY.minusDays(1), HOY.minusDays(1), 4,
				List.of(new KpisResponse.ConteoGravedad((short) 3, "Alta", (short) 3, 2))));

		mockMvc.perform(get("/api/dashboard/kpis").param("periodo", "HOY").param("idZona", "1")
				.param("idNivelGravedad", "3").header("Authorization", bearer("Supervisor")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.desde").value("2026-10-24"))
				.andExpect(jsonPath("$.incidenciasHoy").value(2))
				.andExpect(jsonPath("$.incidenciasPeriodoAnterior").value(4))
				.andExpect(jsonPath("$.hastaAnterior").value("2026-10-23"))
				.andExpect(jsonPath("$.porGravedad[0].nombreNivel").value("Alta"));
	}

	@Test
	void seriePorTiempoAceptaFechasPersonalizadasYAgrupacion() throws Exception {
		IncidenciaFiltro filtro = new IncidenciaFiltro(Periodo.PERSONALIZADO, LocalDate.of(2026, 10, 1), HOY, null,
				null, null);
		when(dashboardService.incidenciasPorTiempo(filtro, Agrupacion.SEMANA)).thenReturn(new SerieTiempoResponse(
				Agrupacion.SEMANA, filtro.desde(), HOY,
				List.of(new SerieTiempoResponse.Punto(filtro.desde(), LocalDate.of(2026, 10, 4), 0))));

		mockMvc.perform(get("/api/dashboard/incidencias-por-tiempo").param("periodo", "PERSONALIZADO")
				.param("desde", "2026-10-01").param("hasta", "2026-10-24").param("agrupacion", "SEMANA")
				.header("Authorization", bearer("Administrador")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.agrupacion").value("SEMANA"))
				.andExpect(jsonPath("$.puntos[0].fin").value("2026-10-04"))
				.andExpect(jsonPath("$.puntos[0].total").value(0));
	}

	@Test
	void despliegueResponde200() throws Exception {
		when(dashboardService.despliegue()).thenReturn(List.of(new DespliegueZonaResponse(1, "Sede Miraflores", 3)));

		mockMvc.perform(get("/api/dashboard/despliegue").header("Authorization", bearer("Supervisor")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].vigilantesActivos").value(3));
	}

	@Test
	void historialPasaFiltrosYPaginacion() throws Exception {
		IncidenciaFiltro filtro = new IncidenciaFiltro(Periodo.MES_ACTUAL, null, null, null, null, (short) 1);
		when(incidenciaService.buscar(filtro, 1, 10)).thenReturn(new PageImpl<>(List.of(), PageRequest.of(1, 10), 10));

		mockMvc.perform(get("/api/incidencias").param("periodo", "MES_ACTUAL").param("idTipoEvento", "1")
				.param("page", "1").param("size", "10").header("Authorization", bearer("Supervisor")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.pagina").value(1))
				.andExpect(jsonPath("$.totalElementos").value(10));
		verify(incidenciaService).buscar(eq(filtro), eq(1), eq(10));
	}

	@Test
	void vigilanteNoVeDashboardNiHistorial() throws Exception {
		mockMvc.perform(get("/api/dashboard/kpis").header("Authorization", bearer("Vigilante")))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/incidencias").header("Authorization", bearer("Vigilante")))
				.andExpect(status().isForbidden());
		verifyNoInteractions(dashboardService, incidenciaService);
	}

	@Test
	void misIncidenciasUsaElUsuarioDelTokenYElPeriodo() throws Exception {
		PeriodoFiltro filtro = new PeriodoFiltro(Periodo.ULTIMOS_7_DIAS, null, null);
		MiIncidenciaResponse fila = new MiIncidenciaResponse(5L, null, null, "Puerta forzada", null, null, null, null);
		when(incidenciaService.buscarPropias(filtro, 1L, 0, 20))
				.thenReturn(new PageImpl<>(List.of(fila), PageRequest.of(0, 20), 1));

		mockMvc.perform(get("/api/incidencias/mias").param("periodo", "ULTIMOS_7_DIAS")
				.header("Authorization", bearer("Vigilante")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.contenido[0].idIncidencia").value(5))
				.andExpect(jsonPath("$.contenido[0].editableHasta").isEmpty())
				.andExpect(jsonPath("$.contenido[0].usuario").doesNotExist())
				.andExpect(jsonPath("$.totalElementos").value(1));
		verify(incidenciaService).buscarPropias(eq(filtro), eq(1L), eq(0), eq(20));
	}

	@Test
	void administradorTambienVeSusIncidencias() throws Exception {
		when(incidenciaService.buscarPropias(any(), eq(1L), eq(2), eq(5)))
				.thenReturn(new PageImpl<>(List.of(), PageRequest.of(2, 5), 0));

		mockMvc.perform(get("/api/incidencias/mias").param("page", "2").param("size", "5")
				.header("Authorization", bearer("Administrador")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.pagina").value(2));
	}

	@Test
	void supervisorNoTieneMisIncidencias() throws Exception {
		mockMvc.perform(get("/api/incidencias/mias").header("Authorization", bearer("Supervisor")))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.mensaje").value("No tiene permisos para esta operación"));
		verifyNoInteractions(incidenciaService);
	}

	@Test
	void misIncidenciasSinTokenResponde401() throws Exception {
		mockMvc.perform(get("/api/incidencias/mias")).andExpect(status().isUnauthorized());
	}

	@Test
	void misIncidenciasConPeriodoDesconocidoResponde400() throws Exception {
		mockMvc.perform(get("/api/incidencias/mias").param("periodo", "AYER")
				.header("Authorization", bearer("Vigilante")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalles[0]").value("periodo: valor no válido 'AYER'"));
		verifyNoInteractions(incidenciaService);
	}

	@Test
	void sinTokenResponde401() throws Exception {
		mockMvc.perform(get("/api/dashboard/despliegue")).andExpect(status().isUnauthorized());
	}

	@Test
	void periodoDesconocidoResponde400() throws Exception {
		mockMvc.perform(get("/api/dashboard/incidencias-por-zona").param("periodo", "AYER")
				.header("Authorization", bearer("Supervisor")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalles[0]").value("periodo: valor no válido 'AYER'"));
		verifyNoInteractions(dashboardService);
	}

	@Test
	void fechaMalFormadaResponde400() throws Exception {
		mockMvc.perform(get("/api/incidencias").param("periodo", "PERSONALIZADO").param("desde", "24-10-2026")
				.param("hasta", "2026-10-24").header("Authorization", bearer("Administrador")))
				.andExpect(status().isBadRequest());
		verifyNoInteractions(incidenciaService);
	}

	@Test
	void agrupacionDesconocidaResponde400() throws Exception {
		mockMvc.perform(get("/api/dashboard/incidencias-por-tiempo").param("agrupacion", "ANIO")
				.header("Authorization", bearer("Supervisor")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalles[0]").value("agrupacion: valor no válido 'ANIO'"));
	}

	@Test
	void rangoInvertidoResponde400ConElMotivo() throws Exception {
		when(dashboardService.incidenciasPorTipo(any()))
				.thenThrow(new ReglaNegocioException("La fecha desde no puede ser posterior a hasta"));

		mockMvc.perform(get("/api/dashboard/incidencias-por-tipo").param("periodo", "PERSONALIZADO")
				.param("desde", "2026-10-10").param("hasta", "2026-10-01")
				.header("Authorization", bearer("Supervisor")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.mensaje").value("La fecha desde no puede ser posterior a hasta"));
	}

	@Test
	void cargaPorZonaPasaLosFiltrosYDevuelveLaRelacion() throws Exception {
		IncidenciaFiltro filtro = new IncidenciaFiltro(Periodo.ULTIMOS_7_DIAS, null, null, null, null, (short) 2);
		when(dashboardService.cargaPorZona(filtro)).thenReturn(List.of(
				CargaZonaResponse.de(2, "Almacén Callao", 5, 0), CargaZonaResponse.de(1, "Sede Miraflores", 7, 2)));

		mockMvc.perform(get("/api/dashboard/carga-por-zona").param("periodo", "ULTIMOS_7_DIAS")
				.param("idTipoEvento", "2").header("Authorization", bearer("Supervisor")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].incidenciasPorVigilante").isEmpty())
				.andExpect(jsonPath("$[1].vigilantesActivos").value(2))
				.andExpect(jsonPath("$[1].incidenciasPorVigilante").value(3.5));
	}

	@Test
	void vigilanteNoVeLaCargaNiLosVigilantesNiLosFiltros() throws Exception {
		mockMvc.perform(get("/api/dashboard/carga-por-zona").header("Authorization", bearer("Vigilante")))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/dashboard/vigilantes").header("Authorization", bearer("Vigilante")))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/dashboard/zonas/1").header("Authorization", bearer("Vigilante")))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/catalogos/filtros").header("Authorization", bearer("Vigilante")))
				.andExpect(status().isForbidden());
		verifyNoInteractions(dashboardService, despliegueService, catalogoService);
	}

	@Test
	void supervisorVeLaZonaYSusVigilantesSinDni() throws Exception {
		when(despliegueService.obtenerZona(1)).thenReturn(new ZonaResponse(1, "Sede Miraflores", "Lima", "Lima",
				"Miraflores", null, null, true));
		when(despliegueService.listarVigilantes(1, null)).thenReturn(List.of(
				new VigilanteZonaResponse(50L, "Luis", "Rojas", null, 1, "Sede Miraflores", true)));

		mockMvc.perform(get("/api/dashboard/zonas/1").header("Authorization", bearer("Supervisor")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.distrito").value("Miraflores"));
		mockMvc.perform(get("/api/dashboard/vigilantes").param("idZona", "1")
				.header("Authorization", bearer("Supervisor")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].nombres").value("Luis"))
				.andExpect(jsonPath("$[0].dni").doesNotExist())
				.andExpect(jsonPath("$[0].contrasena").doesNotExist());
	}

	@Test
	void zonaInexistenteResponde404() throws Exception {
		when(despliegueService.obtenerZona(999)).thenThrow(new RecursoNoEncontradoException("La zona no existe"));

		mockMvc.perform(get("/api/dashboard/zonas/999").header("Authorization", bearer("Administrador")))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.mensaje").value("La zona no existe"));
	}

	@Test
	void catalogosDeFiltrosIncluyenInactivosParaElSupervisor() throws Exception {
		when(catalogoService.listarParaFiltros()).thenReturn(new CatalogosFiltroResponse(
				List.of(new ZonaResponse(3, "Zona Antigua", "Lima", "Lima", "Ate", null, null, false)), List.of(),
				List.of()));

		mockMvc.perform(get("/api/catalogos/filtros").header("Authorization", bearer("Supervisor")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.zonas[0].estadoActivo").value(false));
	}

	private String bearer(String nombreRol) {
		Rol rol = new Rol();
		rol.setNombreRol(nombreRol);
		Usuario usuario = new Usuario();
		usuario.setIdUsuario(1L);
		usuario.setDni("12345678");
		usuario.setRol(rol);
		return "Bearer " + new JwtTokenServiceImpl(jwtEncoder, jwtProperties).generarToken(usuario).token();
	}

}
