package com.segandina.sgi.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.segandina.sgi.config.RelojConfig;
import com.segandina.sgi.dao.IncidenciaDao;
import com.segandina.sgi.dao.NivelGravedadDao;
import com.segandina.sgi.dao.TipoEventoDao;
import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.dao.ZonaDao;
import com.segandina.sgi.dto.request.IncidenciaRequest;
import com.segandina.sgi.dto.response.IncidenciaResponse;
import com.segandina.sgi.exception.CredencialesInvalidasException;
import com.segandina.sgi.exception.ReglaNegocioException;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Incidencia;
import com.segandina.sgi.model.NivelGravedad;
import com.segandina.sgi.model.TipoEvento;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.model.Zona;
import com.segandina.sgi.service.AuditoriaService;

/**
 * Pruebas unitarias del registro de incidencias (RF-03) con DAO y auditoría simulados y un reloj fijo.
 */
class IncidenciaServiceImplTest {

	private static final long ID_USUARIO = 7L;
	private static final int ID_ZONA = 1;
	private static final short ID_ROBO = 1;
	private static final short ID_OTRO = 4;
	private static final short ID_NIVEL = 2;
	private static final OffsetDateTime AHORA = OffsetDateTime.parse("2026-10-24T10:00:00-05:00");
	private static final String DESCRIPCION = "Persona sospechosa en la puerta";

	private IncidenciaDao incidenciaDao;
	private UsuarioDao usuarioDao;
	private ZonaDao zonaDao;
	private TipoEventoDao tipoEventoDao;
	private NivelGravedadDao nivelGravedadDao;
	private AuditoriaService auditoriaService;
	private IncidenciaServiceImpl incidenciaService;

	private Usuario usuario;
	private Zona zona;
	private TipoEvento robo;
	private TipoEvento otro;
	private NivelGravedad nivel;

	@BeforeEach
	void preparar() {
		incidenciaDao = mock(IncidenciaDao.class);
		usuarioDao = mock(UsuarioDao.class);
		zonaDao = mock(ZonaDao.class);
		tipoEventoDao = mock(TipoEventoDao.class);
		nivelGravedadDao = mock(NivelGravedadDao.class);
		auditoriaService = mock(AuditoriaService.class);
		Clock reloj = Clock.fixed(Instant.from(AHORA), RelojConfig.ZONA_LIMA);
		incidenciaService = new IncidenciaServiceImpl(incidenciaDao, usuarioDao, zonaDao, tipoEventoDao,
				nivelGravedadDao, auditoriaService, reloj);

		usuario = new Usuario();
		usuario.setIdUsuario(ID_USUARIO);
		usuario.setEstadoActivo(true);
		zona = new Zona();
		zona.setIdZona(ID_ZONA);
		zona.setNombreZona("Sede Miraflores");
		robo = tipo(ID_ROBO, "Robo");
		otro = tipo(ID_OTRO, "Otro");
		nivel = new NivelGravedad();
		nivel.setIdNivelGravedad(ID_NIVEL);
		nivel.setNombreNivel("Media");
		nivel.setOrden((short) 2);

		when(usuarioDao.findById(ID_USUARIO)).thenReturn(Optional.of(usuario));
		when(zonaDao.findById(ID_ZONA)).thenReturn(Optional.of(zona));
		when(tipoEventoDao.findById(ID_ROBO)).thenReturn(Optional.of(robo));
		when(tipoEventoDao.findById(ID_OTRO)).thenReturn(Optional.of(otro));
		when(nivelGravedadDao.findById(ID_NIVEL)).thenReturn(Optional.of(nivel));
		// Simula el id que asigna la BD al insertar
		when(incidenciaDao.save(any(Incidencia.class))).thenAnswer(invocacion -> {
			Incidencia incidencia = invocacion.getArgument(0);
			incidencia.setIdIncidencia(100L);
			return incidencia;
		});
	}

	@Test
	void registroValidoGuardaConElUsuarioDelTokenYAudita() {
		OffsetDateTime haceUnaHora = AHORA.minusHours(1);

		IncidenciaResponse respuesta = incidenciaService.registrar(
				new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, "  " + DESCRIPCION + "  ", haceUnaHora), ID_USUARIO);

		Incidencia guardada = capturarGuardada();
		assertEquals(usuario, guardada.getUsuario());
		assertEquals(zona, guardada.getZona());
		assertEquals(robo, guardada.getTipoEvento());
		assertEquals(nivel, guardada.getNivelGravedad());
		assertEquals(DESCRIPCION, guardada.getDescripcion());
		assertEquals(haceUnaHora, guardada.getFechaHora());

		assertEquals(100L, respuesta.idIncidencia());
		assertEquals(ID_USUARIO, respuesta.idUsuario());
		assertEquals("Sede Miraflores", respuesta.zona().nombreZona());
		assertEquals("Robo", respuesta.tipoEvento().nombreTipoEvento());
		assertEquals("Media", respuesta.nivelGravedad().nombreNivel());

		verify(auditoriaService).registrar(AccionAuditoria.REGISTRAR_INCIDENCIA, Map.of(
				"idIncidencia", 100L,
				"idZona", ID_ZONA,
				"idTipoEvento", ID_ROBO,
				"idNivelGravedad", ID_NIVEL), null, usuario);
	}

	@Test
	void sinFechaUsaLaHoraActual() {
		incidenciaService.registrar(new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, DESCRIPCION, null), ID_USUARIO);

		assertTrue(AHORA.isEqual(capturarGuardada().getFechaHora()));
	}

	@Test
	void fechaFuturaSeRechaza() {
		ReglaNegocioException ex = assertThrows(ReglaNegocioException.class, () -> incidenciaService.registrar(
				new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, DESCRIPCION, AHORA.plusMinutes(10)), ID_USUARIO));

		assertEquals("La fecha y hora de la incidencia no puede ser futura", ex.getMessage());
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void fechaLigeramenteAdelantadaDentroDeLaToleranciaSeAcepta() {
		OffsetDateTime adelantada = AHORA.plusMinutes(1);

		incidenciaService.registrar(new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, DESCRIPCION, adelantada),
				ID_USUARIO);

		assertEquals(adelantada, capturarGuardada().getFechaHora());
	}

	@Test
	void zonaInexistenteSeRechaza() {
		when(zonaDao.findById(99)).thenReturn(Optional.empty());

		ReglaNegocioException ex = assertThrows(ReglaNegocioException.class, () -> incidenciaService.registrar(
				new IncidenciaRequest(99, ID_ROBO, ID_NIVEL, DESCRIPCION, null), ID_USUARIO));

		assertEquals("La zona seleccionada no existe o está inactiva", ex.getMessage());
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void zonaInactivaSeRechaza() {
		zona.setEstadoActivo(false);

		assertThrows(ReglaNegocioException.class, () -> incidenciaService.registrar(
				new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, DESCRIPCION, null), ID_USUARIO));
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void tipoEventoInactivoSeRechaza() {
		robo.setEstadoActivo(false);

		ReglaNegocioException ex = assertThrows(ReglaNegocioException.class, () -> incidenciaService.registrar(
				new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, DESCRIPCION, null), ID_USUARIO));

		assertEquals("El tipo de evento seleccionado no existe o está inactivo", ex.getMessage());
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void nivelGravedadInactivoSeRechaza() {
		nivel.setEstadoActivo(false);

		ReglaNegocioException ex = assertThrows(ReglaNegocioException.class, () -> incidenciaService.registrar(
				new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, DESCRIPCION, null), ID_USUARIO));

		assertEquals("El nivel de gravedad seleccionado no existe o está inactivo", ex.getMessage());
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void tipoOtroConDescripcionCortaSeRechaza() {
		ReglaNegocioException ex = assertThrows(ReglaNegocioException.class, () -> incidenciaService.registrar(
				new IncidenciaRequest(ID_ZONA, ID_OTRO, ID_NIVEL, "Algo raro", null), ID_USUARIO));

		assertEquals("Para el tipo \"Otro\" la descripción debe tener al menos 20 caracteres", ex.getMessage());
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void tipoOtroConVeinteCaracteresSeAcepta() {
		String veinte = "12345678901234567890";

		incidenciaService.registrar(new IncidenciaRequest(ID_ZONA, ID_OTRO, ID_NIVEL, veinte, null), ID_USUARIO);

		assertEquals(veinte, capturarGuardada().getDescripcion());
	}

	@Test
	void losEspaciosNoCuentanParaElMinimoDeOtro() {
		String diecinueveConEspacios = "   1234567890123456789   ";

		assertThrows(ReglaNegocioException.class, () -> incidenciaService.registrar(
				new IncidenciaRequest(ID_ZONA, ID_OTRO, ID_NIVEL, diecinueveConEspacios, null), ID_USUARIO));
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void laReglaDeOtroNoDistingueMayusculas() {
		otro.setNombreTipoEvento("OTRO");

		assertThrows(ReglaNegocioException.class, () -> incidenciaService.registrar(
				new IncidenciaRequest(ID_ZONA, ID_OTRO, ID_NIVEL, "Algo raro", null), ID_USUARIO));
	}

	@Test
	void otrosTiposAceptanDescripcionCorta() {
		incidenciaService.registrar(new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, "Robo de celular", null),
				ID_USUARIO);

		assertEquals("Robo de celular", capturarGuardada().getDescripcion());
	}

	@Test
	void usuarioInactivoNoPuedeRegistrar() {
		usuario.setEstadoActivo(false);

		assertThrows(CredencialesInvalidasException.class, () -> incidenciaService.registrar(
				new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, DESCRIPCION, null), ID_USUARIO));
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void usuarioInexistenteNoPuedeRegistrar() {
		when(usuarioDao.findById(ID_USUARIO)).thenReturn(Optional.empty());

		assertThrows(CredencialesInvalidasException.class, () -> incidenciaService.registrar(
				new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, DESCRIPCION, null), ID_USUARIO));
		verificarQueNoSeGuardoNiAudito();
	}

	private Incidencia capturarGuardada() {
		ArgumentCaptor<Incidencia> captor = ArgumentCaptor.forClass(Incidencia.class);
		verify(incidenciaDao).save(captor.capture());
		return captor.getValue();
	}

	private void verificarQueNoSeGuardoNiAudito() {
		verify(incidenciaDao, never()).save(any());
		verifyNoInteractions(auditoriaService);
	}

	private static TipoEvento tipo(short id, String nombre) {
		TipoEvento tipo = new TipoEvento();
		tipo.setIdTipoEvento(id);
		tipo.setNombreTipoEvento(nombre);
		return tipo;
	}

}
