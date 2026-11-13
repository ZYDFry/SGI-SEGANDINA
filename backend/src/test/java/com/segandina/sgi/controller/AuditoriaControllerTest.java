package com.segandina.sgi.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

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
import com.segandina.sgi.dto.request.AuditoriaFiltro;
import com.segandina.sgi.dto.request.Periodo;
import com.segandina.sgi.dto.response.AccionAuditoriaResponse;
import com.segandina.sgi.dto.response.AuditoriaResponse;
import com.segandina.sgi.dto.response.IncidenciaHistorialResponse.Registrador;
import com.segandina.sgi.exception.ParametroInvalidoException;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.AuditoriaService;
import com.segandina.sgi.service.impl.JwtTokenServiceImpl;

/**
 * Pruebas de la consulta de auditoría (RF-08) con la seguridad real y el servicio simulado (sin BD).
 */
@WebMvcTest(AuditoriaController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = "jwt.secreto=secreto-de-pruebas-con-mas-de-32-bytes!")
class AuditoriaControllerTest {

	private static final String RUTA = "/api/auditoria";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtEncoder jwtEncoder;

	@Autowired
	private JwtProperties jwtProperties;

	@MockitoBean
	private AuditoriaService auditoriaService;

	@Test
	void administradorConsultaConFiltrosYPaginacion() throws Exception {
		AuditoriaFiltro filtro = new AuditoriaFiltro(Periodo.HOY, null, null, AccionAuditoria.LOGIN_FALLIDO, 5L,
				"2222");
		AuditoriaResponse fila = new AuditoriaResponse(10L, OffsetDateTime.parse("2026-10-24T09:00:00-05:00"),
				"LOGIN_FALLIDO", "Inicio de sesión fallido", new Registrador(5L, "22222222", "Luis Rojas"),
				"22222222", Map.of("motivo", "CONTRASENA_INCORRECTA"));
		when(auditoriaService.buscar(filtro, 1, 10))
				.thenReturn(new PageImpl<>(List.of(fila), PageRequest.of(1, 10), 11));

		mockMvc.perform(get(RUTA).param("periodo", "HOY").param("accion", "LOGIN_FALLIDO").param("idUsuario", "5")
				.param("q", "2222").param("page", "1").param("size", "10")
				.header("Authorization", bearer("Administrador", false)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.pagina").value(1))
				.andExpect(jsonPath("$.tamano").value(10))
				.andExpect(jsonPath("$.totalElementos").value(11))
				.andExpect(jsonPath("$.totalPaginas").value(2))
				.andExpect(jsonPath("$.contenido[0].idAuditoria").value(10))
				.andExpect(jsonPath("$.contenido[0].fechaHora").value("2026-10-24T09:00:00-05:00"))
				.andExpect(jsonPath("$.contenido[0].accion").value("LOGIN_FALLIDO"))
				.andExpect(jsonPath("$.contenido[0].accionEtiqueta").value("Inicio de sesión fallido"))
				.andExpect(jsonPath("$.contenido[0].usuario.nombreCompleto").value("Luis Rojas"))
				.andExpect(jsonPath("$.contenido[0].usuario.contrasena").doesNotExist())
				.andExpect(jsonPath("$.contenido[0].detalle.motivo").value("CONTRASENA_INCORRECTA"));
		verify(auditoriaService).buscar(filtro, 1, 10);
	}

	@Test
	void sinParametrosUsaPagina0Tamano20() throws Exception {
		when(auditoriaService.buscar(any(), anyInt(), anyInt()))
				.thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

		mockMvc.perform(get(RUTA).header("Authorization", bearer("Administrador", false)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.tamano").value(20));
		verify(auditoriaService).buscar(new AuditoriaFiltro(null, null, null, null, null, null), 0, 20);
	}

	@Test
	void parametrosVaciosNoFiltran() throws Exception {
		when(auditoriaService.buscar(any(), anyInt(), anyInt()))
				.thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

		mockMvc.perform(get(RUTA).param("accion", "").param("q", "").param("idUsuario", "")
				.header("Authorization", bearer("Administrador", false)))
				.andExpect(status().isOk());
		verify(auditoriaService).buscar(new AuditoriaFiltro(null, null, null, null, null, ""), 0, 20);
	}

	@Test
	void accionesResponde200() throws Exception {
		when(auditoriaService.acciones()).thenReturn(List.of(AccionAuditoriaResponse.desde(AccionAuditoria.LOGIN_OK)));

		mockMvc.perform(get(RUTA + "/acciones").header("Authorization", bearer("Administrador", false)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].valor").value("LOGIN_OK"))
				.andExpect(jsonPath("$[0].etiqueta").value("Inicio de sesión correcto"));
	}

	@Test
	void supervisorYVigilanteReciben403() throws Exception {
		for (String rol : List.of("Supervisor", "Vigilante")) {
			mockMvc.perform(get(RUTA).header("Authorization", bearer(rol, false))).andExpect(status().isForbidden());
			mockMvc.perform(get(RUTA + "/acciones").header("Authorization", bearer(rol, false)))
					.andExpect(status().isForbidden());
		}
		verifyNoInteractions(auditoriaService);
	}

	@Test
	void administradorConCambioDeContrasenaPendienteRecibe403() throws Exception {
		mockMvc.perform(get(RUTA).header("Authorization", bearer("Administrador", true)))
				.andExpect(status().isForbidden());
		verifyNoInteractions(auditoriaService);
	}

	@Test
	void sinTokenResponde401() throws Exception {
		mockMvc.perform(get(RUTA)).andExpect(status().isUnauthorized());
		mockMvc.perform(get(RUTA + "/acciones")).andExpect(status().isUnauthorized());
	}

	@Test
	void sizeMayorA100Responde400() throws Exception {
		mockMvc.perform(get(RUTA).param("size", "101").header("Authorization", bearer("Administrador", false)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalles[0]").value("size: debe estar entre 1 y 100"));
		verifyNoInteractions(auditoriaService);
	}

	@Test
	void accionDesconocidaResponde400() throws Exception {
		mockMvc.perform(get(RUTA).param("accion", "BORRAR").header("Authorization", bearer("Administrador", false)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalles[0]").value("accion: valor no válido 'BORRAR'"));
		verifyNoInteractions(auditoriaService);
	}

	@Test
	void qConLetrasResponde400() throws Exception {
		mockMvc.perform(get(RUTA).param("q", "12ab").header("Authorization", bearer("Administrador", false)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalles[0]").value("q: debe tener solo dígitos, hasta 8"));
		verifyNoInteractions(auditoriaService);
	}

	@Test
	void rangoInvertidoResponde400ConElCampo() throws Exception {
		when(auditoriaService.buscar(any(), anyInt(), anyInt())).thenThrow(
				new ParametroInvalidoException("desde", "La fecha desde no puede ser posterior a hasta"));

		mockMvc.perform(get(RUTA).param("periodo", "PERSONALIZADO").param("desde", "2026-10-10")
				.param("hasta", "2026-10-01").header("Authorization", bearer("Administrador", false)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.mensaje").value("La fecha desde no puede ser posterior a hasta"))
				.andExpect(jsonPath("$.detalles[0]").value("desde: La fecha desde no puede ser posterior a hasta"));
	}

	@Test
	void periodoDesconocidoResponde400() throws Exception {
		mockMvc.perform(get(RUTA).param("periodo", "AYER").header("Authorization", bearer("Administrador", false)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalles[0]").value("periodo: valor no válido 'AYER'"));
	}

	private String bearer(String nombreRol, boolean cambioPendiente) {
		Rol rol = new Rol();
		rol.setNombreRol(nombreRol);
		Usuario usuario = new Usuario();
		usuario.setIdUsuario(1L);
		usuario.setDni("12345678");
		usuario.setRol(rol);
		usuario.setDebeCambiarContrasena(cambioPendiente);
		return "Bearer " + new JwtTokenServiceImpl(jwtEncoder, jwtProperties).generarToken(usuario).token();
	}

}
