package com.segandina.sgi.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.request.RangoFechas;
import com.segandina.sgi.model.Incidencia;
import com.segandina.sgi.model.NivelGravedad;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.TipoEvento;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.model.Zona;

import jakarta.persistence.EntityManager;

/**
 * Pruebas de las consultas del historial (RF-04) y del dashboard (RF-05) contra H2 en memoria (modo
 * PostgreSQL), con incidencias justo en los bordes del día de Lima. Cada test se revierte al final.
 */
@DataJpaTest(properties = {
		"spring.datasource.url=jdbc:h2:mem:incidencias;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH",
		"spring.datasource.username=sa",
		"spring.datasource.password=",
		"spring.jpa.hibernate.ddl-auto=create-drop" })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class IncidenciaDaoTest {

	private static final RangoFechas DIA_24 = new RangoFechas(LocalDate.of(2026, 10, 24), LocalDate.of(2026, 10, 24));
	private static final RangoFechas SEMANA = new RangoFechas(LocalDate.of(2026, 10, 18), LocalDate.of(2026, 10, 24));
	private static final IncidenciaFiltro SIN_FILTROS = new IncidenciaFiltro(null, null, null, null, null, null);

	@Autowired
	private IncidenciaDao incidenciaDao;

	@Autowired
	private EntityManager entityManager;

	private Zona miraflores;
	private Zona callao;
	private TipoEvento robo;
	private TipoEvento alerta;
	private NivelGravedad baja;
	private NivelGravedad alta;

	@BeforeEach
	void cargarIncidencias() {
		// En la BD real fecha_registro tiene DEFAULT now(); el esquema que genera Hibernate no lo trae
		entityManager.createNativeQuery("ALTER TABLE incidencia ALTER COLUMN fecha_registro SET DEFAULT CURRENT_TIMESTAMP")
				.executeUpdate();

		Rol rol = new Rol();
		rol.setNombreRol("Vigilante");
		persistir(rol);
		miraflores = zona("Sede Miraflores");
		callao = zona("Almacén Callao");
		robo = tipo("Robo");
		alerta = tipo("Alerta");
		baja = nivel("Baja", 1);
		alta = nivel("Alta", 3);
		Usuario vigilante = new Usuario();
		vigilante.setDni("22222222");
		vigilante.setNombres("Luis");
		vigilante.setApellidoPaterno("Rojas");
		vigilante.setContrasena("hash");
		vigilante.setRol(rol);
		persistir(vigilante);

		// Bordes del 24-oct en Lima (UTC-5)
		incidencia("2026-10-23T23:59:59-05:00", miraflores, robo, baja, vigilante);  // fuera del 24, dentro de la semana
		incidencia("2026-10-24T00:00:00-05:00", miraflores, robo, alta, vigilante);  // primer instante: dentro
		incidencia("2026-10-24T23:59:59-05:00", callao, alerta, baja, vigilante);    // último instante: dentro
		incidencia("2026-10-25T03:30:00Z", miraflores, alerta, alta, vigilante);     // 22:30 en Lima: dentro
		incidencia("2026-10-25T05:00:00Z", callao, robo, baja, vigilante);           // 00:00 del 25 en Lima: fuera
		incidencia("2026-10-20T12:00:00-05:00", callao, robo, alta, vigilante);      // dentro de la semana
		entityManager.flush();
		entityManager.clear();
	}

	@Test
	void historialRespetaLosBordesDelDiaYOrdenaDescendente() {
		List<OffsetDateTime> fechas = incidenciaDao.findAll(IncidenciaDao.conFiltros(DIA_24, SIN_FILTROS),
				PageRequest.of(0, 20, Sort.by(Sort.Order.desc("fechaHora")))).map(Incidencia::getFechaHora).getContent();

		assertEquals(3, fechas.size());
		assertEquals(OffsetDateTime.parse("2026-10-25T04:59:59Z").toInstant(), fechas.get(0).toInstant());
		assertEquals(OffsetDateTime.parse("2026-10-25T03:30:00Z").toInstant(), fechas.get(1).toInstant());
		assertEquals(OffsetDateTime.parse("2026-10-24T05:00:00Z").toInstant(), fechas.get(2).toInstant());
	}

	@Test
	void historialCombinaZonaNivelYTipo() {
		IncidenciaFiltro filtro = new IncidenciaFiltro(null, null, null, miraflores.getIdZona(),
				alta.getIdNivelGravedad(), alerta.getIdTipoEvento());

		assertEquals(1, incidenciaDao.count(IncidenciaDao.conFiltros(DIA_24, filtro)));
	}

	@Test
	void conteosAgrupadosDeMayorAMenor() {
		assertEquals(List.of(
				new ConteoAgrupado(miraflores.getIdZona().longValue(), "Sede Miraflores", 3),
				new ConteoAgrupado(callao.getIdZona().longValue(), "Almacén Callao", 2)),
				incidenciaDao.contarPorZona(SEMANA, SIN_FILTROS));
		assertEquals(List.of(
				new ConteoAgrupado(robo.getIdTipoEvento().longValue(), "Robo", 3),
				new ConteoAgrupado(alerta.getIdTipoEvento().longValue(), "Alerta", 2)),
				incidenciaDao.contarPorTipo(SEMANA, SIN_FILTROS));
		assertEquals(List.of(new ConteoAgrupado(alta.getIdNivelGravedad().longValue(), "Alta", 3)),
				incidenciaDao.contarPorNivel(SEMANA,
						new IncidenciaFiltro(null, null, null, null, alta.getIdNivelGravedad(), null)));
	}

	@Test
	void conteoPorDiaAgrupaEnHoraDeLima() {
		assertEquals(List.of(
				new ConteoDiario(LocalDate.of(2026, 10, 20), 1),
				new ConteoDiario(LocalDate.of(2026, 10, 23), 1),
				new ConteoDiario(LocalDate.of(2026, 10, 24), 3)),
				incidenciaDao.contarPorDia(SEMANA, SIN_FILTROS));
		assertEquals(List.of(
				new ConteoDiario(LocalDate.of(2026, 10, 23), 1),
				new ConteoDiario(LocalDate.of(2026, 10, 24), 2)),
				incidenciaDao.contarPorDia(SEMANA,
						new IncidenciaFiltro(null, null, null, miraflores.getIdZona(), null, null)));
	}

	@Test
	void rangoSinIncidenciasDevuelveListasVacias() {
		RangoFechas vacio = new RangoFechas(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));

		assertEquals(List.of(), incidenciaDao.contarPorDia(vacio, SIN_FILTROS));
		assertEquals(List.of(), incidenciaDao.contarPorZona(vacio, SIN_FILTROS));
		assertEquals(0, incidenciaDao.count(IncidenciaDao.conFiltros(vacio, SIN_FILTROS)));
	}

	private Zona zona(String nombre) {
		Zona zona = new Zona();
		zona.setNombreZona(nombre);
		zona.setDepartamento("Lima");
		zona.setProvincia("Lima");
		zona.setDistrito("Lima");
		return persistir(zona);
	}

	private TipoEvento tipo(String nombre) {
		TipoEvento tipo = new TipoEvento();
		tipo.setNombreTipoEvento(nombre);
		return persistir(tipo);
	}

	private NivelGravedad nivel(String nombre, int orden) {
		NivelGravedad nivel = new NivelGravedad();
		nivel.setNombreNivel(nombre);
		nivel.setOrden((short) orden);
		return persistir(nivel);
	}

	private void incidencia(String fechaHora, Zona zona, TipoEvento tipo, NivelGravedad nivel, Usuario usuario) {
		Incidencia incidencia = new Incidencia();
		incidencia.setFechaHora(OffsetDateTime.parse(fechaHora));
		incidencia.setDescripcion("Prueba");
		incidencia.setZona(zona);
		incidencia.setTipoEvento(tipo);
		incidencia.setNivelGravedad(nivel);
		incidencia.setUsuario(usuario);
		persistir(incidencia);
	}

	private <T> T persistir(T entidad) {
		entityManager.persist(entidad);
		return entidad;
	}

}
