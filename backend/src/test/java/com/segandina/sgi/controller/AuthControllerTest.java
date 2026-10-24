package com.segandina.sgi.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

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
import com.segandina.sgi.dto.response.LoginResponse;
import com.segandina.sgi.dto.response.UsuarioResumenResponse;
import com.segandina.sgi.exception.CredencialesInvalidasException;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.AuthService;
import com.segandina.sgi.service.impl.JwtTokenServiceImpl;

/**
 * Pruebas del endpoint de login y de la seguridad por roles, con la configuración de seguridad real y
 * el servicio de autenticación simulado (sin BD).
 */
@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = "jwt.secreto=secreto-de-pruebas-con-mas-de-32-bytes!")
class AuthControllerTest {

	private static final String LOGIN = "/api/auth/login";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtEncoder jwtEncoder;

	@Autowired
	private JwtProperties jwtProperties;

	@MockitoBean
	private AuthService authService;

	@Test
	void loginCorrectoResponde200ConTokenYSinContrasena() throws Exception {
		UsuarioResumenResponse resumen = new UsuarioResumenResponse(1L, "12345678", "Ana", "Torres", null,
				"Administrador", null);
		when(authService.login(any())).thenReturn(
				LoginResponse.bearer("token-jwt", Instant.parse("2026-10-24T20:00:00Z"), resumen));

		mockMvc.perform(post(LOGIN).contentType(MediaType.APPLICATION_JSON)
				.content("{\"dni\":\"12345678\",\"contrasena\":\"ClaveSegura1\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token").value("token-jwt"))
				.andExpect(jsonPath("$.tipo").value("Bearer"))
				.andExpect(jsonPath("$.usuario.rol").value("Administrador"))
				.andExpect(jsonPath("$.usuario.contrasena").doesNotExist());
	}

	@Test
	void credencialesInvalidasResponden401ConMensajeGenerico() throws Exception {
		when(authService.login(any())).thenThrow(new CredencialesInvalidasException());

		mockMvc.perform(post(LOGIN).contentType(MediaType.APPLICATION_JSON)
				.content("{\"dni\":\"12345678\",\"contrasena\":\"incorrecta\"}"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.status").value(401))
				.andExpect(jsonPath("$.mensaje").value(CredencialesInvalidasException.MENSAJE));
	}

	@Test
	void dniConFormatoInvalidoSeRechazaSinLlamarAlServicio() throws Exception {
		mockMvc.perform(post(LOGIN).contentType(MediaType.APPLICATION_JSON)
				.content("{\"dni\":\"12AB\",\"contrasena\":\"ClaveSegura1\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.detalles[0]").value("dni: debe tener 8 dígitos"));

		verify(authService, never()).login(any());
	}

	@Test
	void endpointProtegidoSinTokenResponde401() throws Exception {
		mockMvc.perform(get("/api/auth/yo"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.status").value(401));
	}

	@Test
	void tokenAlteradoResponde401() throws Exception {
		mockMvc.perform(get("/api/auth/yo").header("Authorization", "Bearer " + token("Vigilante") + "x"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void tokenValidoPermiteConsultarUsuarioActual() throws Exception {
		when(authService.usuarioActual(5L)).thenReturn(
				new UsuarioResumenResponse(5L, "12345678", "Luis", "Rojas", null, "Vigilante", 2));

		mockMvc.perform(get("/api/auth/yo").header("Authorization", "Bearer " + token("Vigilante")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.idUsuario").value(5))
				.andExpect(jsonPath("$.rol").value("Vigilante"));
	}

	@Test
	void rolInsuficienteResponde403() throws Exception {
		mockMvc.perform(get("/api/auditoria").header("Authorization", "Bearer " + token("Vigilante")))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.status").value(403));
	}

	// Token real firmado con la misma clave que valida la aplicación
	private String token(String nombreRol) {
		Rol rol = new Rol();
		rol.setNombreRol(nombreRol);
		Usuario usuario = new Usuario();
		usuario.setIdUsuario(5L);
		usuario.setDni("12345678");
		usuario.setRol(rol);
		return new JwtTokenServiceImpl(jwtEncoder, jwtProperties).generarToken(usuario).token();
	}

}
