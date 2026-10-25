package com.segandina.sgi.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.segandina.sgi.config.JwtProperties;
import com.segandina.sgi.config.SecurityConfig;
import com.segandina.sgi.dto.request.ZonaFiltro;
import com.segandina.sgi.dto.response.ZonaResponse;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.NivelGravedadService;
import com.segandina.sgi.service.TipoEventoService;
import com.segandina.sgi.service.ZonaService;
import com.segandina.sgi.service.impl.JwtTokenServiceImpl;

/**
 * Pruebas de los endpoints de administración de catálogos (RF-09) con la seguridad real y los servicios
 * simulados (sin BD).
 */
@WebMvcTest({ ZonaController.class, TipoEventoController.class, NivelGravedadController.class })
@Import(SecurityConfig.class)
@TestPropertySource(properties = "jwt.secreto=secreto-de-pruebas-con-mas-de-32-bytes!")
class ZonaControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtEncoder jwtEncoder;

	@Autowired
	private JwtProperties jwtProperties;

	@MockitoBean
	private ZonaService zonaService;

	@MockitoBean
	private TipoEventoService tipoEventoService;

	@MockitoBean
	private NivelGravedadService nivelGravedadService;

	@Test
	void listadoPasaLosFiltrosYRespondeConElFormatoDeRf09() throws Exception {
		ZonaResponse miraflores = new ZonaResponse(1, "Sede Miraflores", "Lima", "Lima", "Miraflores",
				"Av. Larco 345", "Edificio corporativo", true);
		when(zonaService.buscar(eq(new ZonaFiltro("sede", null, null, "miraflores", true, null)), eq(0), eq(5)))
				.thenReturn(new PageImpl<>(List.of(miraflores), PageRequest.of(0, 5), 1));

		mockMvc.perform(get("/api/zonas").param("nombre", "sede").param("distrito", "miraflores")
				.param("activo", "true").param("size", "5").header("Authorization", bearer("Administrador")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.contenido[0].idZona").value(1))
				.andExpect(jsonPath("$.contenido[0].referencia").value("Av. Larco 345"))
				.andExpect(jsonPath("$.contenido[0].estadoActivo").value(true))
				.andExpect(jsonPath("$.pagina").value(0))
				.andExpect(jsonPath("$.tamano").value(5))
				.andExpect(jsonPath("$.totalElementos").value(1))
				.andExpect(jsonPath("$.totalPaginas").value(1));
	}

	@Test
	void sinTokenResponde401() throws Exception {
		mockMvc.perform(get("/api/zonas")).andExpect(status().isUnauthorized());
	}

	@Test
	void supervisorYVigilanteReciben403EnTodosLosCatalogos() throws Exception {
		for (String rol : List.of("Supervisor", "Vigilante")) {
			mockMvc.perform(get("/api/zonas").header("Authorization", bearer(rol))).andExpect(status().isForbidden());
			mockMvc.perform(get("/api/tipos-evento").header("Authorization", bearer(rol)))
					.andExpect(status().isForbidden());
			mockMvc.perform(put("/api/niveles-gravedad/1").header("Authorization", bearer(rol))
					.contentType(MediaType.APPLICATION_JSON).content("{\"nombreNivel\":\"Baja\",\"orden\":2}"))
					.andExpect(status().isForbidden());
		}
		verifyNoInteractions(zonaService, tipoEventoService, nivelGravedadService);
	}

	@Test
	void ordenMenorAUnoResponde400() throws Exception {
		mockMvc.perform(put("/api/niveles-gravedad/1").header("Authorization", bearer("Administrador"))
				.contentType(MediaType.APPLICATION_JSON).content("{\"nombreNivel\":\"Baja\",\"orden\":0}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalles[0]").value("orden: debe ser mayor o igual a 1"));
		verifyNoInteractions(nivelGravedadService);
	}

	// Token real firmado con la misma clave que valida la aplicación
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
