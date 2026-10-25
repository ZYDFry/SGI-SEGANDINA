package com.segandina.sgi.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
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
import com.segandina.sgi.dao.ZonaDao;
import com.segandina.sgi.dto.request.CambioContrasenaRequest;
import com.segandina.sgi.dto.request.UsuarioActualizarRequest;
import com.segandina.sgi.dto.request.UsuarioCrearRequest;
import com.segandina.sgi.dto.response.UsuarioResponse;
import com.segandina.sgi.exception.CredencialesInvalidasException;
import com.segandina.sgi.exception.DatoDuplicadoException;
import com.segandina.sgi.exception.RecursoNoEncontradoException;
import com.segandina.sgi.exception.ReglaNegocioException;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.model.Zona;
import com.segandina.sgi.service.AuditoriaService;

/**
 * Pruebas unitarias de la gestión de usuarios (RF-02) y del cambio de contraseña propia, con DAO y auditoría
 * simulados y BCrypt real (con costo bajo para que sea rápido).
 */
class UsuarioServiceImplTest {

	private static final long ID_ADMIN = 1L;
	private static final long ID_VIGILANTE = 7L;
	private static final short ID_ROL_ADMIN = 1;
	private static final short ID_ROL_SUPERVISOR = 2;
	private static final short ID_ROL_VIGILANTE = 3;
	private static final int ID_ZONA = 1;
	private static final int ID_ZONA_INACTIVA = 2;
	private static final String CLAVE_VIGILANTE = "ClaveVigilante1";

	private UsuarioDao usuarioDao;
	private AuditoriaService auditoriaService;
	private PasswordEncoder passwordEncoder;
	private UsuarioServiceImpl usuarioService;

	private Usuario admin;
	private Usuario vigilante;
	private Zona zona;
	private Zona zonaInactiva;

	@BeforeEach
	void preparar() {
		usuarioDao = mock(UsuarioDao.class);
		RolDao rolDao = mock(RolDao.class);
		ZonaDao zonaDao = mock(ZonaDao.class);
		auditoriaService = mock(AuditoriaService.class);
		passwordEncoder = new BCryptPasswordEncoder(4);
		usuarioService = new UsuarioServiceImpl(usuarioDao, rolDao, zonaDao, passwordEncoder, auditoriaService);

		Rol rolAdmin = rol(ID_ROL_ADMIN, "Administrador");
		Rol rolSupervisor = rol(ID_ROL_SUPERVISOR, "Supervisor");
		Rol rolVigilante = rol(ID_ROL_VIGILANTE, "Vigilante");
		when(rolDao.findById(ID_ROL_ADMIN)).thenReturn(Optional.of(rolAdmin));
		when(rolDao.findById(ID_ROL_SUPERVISOR)).thenReturn(Optional.of(rolSupervisor));
		when(rolDao.findById(ID_ROL_VIGILANTE)).thenReturn(Optional.of(rolVigilante));

		zona = zona(ID_ZONA, true);
		zonaInactiva = zona(ID_ZONA_INACTIVA, false);
		when(zonaDao.findById(ID_ZONA)).thenReturn(Optional.of(zona));
		when(zonaDao.findById(ID_ZONA_INACTIVA)).thenReturn(Optional.of(zonaInactiva));

		admin = usuario(ID_ADMIN, "11111111", rolAdmin, null, "ClaveAdmin1");
		vigilante = usuario(ID_VIGILANTE, "22222222", rolVigilante, zona, CLAVE_VIGILANTE);
		when(usuarioDao.findById(ID_ADMIN)).thenReturn(Optional.of(admin));
		when(usuarioDao.findById(ID_VIGILANTE)).thenReturn(Optional.of(vigilante));
		when(usuarioDao.save(any(Usuario.class))).thenAnswer(invocacion -> {
			Usuario guardado = invocacion.getArgument(0);
			guardado.setIdUsuario(50L);
			return guardado;
		});
	}

	@Test
	@SuppressWarnings("unchecked")
	void crearGuardaHashBcryptYAuditaSinContrasena() {
		UsuarioResponse creado = usuarioService.crear(new UsuarioCrearRequest("33333333", " Luis ", "Rojas", "  ",
				"ClaveInicial1", ID_ROL_VIGILANTE, ID_ZONA), ID_ADMIN);

		ArgumentCaptor<Usuario> guardado = ArgumentCaptor.forClass(Usuario.class);
		verify(usuarioDao).save(guardado.capture());
		assertNotEquals("ClaveInicial1", guardado.getValue().getContrasena());
		assertTrue(passwordEncoder.matches("ClaveInicial1", guardado.getValue().getContrasena()));
		assertEquals("Luis", creado.nombres());
		assertNull(creado.apellidoMaterno());
		assertEquals(Integer.valueOf(ID_ZONA), creado.idZona());
		assertTrue(creado.estadoActivo());

		ArgumentCaptor<Map<String, Object>> detalle = ArgumentCaptor.forClass(Map.class);
		verify(auditoriaService).registrar(eq(AccionAuditoria.CREAR_USUARIO), detalle.capture(), isNull(), eq(admin));
		Map<String, Object> despues = (Map<String, Object>) detalle.getValue().get("despues");
		assertEquals("33333333", despues.get("dni"));
		assertFalse(despues.containsKey("contrasena"));
	}

	@Test
	void crearConDniRepetidoDevuelveDuplicado() {
		when(usuarioDao.existsByDni("22222222")).thenReturn(true);

		assertThrows(DatoDuplicadoException.class, () -> usuarioService.crear(new UsuarioCrearRequest("22222222",
				"Luis", "Rojas", null, "ClaveInicial1", ID_ROL_SUPERVISOR, null), ID_ADMIN));
		verify(usuarioDao, never()).save(any());
	}

	@Test
	void vigilanteSinZonaSeRechaza() {
		ReglaNegocioException error = assertThrows(ReglaNegocioException.class, () -> usuarioService.crear(
				new UsuarioCrearRequest("33333333", "Luis", "Rojas", null, "ClaveInicial1", ID_ROL_VIGILANTE, null),
				ID_ADMIN));
		assertEquals("El Vigilante debe tener una zona asignada", error.getMessage());
	}

	@Test
	void supervisorPuedeNoTenerZona() {
		UsuarioResponse creado = usuarioService.crear(new UsuarioCrearRequest("33333333", "Eva", "Paz", null,
				"ClaveInicial1", ID_ROL_SUPERVISOR, null), ID_ADMIN);

		assertNull(creado.idZona());
		assertEquals("Supervisor", creado.rol());
	}

	@Test
	void zonaInactivaSeRechazaAlCrear() {
		assertThrows(ReglaNegocioException.class, () -> usuarioService.crear(new UsuarioCrearRequest("33333333",
				"Luis", "Rojas", null, "ClaveInicial1", ID_ROL_VIGILANTE, ID_ZONA_INACTIVA), ID_ADMIN));
	}

	@Test
	@SuppressWarnings("unchecked")
	void actualizarAuditaAntesYDespuesYSoloMarcaQueLaContrasenaCambio() {
		String hashAnterior = vigilante.getContrasena();

		usuarioService.actualizar(ID_VIGILANTE, new UsuarioActualizarRequest("22222222", "Pedro", "Quispe", null,
				"NuevaClave123", ID_ROL_SUPERVISOR, null), ID_ADMIN);

		assertNotEquals(hashAnterior, vigilante.getContrasena());
		assertTrue(passwordEncoder.matches("NuevaClave123", vigilante.getContrasena()));
		ArgumentCaptor<Map<String, Object>> detalle = ArgumentCaptor.forClass(Map.class);
		verify(auditoriaService).registrar(eq(AccionAuditoria.MODIFICAR_USUARIO), detalle.capture(), isNull(),
				eq(admin));
		Map<String, Object> antes = (Map<String, Object>) detalle.getValue().get("antes");
		Map<String, Object> despues = (Map<String, Object>) detalle.getValue().get("despues");
		assertEquals("Vigilante", antes.get("rol"));
		assertEquals(ID_ZONA, antes.get("idZona"));
		assertEquals("Supervisor", despues.get("rol"));
		assertNull(despues.get("idZona"));
		assertEquals(true, detalle.getValue().get("contrasenaCambiada"));
		assertFalse(detalle.getValue().toString().contains(vigilante.getContrasena()));
	}

	@Test
	void actualizarConservaLaZonaActualAunqueEsteInactiva() {
		vigilante.setZona(zonaInactiva);

		UsuarioResponse editado = usuarioService.actualizar(ID_VIGILANTE, new UsuarioActualizarRequest("22222222",
				"Pedro", "Quispe", null, null, ID_ROL_VIGILANTE, ID_ZONA_INACTIVA), ID_ADMIN);

		assertSame(zonaInactiva, vigilante.getZona());
		assertEquals("Pedro", editado.nombres());
	}

	@Test
	void actualizarSinCambiosNoAudita() {
		usuarioService.actualizar(ID_VIGILANTE, new UsuarioActualizarRequest("22222222", "Nombre", "Apellido", null,
				null, ID_ROL_VIGILANTE, ID_ZONA), ID_ADMIN);

		verify(auditoriaService, never()).registrar(any(), any(), any(), any());
	}

	@Test
	void actualizarConDniDeOtroUsuarioDevuelveDuplicado() {
		when(usuarioDao.existsByDniAndIdUsuarioNot("11111111", ID_VIGILANTE)).thenReturn(true);

		assertThrows(DatoDuplicadoException.class, () -> usuarioService.actualizar(ID_VIGILANTE,
				new UsuarioActualizarRequest("11111111", "Nombre", "Apellido", null, null, ID_ROL_VIGILANTE, ID_ZONA),
				ID_ADMIN));
	}

	@Test
	void administradorNoPuedeQuitarseSuRol() {
		assertThrows(ReglaNegocioException.class, () -> usuarioService.actualizar(ID_ADMIN,
				new UsuarioActualizarRequest("11111111", "Nombre", "Apellido", null, null, ID_ROL_SUPERVISOR, null),
				ID_ADMIN));
		assertEquals("Administrador", admin.getRol().getNombreRol());
	}

	@Test
	void administradorNoPuedeDesactivarse() {
		assertThrows(ReglaNegocioException.class, () -> usuarioService.cambiarEstado(ID_ADMIN, false, ID_ADMIN));
		assertTrue(admin.getEstadoActivo());
	}

	@Test
	void cambiarEstadoAuditaSoloSiCambia() {
		assertFalse(usuarioService.cambiarEstado(ID_VIGILANTE, false, ID_ADMIN).estadoActivo());
		usuarioService.cambiarEstado(ID_VIGILANTE, false, ID_ADMIN);

		verify(auditoriaService).registrar(eq(AccionAuditoria.CAMBIAR_ESTADO_USUARIO), any(), isNull(), eq(admin));
	}

	@Test
	void obtenerUsuarioInexistenteDevuelveNoEncontrado() {
		when(usuarioDao.findById(99L)).thenReturn(Optional.empty());

		assertThrows(RecursoNoEncontradoException.class, () -> usuarioService.obtener(99L));
	}

	@Test
	void actorInactivoSeRechazaCon401() {
		admin.setEstadoActivo(false);

		assertThrows(CredencialesInvalidasException.class, () -> usuarioService.cambiarEstado(ID_VIGILANTE, false,
				ID_ADMIN));
	}

	@Test
	void cambiarContrasenaPropiaGuardaElNuevoHashYAudita() {
		usuarioService.cambiarContrasenaPropia(ID_VIGILANTE,
				new CambioContrasenaRequest(CLAVE_VIGILANTE, "OtraClave456"));

		assertTrue(passwordEncoder.matches("OtraClave456", vigilante.getContrasena()));
		verify(auditoriaService).registrar(AccionAuditoria.CAMBIAR_CONTRASENA,
				Map.of("idUsuario", ID_VIGILANTE, "origen", "propio"), null, vigilante);
	}

	@Test
	void cambiarContrasenaPropiaConActualIncorrectaSeRechaza() {
		String hashAnterior = vigilante.getContrasena();

		ReglaNegocioException error = assertThrows(ReglaNegocioException.class, () -> usuarioService
				.cambiarContrasenaPropia(ID_VIGILANTE, new CambioContrasenaRequest("incorrecta", "OtraClave456")));

		assertEquals("La contraseña actual no es correcta", error.getMessage());
		assertEquals(hashAnterior, vigilante.getContrasena());
		verify(auditoriaService, never()).registrar(any(), any(), any(), any());
	}

	@Test
	void cambiarContrasenaPropiaIgualALaActualSeRechaza() {
		assertThrows(ReglaNegocioException.class, () -> usuarioService.cambiarContrasenaPropia(ID_VIGILANTE,
				new CambioContrasenaRequest(CLAVE_VIGILANTE, CLAVE_VIGILANTE)));
	}

	private static Rol rol(short id, String nombre) {
		Rol rol = new Rol();
		rol.setIdRol(id);
		rol.setNombreRol(nombre);
		return rol;
	}

	private static Zona zona(int id, boolean activa) {
		Zona zona = new Zona();
		zona.setIdZona(id);
		zona.setNombreZona("Zona " + id);
		zona.setEstadoActivo(activa);
		return zona;
	}

	private Usuario usuario(long id, String dni, Rol rol, Zona zona, String clave) {
		Usuario usuario = new Usuario();
		usuario.setIdUsuario(id);
		usuario.setDni(dni);
		usuario.setNombres("Nombre");
		usuario.setApellidoPaterno("Apellido");
		usuario.setContrasena(passwordEncoder.encode(clave));
		usuario.setEstadoActivo(true);
		usuario.setRol(rol);
		usuario.setZona(zona);
		return usuario;
	}

}
