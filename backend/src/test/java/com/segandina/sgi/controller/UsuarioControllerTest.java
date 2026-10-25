package com.segandina.sgi.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import com.segandina.sgi.dto.request.CambioContrasenaRequest;
import com.segandina.sgi.dto.response.UsuarioResponse;
import com.segandina.sgi.exception.DatoDuplicadoException;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.UsuarioService;
import com.segandina.sgi.service.impl.JwtTokenServiceImpl;

/**
 * Pruebas de los endpoints de usuarios (RF-02) con la seguridad real y el servicio simulado (sin BD).
 */
@WebMvcTest(UsuarioController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = "jwt.secreto=secreto-de-pruebas-con-mas-de-32-bytes!")
class UsuarioControllerTest {

	private static final String USUARIOS = "/api/usuarios";
	private static final String CUERPO_ALTA = """
			{"dni":"33333333","nombres":"Luis","apellidoPaterno":"Rojas","contrasena":"ClaveInicial1",
			 "idRol":3,"idZona":1}""";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtEncoder jwtEncoder;

	@Autowired
	private JwtProperties jwtProperties;

	@MockitoBean
	private UsuarioService usuarioService;

	private final UsuarioResponse luis = new UsuarioResponse(50L, "33333333", "Luis", "Rojas", null, (short) 3,
			"Vigilante", 1, "Sede Miraflores", true);

	@Test
	void sinTokenResponde401() throws Exception {
		mockMvc.perform(get(USUARIOS)).andExpect(status().isUnauthorized());
	}

	@Test
	void supervisorYVigilanteReciben403() throws Exception {
		mockMvc.perform(get(USUARIOS).header("Authorization", bearer("Supervisor", 2L)))
				.andExpect(status().isForbidden());
		mockMvc.perform(post(USUARIOS).header("Authorization", bearer("Vigilante", 7L))
				.contentType(MediaType.APPLICATION_JSON).content(CUERPO_ALTA))
				.andExpect(status().isForbidden());
		verifyNoInteractions(usuarioService);
	}

	@Test
	void listadoDevuelvePaginaSinContrasena() throws Exception {
		when(usuarioService.buscar(any(), eq(0), eq(20)))
				.thenReturn(new PageImpl<>(List.of(luis), PageRequest.of(0, 20), 1));

		mockMvc.perform(get(USUARIOS).header("Authorization", bearer("Administrador", 1L)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.contenido[0].dni").value("33333333"))
				.andExpect(jsonPath("$.contenido[0].nombreZona").value("Sede Miraflores"))
				.andExpect(jsonPath("$.contenido[0].contrasena").doesNotExist())
				.andExpect(jsonPath("$.totalElementos").value(1))
				.andExpect(jsonPath("$.pagina").value(0))
				.andExpect(jsonPath("$.tamano").value(20));
	}

	@Test
	void altaResponde201ConElActorDelToken() throws Exception {
		when(usuarioService.crear(any(), eq(1L))).thenReturn(luis);

		mockMvc.perform(post(USUARIOS).header("Authorization", bearer("Administrador", 1L))
				.contentType(MediaType.APPLICATION_JSON).content(CUERPO_ALTA))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.idUsuario").value(50))
				.andExpect(jsonPath("$.contrasena").doesNotExist());
	}

	@Test
	void altaConContrasenaCortaResponde400SinLlamarAlServicio() throws Exception {
		mockMvc.perform(post(USUARIOS).header("Authorization", bearer("Administrador", 1L))
				.contentType(MediaType.APPLICATION_JSON)
				.content(CUERPO_ALTA.replace("ClaveInicial1", "corta")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalles[0]").value("contrasena: debe tener entre 8 y 72 caracteres"));
		verify(usuarioService, never()).crear(any(), any());
	}

	@Test
	void dniDuplicadoResponde409() throws Exception {
		when(usuarioService.crear(any(), any()))
				.thenThrow(new DatoDuplicadoException("Ya existe un usuario con el DNI 33333333"));

		mockMvc.perform(post(USUARIOS).header("Authorization", bearer("Administrador", 1L))
				.contentType(MediaType.APPLICATION_JSON).content(CUERPO_ALTA))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.status").value(409))
				.andExpect(jsonPath("$.mensaje").value("Ya existe un usuario con el DNI 33333333"));
	}

	@Test
	void vigilantePuedeCambiarSuPropiaContrasena() throws Exception {
		mockMvc.perform(patch(USUARIOS + "/me/contrasena").header("Authorization", bearer("Vigilante", 7L))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"contrasenaActual\":\"ClaveVieja1\",\"contrasenaNueva\":\"ClaveNueva1\"}"))
				.andExpect(status().isNoContent());

		verify(usuarioService).cambiarContrasenaPropia(7L, new CambioContrasenaRequest("ClaveVieja1", "ClaveNueva1"));
	}

	@Test
	void nuevaContrasenaCortaResponde400() throws Exception {
		mockMvc.perform(patch(USUARIOS + "/me/contrasena").header("Authorization", bearer("Supervisor", 2L))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"contrasenaActual\":\"ClaveVieja1\",\"contrasenaNueva\":\"1234567\"}"))
				.andExpect(status().isBadRequest());
		verifyNoInteractions(usuarioService);
	}

	@Test
	void cambiarContrasenaPropiaSinTokenResponde401() throws Exception {
		mockMvc.perform(patch(USUARIOS + "/me/contrasena").contentType(MediaType.APPLICATION_JSON)
				.content("{\"contrasenaActual\":\"ClaveVieja1\",\"contrasenaNueva\":\"ClaveNueva1\"}"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void administradorRestableceLaContrasenaDeOtro() throws Exception {
		mockMvc.perform(patch(USUARIOS + "/7/contrasena").header("Authorization", bearer("Administrador", 1L))
				.contentType(MediaType.APPLICATION_JSON).content("{\"contrasenaNueva\":\"Restablecida1\"}"))
				.andExpect(status().isNoContent());

		verify(usuarioService).restablecerContrasena(7L, "Restablecida1", 1L);
	}

	@Test
	void restablecerConContrasenaCortaResponde400() throws Exception {
		mockMvc.perform(patch(USUARIOS + "/7/contrasena").header("Authorization", bearer("Administrador", 1L))
				.contentType(MediaType.APPLICATION_JSON).content("{\"contrasenaNueva\":\"1234567\"}"))
				.andExpect(status().isBadRequest());
		verifyNoInteractions(usuarioService);
	}

	@Test
	void supervisorYVigilanteNoPuedenRestablecerContrasenas() throws Exception {
		for (String rol : new String[] { "Supervisor", "Vigilante" }) {
			mockMvc.perform(patch(USUARIOS + "/7/contrasena").header("Authorization", bearer(rol, 2L))
					.contentType(MediaType.APPLICATION_JSON).content("{\"contrasenaNueva\":\"Restablecida1\"}"))
					.andExpect(status().isForbidden());
		}
		verifyNoInteractions(usuarioService);
	}

	@Test
	void restablecerSinTokenResponde401() throws Exception {
		mockMvc.perform(patch(USUARIOS + "/7/contrasena").contentType(MediaType.APPLICATION_JSON)
				.content("{\"contrasenaNueva\":\"Restablecida1\"}"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void vigilanteNoPuedeCambiarElEstadoDeOtros() throws Exception {
		mockMvc.perform(patch(USUARIOS + "/50/estado").header("Authorization", bearer("Vigilante", 7L))
				.contentType(MediaType.APPLICATION_JSON).content("{\"activo\":false}"))
				.andExpect(status().isForbidden());
	}

	@Test
	void tokenConCambioPendienteSoloPermiteCambiarLaContrasenaPropia() throws Exception {
		String token = bearer("Administrador", 1L, true);

		mockMvc.perform(patch(USUARIOS + "/me/contrasena").header("Authorization", token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"contrasenaActual\":\"ClaveVieja1\",\"contrasenaNueva\":\"ClaveNueva1\"}"))
				.andExpect(status().isNoContent());
		for (String ruta : new String[] { USUARIOS, "/api/catalogos/zonas", "/api/dashboard/kpis" }) {
			mockMvc.perform(get(ruta).header("Authorization", token))
					.andExpect(status().isForbidden())
					.andExpect(jsonPath("$.mensaje").value("Debe cambiar su contraseña antes de continuar"));
		}
		mockMvc.perform(post("/api/incidencias").header("Authorization", token)
				.contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isForbidden());
		verify(usuarioService).cambiarContrasenaPropia(any(), any());
	}

	@Test
	void rolInsuficienteMantieneElMensajeDeSiempre() throws Exception {
		mockMvc.perform(get(USUARIOS).header("Authorization", bearer("Vigilante", 7L)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.mensaje").value("No tiene permisos para esta operación"));
	}

	private String bearer(String nombreRol, long idUsuario) {
		return bearer(nombreRol, idUsuario, false);
	}

	// Token real firmado con la misma clave que valida la aplicación
	private String bearer(String nombreRol, long idUsuario, boolean cambioPendiente) {
		Rol rol = new Rol();
		rol.setNombreRol(nombreRol);
		Usuario usuario = new Usuario();
		usuario.setIdUsuario(idUsuario);
		usuario.setDni("12345678");
		usuario.setRol(rol);
		usuario.setDebeCambiarContrasena(cambioPendiente);
		return "Bearer " + new JwtTokenServiceImpl(jwtEncoder, jwtProperties).generarToken(usuario).token();
	}

}
