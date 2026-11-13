package com.segandina.sgi.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;

import com.segandina.sgi.config.RelojConfig;
import com.segandina.sgi.dao.AuditoriaDao;
import com.segandina.sgi.dao.TablaAuditoriaH2;
import com.segandina.sgi.dto.request.AuditoriaFiltro;
import com.segandina.sgi.dto.request.Periodo;
import com.segandina.sgi.dto.response.AccionAuditoriaResponse;
import com.segandina.sgi.dto.response.AuditoriaResponse;
import com.segandina.sgi.exception.ParametroInvalidoException;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;

import jakarta.persistence.EntityManager;

/**
 * Pruebas de la consulta de auditoría (RF-08) contra H2 en memoria (modo PostgreSQL), con el reloj fijo el
 * 24/10/2026 a las 12:00 de Lima. Cada test corre en una transacción que se revierte al final.
 */
@DataJpaTest(properties = {
		"spring.datasource.url=jdbc:h2:mem:auditoria;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH",
		"spring.datasource.username=sa",
		"spring.datasource.password=",
		"spring.jpa.hibernate.ddl-auto=create-drop" })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({ AuditoriaServiceImpl.class, AuditoriaServiceImplTest.RelojFijo.class })
class AuditoriaServiceImplTest {

	@TestConfiguration
	static class RelojFijo {
		@Bean
		Clock reloj() {
			return Clock.fixed(Instant.parse("2026-10-24T17:00:00Z"), RelojConfig.ZONA_LIMA);
		}
	}

	private static final AuditoriaFiltro SIN_FILTROS = new AuditoriaFiltro(null, null, null, null, null, null);

	@Autowired
	private AuditoriaServiceImpl auditoriaService;

	@Autowired
	private AuditoriaDao auditoriaDao;

	@Autowired
	private EntityManager em;

	private Long idAdmin;
	private Long idVigilante;

	@BeforeEach
	void cargarAuditoria() {
		TablaAuditoriaH2.recrear(em);
		Rol rol = new Rol();
		rol.setNombreRol("Administrador");
		em.persist(rol);
		idAdmin = usuario(rol, "11111111", "Ana", "Torres", null);
		idVigilante = usuario(rol, "22222222", "Luis", "Rojas", "Díaz");

		// Se insertan en este orden, así que el id crece de 1 a 6
		insertar("LOGIN_OK", "2026-10-24 08:00:00-05:00", idAdmin, null, null);
		insertar("LOGIN_FALLIDO", "2026-10-24 09:00:00-05:00", null, "99999999", "{\"motivo\":\"DNI_NO_REGISTRADO\"}");
		insertar("REGISTRAR_INCIDENCIA", "2026-10-24 09:00:00-05:00", idVigilante, null, "{\"idIncidencia\":7}");
		insertar("LOGIN_FALLIDO", "2026-10-20 10:00:00-05:00", idVigilante, "22222222",
				"{\"motivo\":\"CONTRASENA_INCORRECTA\"}");
		// Hace 30 días: fuera de los últimos 30 días (que empiezan el 25/09)
		insertar("CREAR_USUARIO", "2026-09-24 10:00:00-05:00", idAdmin, null, "{\"id\":2}");
		// Primer instante del día en Lima: entra en HOY
		insertar("LOGIN_OK", "2026-10-24 00:00:00-05:00", idVigilante, null, null);
	}

	@Test
	void sinFiltrosUsaLosUltimos30DiasDelMasRecienteAlMasAntiguo() {
		Page<AuditoriaResponse> pagina = auditoriaService.buscar(SIN_FILTROS, 0, 20);

		assertEquals(5, pagina.getTotalElements());
		// 3 y 2 tienen la misma hora: desempata el id descendente
		assertEquals(List.of("REGISTRAR_INCIDENCIA", "LOGIN_FALLIDO", "LOGIN_OK", "LOGIN_OK", "LOGIN_FALLIDO"),
				acciones(pagina));
		assertEquals(ZoneOffset.ofHours(-5), pagina.getContent().get(0).fechaHora().getOffset());
	}

	@Test
	void filtraPorPeriodo() {
		Page<AuditoriaResponse> hoy = auditoriaService.buscar(filtro(Periodo.HOY, null, null), 0, 20);
		assertEquals(4, hoy.getTotalElements());

		Page<AuditoriaResponse> dia = auditoriaService.buscar(new AuditoriaFiltro(Periodo.PERSONALIZADO,
				LocalDate.of(2026, 9, 24), LocalDate.of(2026, 9, 24), null, null, null), 0, 20);
		assertEquals(List.of("CREAR_USUARIO"), acciones(dia));
	}

	@Test
	void filtraPorAccion() {
		Page<AuditoriaResponse> pagina = auditoriaService.buscar(
				filtro(null, AccionAuditoria.LOGIN_FALLIDO, null), 0, 20);
		assertEquals(2, pagina.getTotalElements());
		assertEquals(List.of("LOGIN_FALLIDO", "LOGIN_FALLIDO"), acciones(pagina));
	}

	@Test
	void filtraPorUsuario() {
		Page<AuditoriaResponse> pagina = auditoriaService.buscar(
				new AuditoriaFiltro(null, null, null, null, idVigilante, null), 0, 20);
		assertEquals(3, pagina.getTotalElements());
		pagina.forEach(fila -> assertEquals(idVigilante, fila.usuario().idUsuario()));
	}

	@Test
	void filtraPorDniExactoOPorPrefijoEnUsuarioYDniIntentado() {
		assertEquals(3, auditoriaService.buscar(conQ("22222222"), 0, 20).getTotalElements());
		assertEquals(1, auditoriaService.buscar(conQ("1111"), 0, 20).getTotalElements());

		Page<AuditoriaResponse> intentado = auditoriaService.buscar(conQ("999"), 0, 20);
		assertEquals(List.of("LOGIN_FALLIDO"), acciones(intentado));
		assertEquals("99999999", intentado.getContent().get(0).dniIntentado());

		assertEquals(0, auditoriaService.buscar(conQ("3"), 0, 20).getTotalElements());
		// Vacío equivale a no filtrar
		assertEquals(5, auditoriaService.buscar(conQ(""), 0, 20).getTotalElements());
	}

	@Test
	void combinaFiltros() {
		Page<AuditoriaResponse> fallidosDelVigilante = auditoriaService.buscar(
				new AuditoriaFiltro(null, null, null, AccionAuditoria.LOGIN_FALLIDO, null, "2222"), 0, 20);
		assertEquals(1, fallidosDelVigilante.getTotalElements());
		assertEquals("CONTRASENA_INCORRECTA", fallidosDelVigilante.getContent().get(0).detalle().get("motivo"));

		Page<AuditoriaResponse> hoyDelVigilante = auditoriaService.buscar(
				new AuditoriaFiltro(Periodo.HOY, null, null, null, idVigilante, null), 0, 20);
		assertEquals(List.of("REGISTRAR_INCIDENCIA", "LOGIN_OK"), acciones(hoyDelVigilante));
	}

	@Test
	void usuarioInexistenteDevuelveSoloElDniIntentado() {
		AuditoriaResponse fila = auditoriaService.buscar(conQ("99999999"), 0, 20).getContent().get(0);

		assertNull(fila.usuario());
		assertEquals("99999999", fila.dniIntentado());
		assertEquals("Inicio de sesión fallido", fila.accionEtiqueta());
		assertEquals("DNI_NO_REGISTRADO", fila.detalle().get("motivo"));
	}

	@Test
	void usuarioConocidoTraeIdDniYNombreCompleto() {
		AuditoriaResponse fila = auditoriaService.buscar(SIN_FILTROS, 0, 20).getContent().get(0);

		assertEquals(idVigilante, fila.usuario().idUsuario());
		assertEquals("22222222", fila.usuario().dni());
		assertEquals("Luis Rojas Díaz", fila.usuario().nombreCompleto());
		assertEquals(7, ((Number) fila.detalle().get("idIncidencia")).intValue());
	}

	@Test
	void paginaLosResultados() {
		Page<AuditoriaResponse> segunda = auditoriaService.buscar(SIN_FILTROS, 1, 2);

		assertEquals(5, segunda.getTotalElements());
		assertEquals(3, segunda.getTotalPages());
		assertEquals(1, segunda.getNumber());
		assertEquals(2, segunda.getSize());
		assertEquals(List.of("LOGIN_OK", "LOGIN_OK"), acciones(segunda));
	}

	@Test
	void parametrosInvalidosIndicanElCampo() {
		assertEquals("desde", assertThrows(ParametroInvalidoException.class, () -> auditoriaService.buscar(
				new AuditoriaFiltro(Periodo.PERSONALIZADO, LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 1),
						null, null, null), 0, 20)).getCampo());
		assertEquals("hasta", assertThrows(ParametroInvalidoException.class, () -> auditoriaService.buscar(
				new AuditoriaFiltro(Periodo.PERSONALIZADO, LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 2),
						null, null, null), 0, 20)).getCampo());
		assertEquals("size", assertThrows(ParametroInvalidoException.class,
				() -> auditoriaService.buscar(SIN_FILTROS, 0, 101)).getCampo());
		assertEquals("page", assertThrows(ParametroInvalidoException.class,
				() -> auditoriaService.buscar(SIN_FILTROS, -1, 20)).getCampo());
	}

	@Test
	void consultarNoGeneraRegistrosDeAuditoria() {
		long antes = auditoriaDao.count();
		auditoriaService.buscar(SIN_FILTROS, 0, 20);
		auditoriaService.acciones();
		em.flush();
		assertEquals(antes, auditoriaDao.count());
	}

	@Test
	void accionesTraeTodosLosValoresConEtiqueta() {
		List<AccionAuditoriaResponse> acciones = auditoriaService.acciones();

		assertEquals(AccionAuditoria.values().length, acciones.size());
		assertEquals(new AccionAuditoriaResponse("LOGIN_OK", "Inicio de sesión correcto"), acciones.get(0));
		acciones.forEach(accion -> assertEquals(false, accion.etiqueta().isBlank()));
	}

	private static AuditoriaFiltro filtro(Periodo periodo, AccionAuditoria accion, String q) {
		return new AuditoriaFiltro(periodo, null, null, accion, null, q);
	}

	private static AuditoriaFiltro conQ(String q) {
		return filtro(null, null, q);
	}

	private static List<String> acciones(Page<AuditoriaResponse> pagina) {
		return pagina.getContent().stream().map(AuditoriaResponse::accion).toList();
	}

	private Long usuario(Rol rol, String dni, String nombres, String paterno, String materno) {
		Usuario usuario = new Usuario();
		usuario.setDni(dni);
		usuario.setNombres(nombres);
		usuario.setApellidoPaterno(paterno);
		usuario.setApellidoMaterno(materno);
		usuario.setContrasena("hash");
		usuario.setRol(rol);
		em.persist(usuario);
		return usuario.getIdUsuario();
	}

	private void insertar(String accion, String fechaHora, Long idUsuario, String dniIntentado, String detalle) {
		TablaAuditoriaH2.insertar(em, accion, fechaHora, idUsuario, dniIntentado, detalle);
	}

}
