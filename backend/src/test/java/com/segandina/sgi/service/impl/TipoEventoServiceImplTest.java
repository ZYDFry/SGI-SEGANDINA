package com.segandina.sgi.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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

import com.segandina.sgi.dao.TipoEventoDao;
import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.dto.request.TipoEventoRequest;
import com.segandina.sgi.dto.response.TipoEventoResponse;
import com.segandina.sgi.exception.DatoDuplicadoException;
import com.segandina.sgi.exception.RecursoNoEncontradoException;
import com.segandina.sgi.exception.ReglaNegocioException;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.TipoEvento;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.AuditoriaService;

/**
 * Pruebas unitarias de la administración de tipos de evento (RF-09) con DAO y auditoría simulados.
 */
class TipoEventoServiceImplTest {

	private static final long ID_ADMIN = 1L;
	private static final short ID_ROBO = 1;
	private static final short ID_OTRO = 4;

	private TipoEventoDao tipoEventoDao;
	private AuditoriaService auditoriaService;
	private TipoEventoServiceImpl tipoEventoService;

	private Usuario admin;
	private TipoEvento robo;

	@BeforeEach
	void preparar() {
		tipoEventoDao = mock(TipoEventoDao.class);
		UsuarioDao usuarioDao = mock(UsuarioDao.class);
		auditoriaService = mock(AuditoriaService.class);
		tipoEventoService = new TipoEventoServiceImpl(tipoEventoDao, usuarioDao, auditoriaService);

		admin = new Usuario();
		admin.setIdUsuario(ID_ADMIN);
		admin.setEstadoActivo(true);
		when(usuarioDao.findById(ID_ADMIN)).thenReturn(Optional.of(admin));

		robo = tipo(ID_ROBO, "Robo");
		when(tipoEventoDao.findById(ID_ROBO)).thenReturn(Optional.of(robo));
		when(tipoEventoDao.findById(ID_OTRO)).thenReturn(Optional.of(tipo(ID_OTRO, "Otro")));
		when(tipoEventoDao.save(any(TipoEvento.class))).thenAnswer(invocacion -> {
			TipoEvento guardado = invocacion.getArgument(0);
			guardado.setIdTipoEvento((short) 9);
			return guardado;
		});
	}

	@Test
	void crearGuardaRecortadoActivoYAudita() {
		TipoEventoResponse creado = tipoEventoService.crear(new TipoEventoRequest("  Incendio "), ID_ADMIN);

		assertEquals(new TipoEventoResponse((short) 9, "Incendio", true), creado);
		verify(auditoriaService).registrar(AccionAuditoria.CREAR_TIPO_EVENTO, Map.of("idTipoEvento", (short) 9,
				"despues", Map.of("nombreTipoEvento", "Incendio", "estadoActivo", true)), null, admin);
	}

	@Test
	void crearConNombreRepetidoDevuelveDuplicado() {
		when(tipoEventoDao.existsByNombreTipoEventoIgnoreCase("robo")).thenReturn(true);

		assertThrows(DatoDuplicadoException.class, () -> tipoEventoService.crear(new TipoEventoRequest("robo"),
				ID_ADMIN));
		verify(tipoEventoDao, never()).save(any());
	}

	@Test
	void renombrarAuditaAntesYDespues() {
		TipoEventoResponse editado = tipoEventoService.actualizar(ID_ROBO, new TipoEventoRequest("Robo o hurto"),
				ID_ADMIN);

		assertEquals("Robo o hurto", editado.nombreTipoEvento());
		verify(auditoriaService).registrar(AccionAuditoria.MODIFICAR_TIPO_EVENTO, Map.of("idTipoEvento", ID_ROBO,
				"antes", Map.of("nombreTipoEvento", "Robo"), "despues", Map.of("nombreTipoEvento", "Robo o hurto")),
				null, admin);
	}

	@Test
	void renombrarAlNombreDeOtroTipoDevuelveDuplicado() {
		when(tipoEventoDao.existsByNombreTipoEventoIgnoreCaseAndIdTipoEventoNot("Alerta", ID_ROBO)).thenReturn(true);

		assertThrows(DatoDuplicadoException.class,
				() -> tipoEventoService.actualizar(ID_ROBO, new TipoEventoRequest("Alerta"), ID_ADMIN));
		assertEquals("Robo", robo.getNombreTipoEvento());
	}

	@Test
	void elTipoOtroNoSePuedeRenombrar() {
		assertThrows(ReglaNegocioException.class,
				() -> tipoEventoService.actualizar(ID_OTRO, new TipoEventoRequest("Varios"), ID_ADMIN));
	}

	@Test
	void cambiarEstadoAuditaSoloSiCambia() {
		assertFalse(tipoEventoService.cambiarEstado(ID_ROBO, false, ID_ADMIN).estadoActivo());
		tipoEventoService.cambiarEstado(ID_ROBO, false, ID_ADMIN);
		assertTrue(tipoEventoService.cambiarEstado(ID_ROBO, true, ID_ADMIN).estadoActivo());

		verify(auditoriaService).registrar(AccionAuditoria.CAMBIAR_ESTADO_TIPO_EVENTO, Map.of("idTipoEvento",
				ID_ROBO, "antes", Map.of("estadoActivo", true), "despues", Map.of("estadoActivo", false)), null, admin);
		verify(auditoriaService).registrar(AccionAuditoria.CAMBIAR_ESTADO_TIPO_EVENTO, Map.of("idTipoEvento",
				ID_ROBO, "antes", Map.of("estadoActivo", false), "despues", Map.of("estadoActivo", true)), null, admin);
	}

	@Test
	void tipoInexistenteDevuelveNoEncontrado() {
		when(tipoEventoDao.findById((short) 99)).thenReturn(Optional.empty());

		assertThrows(RecursoNoEncontradoException.class,
				() -> tipoEventoService.cambiarEstado((short) 99, false, ID_ADMIN));
	}

	private static TipoEvento tipo(short id, String nombre) {
		TipoEvento tipo = new TipoEvento();
		tipo.setIdTipoEvento(id);
		tipo.setNombreTipoEvento(nombre);
		tipo.setEstadoActivo(true);
		return tipo;
	}

}
