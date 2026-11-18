package com.segandina.sgi.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;

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
import com.segandina.sgi.dto.request.IncidenciaRequest;
import com.segandina.sgi.dto.response.IncidenciaResponse;
import com.segandina.sgi.dto.response.NivelGravedadResponse;
import com.segandina.sgi.dto.response.TipoEventoResponse;
import com.segandina.sgi.dto.response.ZonaResponse;
import com.segandina.sgi.exception.RecursoNoEncontradoException;
import com.segandina.sgi.exception.ReglaNegocioException;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.IncidenciaService;
import com.segandina.sgi.service.impl.JwtTokenServiceImpl;

/**
 * Pruebas de la corrección de incidencias por su autor ({@code PUT /api/incidencias/{id}}, RF-03) con la seguridad
 * real y el servicio simulado (sin BD).
 */
@WebMvcTest(IncidenciaController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = "jwt.secreto=secreto-de-pruebas-con-mas-de-32-bytes!")
class IncidenciaControllerTest {

	private static final String CUERPO = """
			{"idZona":1,"idTipoEvento":2,"idNivelGravedad":3,"descripcion":"Puerta forzada en el almacén"}""";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtEncoder jwtEncoder;

	@Autowired
	private JwtProperties jwtProperties;

	@MockitoBean
	private IncidenciaService incidenciaService;

	@Test
	void autorCorrigeConElUsuarioDelToken() throws Exception {
		IncidenciaRequest esperado = new IncidenciaRequest(1, (short) 2, (short) 3, "Puerta forzada en el almacén", null);
		when(incidenciaService.corregir(10L, esperado, 7L)).thenReturn(new IncidenciaResponse(10L,
				OffsetDateTime.parse("2026-10-24T09:00:00-05:00"), "Puerta forzada en el almacén",
				new ZonaResponse(1, "Sede Miraflores", null, null, null, null, null, true),
				new TipoEventoResponse((short) 2, "Robo", true), new NivelGravedadResponse((short) 3, "Alta", (short) 3, true),
				7L));

		mockMvc.perform(put("/api/incidencias/10").header("Authorization", bearer("Vigilante", 7L))
				.contentType(MediaType.APPLICATION_JSON).content(CUERPO))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.idIncidencia").value(10))
				.andExpect(jsonPath("$.descripcion").value("Puerta forzada en el almacén"))
				.andExpect(jsonPath("$.tipoEvento.nombreTipoEvento").value("Robo"))
				.andExpect(jsonPath("$.contrasena").doesNotExist());
		verify(incidenciaService).corregir(eq(10L), eq(esperado), eq(7L));
	}

	@Test
	void incidenciaAjenaOInexistenteResponde404() throws Exception {
		when(incidenciaService.corregir(eq(10L), any(), eq(1L)))
				.thenThrow(new RecursoNoEncontradoException(IncidenciaService.INCIDENCIA_NO_EXISTE));

		mockMvc.perform(put("/api/incidencias/10").header("Authorization", bearer("Administrador", 1L))
				.contentType(MediaType.APPLICATION_JSON).content(CUERPO))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.mensaje").value("La incidencia no existe"));
	}

	@Test
	void plazoVencidoResponde400ConElMotivo() throws Exception {
		when(incidenciaService.corregir(eq(10L), any(), eq(7L)))
				.thenThrow(new ReglaNegocioException("El plazo de corrección de 15 minutos terminó"));

		mockMvc.perform(put("/api/incidencias/10").header("Authorization", bearer("Vigilante", 7L))
				.contentType(MediaType.APPLICATION_JSON).content(CUERPO))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.mensaje").value("El plazo de corrección de 15 minutos terminó"));
	}

	@Test
	void cuerpoInvalidoResponde400SinLlamarAlServicio() throws Exception {
		mockMvc.perform(put("/api/incidencias/10").header("Authorization", bearer("Vigilante", 7L))
				.contentType(MediaType.APPLICATION_JSON).content("{\"idZona\":1,\"descripcion\":\" \"}"))
				.andExpect(status().isBadRequest());
		verifyNoInteractions(incidenciaService);
	}

	@Test
	void supervisorNoPuedeCorregir() throws Exception {
		mockMvc.perform(put("/api/incidencias/10").header("Authorization", bearer("Supervisor", 3L))
				.contentType(MediaType.APPLICATION_JSON).content(CUERPO))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.mensaje").value("No tiene permisos para esta operación"));
		verifyNoInteractions(incidenciaService);
	}

	@Test
	void sinTokenResponde401() throws Exception {
		mockMvc.perform(put("/api/incidencias/10").contentType(MediaType.APPLICATION_JSON).content(CUERPO))
				.andExpect(status().isUnauthorized());
		verifyNoInteractions(incidenciaService);
	}

	private String bearer(String nombreRol, Long idUsuario) {
		Rol rol = new Rol();
		rol.setNombreRol(nombreRol);
		Usuario usuario = new Usuario();
		usuario.setIdUsuario(idUsuario);
		usuario.setDni("12345678");
		usuario.setRol(rol);
		return "Bearer " + new JwtTokenServiceImpl(jwtEncoder, jwtProperties).generarToken(usuario).token();
	}

}
