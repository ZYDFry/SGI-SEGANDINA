package com.segandina.sgi.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

import com.segandina.sgi.config.IncidenciaProperties;
import com.segandina.sgi.config.RelojConfig;
import com.segandina.sgi.dao.IncidenciaDao;
import com.segandina.sgi.dao.NivelGravedadDao;
import com.segandina.sgi.dao.TipoEventoDao;
import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.dao.ZonaDao;
import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.request.IncidenciaRequest;
import com.segandina.sgi.dto.request.Periodo;
import com.segandina.sgi.dto.request.PeriodoFiltro;
import com.segandina.sgi.dto.response.IncidenciaHistorialResponse;
import com.segandina.sgi.dto.response.IncidenciaResponse;
import com.segandina.sgi.dto.response.MiIncidenciaResponse;
import com.segandina.sgi.exception.CredencialesInvalidasException;
import com.segandina.sgi.exception.RecursoNoEncontradoException;
import com.segandina.sgi.exception.ReglaNegocioException;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Incidencia;
import com.segandina.sgi.model.NivelGravedad;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.TipoEvento;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.model.Zona;
import com.segandina.sgi.service.AuditoriaService;
import com.segandina.sgi.service.IncidenciaService;
import com.segandina.sgi.service.UsuarioService;

/**
 * Pruebas unitarias del registro y la corrección (RF-03) y del historial (RF-04) de incidencias con DAO y auditoría simulados y un reloj fijo.
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
				nivelGravedadDao, auditoriaService, reloj, new IncidenciaProperties(Duration.ofMinutes(15)));

		usuario = new Usuario();
		usuario.setIdUsuario(ID_USUARIO);
		usuario.setEstadoActivo(true);
		usuario.setRol(rol(UsuarioService.ROL_ADMINISTRADOR));
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

	@Test
	void vigilanteRegistraEnSuZonaAsignada() {
		hacerVigilante(zona);

		incidenciaService.registrar(new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, DESCRIPCION, null), ID_USUARIO);

		assertEquals(zona, capturarGuardada().getZona());
		verify(auditoriaService).registrar(any(), any(), any(), any());
	}

	@Test
	void vigilanteSinZonaAsignadaNoPuedeRegistrar() {
		hacerVigilante(null);

		ReglaNegocioException ex = assertThrows(ReglaNegocioException.class, () -> incidenciaService.registrar(
				new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, DESCRIPCION, null), ID_USUARIO));

		assertEquals(IncidenciaService.SIN_ZONA_ASIGNADA, ex.getMessage());
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void vigilanteConZonaAsignadaInactivaNoPuedeRegistrar() {
		zona.setEstadoActivo(false);
		hacerVigilante(zona);

		ReglaNegocioException ex = assertThrows(ReglaNegocioException.class, () -> incidenciaService.registrar(
				new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, DESCRIPCION, null), ID_USUARIO));

		assertEquals(IncidenciaService.ZONA_ASIGNADA_INACTIVA, ex.getMessage());
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void vigilanteNoPuedeRegistrarEnOtraZona() {
		hacerVigilante(zona);
		Zona ajena = new Zona();
		ajena.setIdZona(2);
		when(zonaDao.findById(2)).thenReturn(Optional.of(ajena));

		ReglaNegocioException ex = assertThrows(ReglaNegocioException.class, () -> incidenciaService.registrar(
				new IncidenciaRequest(2, ID_ROBO, ID_NIVEL, DESCRIPCION, null), ID_USUARIO));

		assertEquals(IncidenciaService.SOLO_ZONA_ASIGNADA, ex.getMessage());
		// La regla se aplica antes de consultar la zona pedida
		verify(zonaDao, never()).findById(any());
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void administradorPuedeRegistrarEnCualquierZonaActiva() {
		Zona propia = new Zona();
		propia.setIdZona(2);
		usuario.setZona(propia);

		incidenciaService.registrar(new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, DESCRIPCION, null), ID_USUARIO);

		assertEquals(zona, capturarGuardada().getZona());
	}

	@Test
	@SuppressWarnings("unchecked")
	void historialOrdenaPorFechaDescendenteYAcotaElTamano() {
		Incidencia incidencia = new Incidencia();
		incidencia.setIdIncidencia(100L);
		incidencia.setFechaHora(AHORA.minusHours(1));
		incidencia.setDescripcion(DESCRIPCION);
		incidencia.setZona(zona);
		incidencia.setTipoEvento(robo);
		incidencia.setNivelGravedad(nivel);
		usuario.setDni("12345678");
		usuario.setNombres("Ana");
		usuario.setApellidoPaterno("Quispe");
		incidencia.setUsuario(usuario);
		ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
		when(incidenciaDao.findAll(any(Specification.class), pageable.capture()))
				.thenAnswer(invocacion -> new PageImpl<>(List.of(incidencia), invocacion.getArgument(1), 1));

		Page<IncidenciaHistorialResponse> pagina = incidenciaService.buscar(
				new IncidenciaFiltro(Periodo.HOY, null, null, ID_ZONA, null, null), -3, 500);

		assertEquals(0, pageable.getValue().getPageNumber());
		assertEquals(IncidenciaService.TAMANO_MAXIMO, pageable.getValue().getPageSize());
		assertEquals(Sort.by(Sort.Order.desc("fechaHora"), Sort.Order.desc("idIncidencia")),
				pageable.getValue().getSort());
		IncidenciaHistorialResponse fila = pagina.getContent().get(0);
		assertEquals(100L, fila.idIncidencia());
		assertEquals("Ana Quispe", fila.usuario().nombreCompleto());
		assertEquals("Sede Miraflores", fila.zona().nombreZona());
	}

	@Test
	void historialConRangoInvalidoNoConsultaLaBd() {
		IncidenciaFiltro invertido = new IncidenciaFiltro(Periodo.PERSONALIZADO, LocalDate.of(2026, 10, 10),
				LocalDate.of(2026, 10, 1), null, null, null);

		assertThrows(ReglaNegocioException.class, () -> incidenciaService.buscar(invertido, 0, 20));
		verifyNoInteractions(incidenciaDao);
	}

	@Test
	@SuppressWarnings("unchecked")
	void misIncidenciasUsanElOrdenDelHistorialYSinFechaRegistroNoSonEditables() {
		Incidencia incidencia = new Incidencia();
		incidencia.setIdIncidencia(101L);
		incidencia.setFechaHora(AHORA.minusHours(2));
		incidencia.setDescripcion(DESCRIPCION);
		incidencia.setZona(zona);
		incidencia.setTipoEvento(robo);
		incidencia.setNivelGravedad(nivel);
		incidencia.setUsuario(usuario);
		ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
		when(incidenciaDao.findAll(any(Specification.class), pageable.capture()))
				.thenAnswer(invocacion -> new PageImpl<>(List.of(incidencia), invocacion.getArgument(1), 1));

		Page<MiIncidenciaResponse> pagina = incidenciaService.buscarPropias(
				new PeriodoFiltro(Periodo.ULTIMOS_7_DIAS, null, null), ID_USUARIO, -1, 0);

		assertEquals(0, pageable.getValue().getPageNumber());
		assertEquals(1, pageable.getValue().getPageSize());
		assertEquals(IncidenciaDao.ORDEN_HISTORIAL, pageable.getValue().getSort());
		MiIncidenciaResponse fila = pagina.getContent().get(0);
		assertEquals(101L, fila.idIncidencia());
		assertEquals(AHORA.minusHours(2), fila.fechaHora());
		assertEquals("Sede Miraflores", fila.zona().nombreZona());
		assertNull(fila.editableHasta());
		// Solo lectura: no consulta al usuario ni audita
		verifyNoInteractions(usuarioDao, auditoriaService);
	}

	@Test
	void misIncidenciasConRangoInvalidoNoConsultanLaBd() {
		PeriodoFiltro sinHasta = new PeriodoFiltro(Periodo.PERSONALIZADO, LocalDate.of(2026, 10, 1), null);

		assertThrows(ReglaNegocioException.class, () -> incidenciaService.buscarPropias(sinHasta, ID_USUARIO, 0, 20));
		verifyNoInteractions(incidenciaDao);
	}

	@Test
	@SuppressWarnings("unchecked")
	void misIncidenciasTraenEditableHastaSoloDentroDelPlazo() {
		Incidencia reciente = guardadaHace(Duration.ofMinutes(5));
		Incidencia vencida = guardadaHace(Duration.ofMinutes(16));
		vencida.setIdIncidencia(102L);
		when(incidenciaDao.findAll(any(Specification.class), any(Pageable.class)))
				.thenAnswer(invocacion -> new PageImpl<>(List.of(reciente, vencida), invocacion.getArgument(1), 2));

		List<MiIncidenciaResponse> filas = incidenciaService.buscarPropias(
				new PeriodoFiltro(Periodo.HOY, null, null), ID_USUARIO, 0, 20).getContent();

		assertEquals(AHORA.plusMinutes(10), filas.get(0).editableHasta());
		assertNull(filas.get(1).editableHasta());
	}

	// --- Corrección por el autor (RF-03) ---

	@Test
	void autorCorrigeDentroDelPlazoYSeAuditanSoloLosCamposCambiados() {
		Incidencia incidencia = guardadaHace(Duration.ofMinutes(5));
		String nueva = "Persona sospechosa forzando la puerta";

		IncidenciaResponse respuesta = incidenciaService.corregir(100L,
				new IncidenciaRequest(ID_ZONA, ID_OTRO, ID_NIVEL, "  " + nueva + "  ", null), ID_USUARIO);

		assertEquals(otro, incidencia.getTipoEvento());
		assertEquals(nueva, incidencia.getDescripcion());
		// Sin fechaHora se conserva la registrada
		assertEquals(AHORA.minusHours(1), incidencia.getFechaHora());
		assertEquals(usuario, incidencia.getUsuario());
		assertEquals("Otro", respuesta.tipoEvento().nombreTipoEvento());
		verify(auditoriaService).registrar(AccionAuditoria.EDITAR_INCIDENCIA, Map.of(
				"idIncidencia", 100L,
				"antes", Map.of("idTipoEvento", ID_ROBO, "descripcion", DESCRIPCION),
				"despues", Map.of("idTipoEvento", ID_OTRO, "descripcion", nueva)), null, usuario);
	}

	@Test
	void cambioDeFechaSeAuditaEnFormatoIso() {
		guardadaHace(Duration.ofMinutes(5));
		OffsetDateTime nuevaFecha = AHORA.minusHours(3);

		incidenciaService.corregir(100L, new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, DESCRIPCION, nuevaFecha),
				ID_USUARIO);

		verify(auditoriaService).registrar(AccionAuditoria.EDITAR_INCIDENCIA, Map.of(
				"idIncidencia", 100L,
				"antes", Map.of("fechaHora", "2026-10-24T09:00:00-05:00"),
				"despues", Map.of("fechaHora", "2026-10-24T07:00:00-05:00")), null, usuario);
	}

	@Test
	void sinCambiosNoGuardaNiAudita() {
		guardadaHace(Duration.ofMinutes(5));
		// Mismo instante con otro offset: no es un cambio
		OffsetDateTime mismaFechaEnUtc = AHORA.minusHours(1).withOffsetSameInstant(java.time.ZoneOffset.UTC);

		IncidenciaResponse respuesta = incidenciaService.corregir(100L,
				new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, " " + DESCRIPCION, mismaFechaEnUtc), ID_USUARIO);

		assertEquals(100L, respuesta.idIncidencia());
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void justoAlLimiteDelPlazoTodaviaSePuedeCorregir() {
		guardadaHace(Duration.ofMinutes(15));

		incidenciaService.corregir(100L, new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, "Otra descripción", null),
				ID_USUARIO);

		verify(incidenciaDao).save(any());
	}

	@Test
	void fueraDelPlazoSeRechaza() {
		guardadaHace(Duration.ofMinutes(15).plusSeconds(1));

		ReglaNegocioException ex = assertThrows(ReglaNegocioException.class, () -> incidenciaService.corregir(100L,
				new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, "Otra descripción", null), ID_USUARIO));

		assertEquals("El plazo de corrección de 15 minutos terminó", ex.getMessage());
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void incidenciaDeOtroUsuarioRespondeComoInexistente() {
		Incidencia incidencia = guardadaHace(Duration.ofMinutes(1));
		Usuario otroUsuario = new Usuario();
		otroUsuario.setIdUsuario(8L);
		incidencia.setUsuario(otroUsuario);

		RecursoNoEncontradoException ex = assertThrows(RecursoNoEncontradoException.class,
				() -> incidenciaService.corregir(100L,
						new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, "Otra descripción", null), ID_USUARIO));

		assertEquals(IncidenciaService.INCIDENCIA_NO_EXISTE, ex.getMessage());
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void incidenciaInexistenteResponde404() {
		when(incidenciaDao.findById(999L)).thenReturn(Optional.empty());

		assertThrows(RecursoNoEncontradoException.class, () -> incidenciaService.corregir(999L,
				new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, DESCRIPCION, null), ID_USUARIO));
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void usuarioInactivoNoPuedeCorregir() {
		guardadaHace(Duration.ofMinutes(1));
		usuario.setEstadoActivo(false);

		assertThrows(CredencialesInvalidasException.class, () -> incidenciaService.corregir(100L,
				new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, "Otra descripción", null), ID_USUARIO));
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void vigilanteNoPuedeCambiarLaZona() {
		hacerVigilante(zona);
		guardadaHace(Duration.ofMinutes(1));

		ReglaNegocioException ex = assertThrows(ReglaNegocioException.class, () -> incidenciaService.corregir(100L,
				new IncidenciaRequest(2, ID_ROBO, ID_NIVEL, DESCRIPCION, null), ID_USUARIO));

		assertEquals(IncidenciaService.ZONA_NO_EDITABLE, ex.getMessage());
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void vigilanteReasignadoCorrigeEnLaZonaDeLaIncidencia() {
		Zona nuevaAsignada = new Zona();
		nuevaAsignada.setIdZona(2);
		hacerVigilante(nuevaAsignada);
		Incidencia incidencia = guardadaHace(Duration.ofMinutes(1));

		incidenciaService.corregir(100L, new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, "Otra descripción", null),
				ID_USUARIO);

		assertEquals(zona, incidencia.getZona());
		assertEquals("Otra descripción", incidencia.getDescripcion());
	}

	@Test
	void administradorPuedeCambiarLaZona() {
		Incidencia incidencia = guardadaHace(Duration.ofMinutes(1));
		Zona otraZona = new Zona();
		otraZona.setIdZona(2);
		otraZona.setNombreZona("Sede San Isidro");
		when(zonaDao.findById(2)).thenReturn(Optional.of(otraZona));

		incidenciaService.corregir(100L, new IncidenciaRequest(2, ID_ROBO, ID_NIVEL, DESCRIPCION, null), ID_USUARIO);

		assertEquals(otraZona, incidencia.getZona());
		verify(auditoriaService).registrar(AccionAuditoria.EDITAR_INCIDENCIA, Map.of(
				"idIncidencia", 100L, "antes", Map.of("idZona", ID_ZONA), "despues", Map.of("idZona", 2)), null, usuario);
	}

	@Test
	void correccionAplicaLasReglasDelRegistro() {
		guardadaHace(Duration.ofMinutes(1));

		ReglaNegocioException corta = assertThrows(ReglaNegocioException.class, () -> incidenciaService.corregir(100L,
				new IncidenciaRequest(ID_ZONA, ID_OTRO, ID_NIVEL, "Algo raro", null), ID_USUARIO));
		ReglaNegocioException futura = assertThrows(ReglaNegocioException.class, () -> incidenciaService.corregir(
				100L, new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, DESCRIPCION, AHORA.plusMinutes(10)), ID_USUARIO));
		nivel.setEstadoActivo(false);
		ReglaNegocioException inactivo = assertThrows(ReglaNegocioException.class, () -> incidenciaService.corregir(
				100L, new IncidenciaRequest(ID_ZONA, ID_ROBO, ID_NIVEL, "Otra descripción", null), ID_USUARIO));

		assertEquals("Para el tipo \"Otro\" la descripción debe tener al menos 20 caracteres", corta.getMessage());
		assertEquals("La fecha y hora de la incidencia no puede ser futura", futura.getMessage());
		assertEquals("El nivel de gravedad seleccionado no existe o está inactivo", inactivo.getMessage());
		verificarQueNoSeGuardoNiAudito();
	}

	@Test
	void mensajeDelPlazoUsaElValorConfigurado() {
		assertEquals("El plazo de corrección de 1 minuto terminó",
				IncidenciaService.plazoTerminado(Duration.ofMinutes(1)));
		assertEquals("El plazo de corrección de 90 segundos terminó",
				IncidenciaService.plazoTerminado(Duration.ofSeconds(90)));
	}

	@Test
	void plazoPorDefectoEsDeQuinceMinutosYNoAceptaCero() {
		assertEquals(Duration.ofMinutes(15), new IncidenciaProperties(null).plazoEdicion());
		assertThrows(IllegalStateException.class, () -> new IncidenciaProperties(Duration.ZERO));
	}

	// Incidencia 100 del usuario del test, registrada hace el tiempo indicado y ocurrida una hora antes de AHORA
	private Incidencia guardadaHace(Duration antiguedad) {
		Incidencia incidencia = new Incidencia();
		incidencia.setIdIncidencia(100L);
		incidencia.setFechaHora(AHORA.minusHours(1));
		incidencia.setDescripcion(DESCRIPCION);
		incidencia.setZona(zona);
		incidencia.setTipoEvento(robo);
		incidencia.setNivelGravedad(nivel);
		incidencia.setUsuario(usuario);
		// fecha_registro la asigna la BD: la entidad no tiene setter
		ReflectionTestUtils.setField(incidencia, "fechaRegistro", AHORA.minus(antiguedad));
		when(incidenciaDao.findById(100L)).thenReturn(Optional.of(incidencia));
		return incidencia;
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

	private void hacerVigilante(Zona asignada) {
		usuario.setRol(rol(UsuarioService.ROL_VIGILANTE));
		usuario.setZona(asignada);
	}

	private static Rol rol(String nombre) {
		Rol rol = new Rol();
		rol.setNombreRol(nombre);
		return rol;
	}

	private static TipoEvento tipo(short id, String nombre) {
		TipoEvento tipo = new TipoEvento();
		tipo.setIdTipoEvento(id);
		tipo.setNombreTipoEvento(nombre);
		return tipo;
	}

}
