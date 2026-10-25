package com.segandina.sgi.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.dto.request.LoginRequest;
import com.segandina.sgi.dto.response.LoginResponse;
import com.segandina.sgi.exception.CredencialesInvalidasException;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.AuditoriaService;
import com.segandina.sgi.service.TokenService;

/**
 * Pruebas unitarias del login (RF-01) con DAO, token y auditoría simulados y BCrypt real.
 */
class AuthServiceImplTest {

	private static final String DNI = "12345678";
	private static final String CLAVE = "ClaveSegura1";

	// Costo 4 (mínimo) para que los tests sean rápidos
	private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);

	private UsuarioDao usuarioDao;
	private TokenService tokenService;
	private AuditoriaService auditoriaService;
	private AuthServiceImpl authService;

	@BeforeEach
	void preparar() {
		usuarioDao = mock(UsuarioDao.class);
		tokenService = mock(TokenService.class);
		auditoriaService = mock(AuditoriaService.class);
		authService = new AuthServiceImpl(usuarioDao, passwordEncoder, tokenService, auditoriaService);
	}

	@Test
	void loginCorrectoDevuelveTokenYRegistraLoginOk() {
		Usuario usuario = usuario(true);
		Instant expira = Instant.parse("2026-10-24T20:00:00Z");
		when(usuarioDao.findByDni(DNI)).thenReturn(Optional.of(usuario));
		when(tokenService.generarToken(usuario)).thenReturn(new TokenService.TokenEmitido("token-jwt", expira));

		LoginResponse respuesta = authService.login(new LoginRequest(DNI, CLAVE));

		assertEquals("token-jwt", respuesta.token());
		assertEquals("Bearer", respuesta.tipo());
		assertEquals(expira, respuesta.expiraEn());
		assertEquals(7L, respuesta.usuario().idUsuario());
		assertEquals("Vigilante", respuesta.usuario().rol());
		assertFalse(respuesta.usuario().debeCambiarContrasena());
		verify(auditoriaService).registrar(AccionAuditoria.LOGIN_OK, null, null, usuario);
		verify(auditoriaService, never()).registrarLoginFallido(anyString(), any(), anyString());
	}

	@Test
	void loginConContrasenaTemporalLoIndicaYLoAudita() {
		Usuario usuario = usuario(true);
		usuario.setDebeCambiarContrasena(true);
		when(usuarioDao.findByDni(DNI)).thenReturn(Optional.of(usuario));
		when(tokenService.generarToken(usuario))
				.thenReturn(new TokenService.TokenEmitido("token-jwt", Instant.parse("2026-10-24T20:00:00Z")));

		LoginResponse respuesta = authService.login(new LoginRequest(DNI, CLAVE));

		assertTrue(respuesta.usuario().debeCambiarContrasena());
		verify(auditoriaService).registrar(AccionAuditoria.LOGIN_OK, Map.of("cambioPendiente", true), null, usuario);
	}

	@Test
	void dniInexistenteFallaConMensajeGenericoYAuditaSinUsuario() {
		when(usuarioDao.findByDni(DNI)).thenReturn(Optional.empty());

		CredencialesInvalidasException ex = assertThrows(CredencialesInvalidasException.class,
				() -> authService.login(new LoginRequest(DNI, CLAVE)));

		assertEquals(CredencialesInvalidasException.MENSAJE, ex.getMessage());
		verify(auditoriaService).registrarLoginFallido(eq(DNI), isNull(),
				eq(AuthServiceImpl.MOTIVO_DNI_NO_REGISTRADO));
		verify(tokenService, never()).generarToken(any());
	}

	@Test
	void contrasenaIncorrectaFallaConElMismoMensajeYAuditaConUsuario() {
		Usuario usuario = usuario(true);
		when(usuarioDao.findByDni(DNI)).thenReturn(Optional.of(usuario));

		CredencialesInvalidasException ex = assertThrows(CredencialesInvalidasException.class,
				() -> authService.login(new LoginRequest(DNI, "otraClave99")));

		assertEquals(CredencialesInvalidasException.MENSAJE, ex.getMessage());
		verify(auditoriaService).registrarLoginFallido(DNI, usuario, AuthServiceImpl.MOTIVO_CONTRASENA_INCORRECTA);
		verify(tokenService, never()).generarToken(any());
	}

	@Test
	void usuarioInactivoNoPuedeEntrar() {
		Usuario usuario = usuario(false);
		when(usuarioDao.findByDni(DNI)).thenReturn(Optional.of(usuario));

		CredencialesInvalidasException ex = assertThrows(CredencialesInvalidasException.class,
				() -> authService.login(new LoginRequest(DNI, CLAVE)));

		assertEquals(CredencialesInvalidasException.MENSAJE, ex.getMessage());
		verify(auditoriaService).registrarLoginFallido(DNI, usuario, AuthServiceImpl.MOTIVO_USUARIO_INACTIVO);
		verify(auditoriaService, never()).registrar(eq(AccionAuditoria.LOGIN_OK), any(), any(), any());
	}

	@Test
	void usuarioActualDesactivadoSeRechaza() {
		when(usuarioDao.findById(7L)).thenReturn(Optional.of(usuario(false)));

		assertThrows(CredencialesInvalidasException.class, () -> authService.usuarioActual(7L));
	}

	private Usuario usuario(boolean activo) {
		Rol rol = new Rol();
		rol.setIdRol((short) 3);
		rol.setNombreRol("Vigilante");
		Usuario usuario = new Usuario();
		usuario.setIdUsuario(7L);
		usuario.setDni(DNI);
		usuario.setNombres("Juan");
		usuario.setApellidoPaterno("Pérez");
		usuario.setContrasena(passwordEncoder.encode(CLAVE));
		usuario.setEstadoActivo(activo);
		usuario.setRol(rol);
		return usuario;
	}

}
