package com.segandina.sgi.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.segandina.sgi.controller.AuthController;
import com.segandina.sgi.service.AuthService;

/**
 * Pruebas de CORS con la configuración de seguridad real: el preflight del navegador solo pasa para los orígenes
 * configurados.
 */
@WebMvcTest(AuthController.class)
@Import({ SecurityConfig.class, CorsConfig.class })
@TestPropertySource(properties = {
		"jwt.secreto=secreto-de-pruebas-con-mas-de-32-bytes!",
		"cors.origenes-permitidos=http://localhost:3000, https://sgi.example.com" })
class CorsConfigTest {

	private static final String LOGIN = "/api/auth/login";

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private AuthService authService;

	@Test
	void preflightDesdeOrigenPermitidoResponde200ConCabecerasCors() throws Exception {
		mockMvc.perform(options(LOGIN)
				.header(HttpHeaders.ORIGIN, "https://sgi.example.com")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Content-Type"))
				.andExpect(status().isOk())
				.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "https://sgi.example.com"));
	}

	@Test
	void preflightConAuthorizationEsPermitido() throws Exception {
		mockMvc.perform(options("/api/incidencias")
				.header(HttpHeaders.ORIGIN, "http://localhost:3000")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization, Content-Type"))
				.andExpect(status().isOk())
				.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:3000"));
	}

	@Test
	void preflightDesdeOrigenNoPermitidoResponde403() throws Exception {
		mockMvc.perform(options(LOGIN)
				.header(HttpHeaders.ORIGIN, "https://sitio-ajeno.com")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
				.andExpect(status().isForbidden())
				.andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
	}

}
