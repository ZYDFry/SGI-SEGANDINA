package com.segandina.sgi.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.segandina.sgi.dao.RolDao;
import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.AuditoriaService;

/**
 * Pruebas del seed del Administrador inicial (perfil {@code seed}).
 */
class AdminSeedRunnerTest {

	private static final String DNI = "11223344";
	private static final String CLAVE = "AdminClave2026";

	private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
	private UsuarioDao usuarioDao;
	private RolDao rolDao;
	private AuditoriaService auditoriaService;

	@BeforeEach
	void preparar() {
		usuarioDao = mock(UsuarioDao.class);
		rolDao = mock(RolDao.class);
		auditoriaService = mock(AuditoriaService.class);
	}

	@Test
	void creaAdministradorActivoConHashSiElDniNoExiste() {
		Rol admin = rol("Administrador");
		when(usuarioDao.findByDni(DNI)).thenReturn(Optional.empty());
		when(rolDao.findByNombreRol("Administrador")).thenReturn(Optional.of(admin));

		runner(DNI, CLAVE).run();

		ArgumentCaptor<Usuario> guardado = ArgumentCaptor.forClass(Usuario.class);
		verify(usuarioDao).save(guardado.capture());
		Usuario usuario = guardado.getValue();
		assertEquals(DNI, usuario.getDni());
		assertEquals(admin, usuario.getRol());
		assertTrue(usuario.getEstadoActivo());
		assertEquals("Administrador", usuario.getNombres());
		assertNotEquals(CLAVE, usuario.getContrasena());
		assertTrue(passwordEncoder.matches(CLAVE, usuario.getContrasena()));
		verify(auditoriaService).registrar(AccionAuditoria.CREAR_USUARIO, Map.of("origen", "seed"), null, usuario);
	}

	@Test
	void actualizaSoloLaContrasenaSiElDniExiste() {
		Usuario existente = new Usuario();
		existente.setIdUsuario(1L);
		existente.setDni(DNI);
		existente.setNombres("Ana");
		existente.setContrasena("hash-anterior");
		existente.setRol(rol("Administrador"));
		when(usuarioDao.findByDni(DNI)).thenReturn(Optional.of(existente));

		runner(DNI, CLAVE).run();

		verify(usuarioDao).save(existente);
		assertEquals("Ana", existente.getNombres());
		assertTrue(passwordEncoder.matches(CLAVE, existente.getContrasena()));
		verify(rolDao, never()).findByNombreRol(any());
		verify(auditoriaService).registrar(AccionAuditoria.MODIFICAR_USUARIO,
				Map.of("campo", "contrasena", "origen", "seed"), null, existente);
	}

	@Test
	void fallaSiFaltanVariablesODniInvalido() {
		assertThrows(IllegalStateException.class, () -> runner("", CLAVE).run());
		assertThrows(IllegalStateException.class, () -> runner("1234", CLAVE).run());
		assertThrows(IllegalStateException.class, () -> runner(DNI, "").run());
		assertThrows(IllegalStateException.class, () -> runner(DNI, "corta").run());
		verify(usuarioDao, never()).save(any());
	}

	private AdminSeedRunner runner(String dni, String clave) {
		return new AdminSeedRunner(usuarioDao, rolDao, passwordEncoder, auditoriaService, dni, clave, "", "");
	}

	private static Rol rol(String nombre) {
		Rol rol = new Rol();
		rol.setIdRol((short) 1);
		rol.setNombreRol(nombre);
		return rol;
	}

}
