package com.segandina.sgi.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.List;

import org.hibernate.Hibernate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.data.domain.PageRequest;

import com.segandina.sgi.dto.request.AuditoriaFiltro;
import com.segandina.sgi.dto.request.RangoFechas;
import com.segandina.sgi.model.Auditoria;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;

import jakarta.persistence.EntityManager;

/**
 * Pruebas de la consulta de {@link AuditoriaDao} contra H2 en memoria (modo PostgreSQL): carga del usuario en la
 * misma consulta, orden y bordes del día de Lima.
 */
@DataJpaTest(properties = {
		"spring.datasource.url=jdbc:h2:mem:auditoriadao;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH",
		"spring.datasource.username=sa",
		"spring.datasource.password=",
		"spring.jpa.hibernate.ddl-auto=create-drop" })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AuditoriaDaoTest {

	private static final RangoFechas DIA_24 = new RangoFechas(LocalDate.of(2026, 10, 24), LocalDate.of(2026, 10, 24));

	@Autowired
	private AuditoriaDao auditoriaDao;

	@Autowired
	private EntityManager em;

	@BeforeEach
	void cargar() {
		TablaAuditoriaH2.recrear(em);
		Rol rol = new Rol();
		rol.setNombreRol("Vigilante");
		em.persist(rol);
		Usuario usuario = new Usuario();
		usuario.setDni("22222222");
		usuario.setNombres("Luis");
		usuario.setApellidoPaterno("Rojas");
		usuario.setContrasena("hash");
		usuario.setRol(rol);
		em.persist(usuario);

		TablaAuditoriaH2.insertar(em, "LOGIN_OK", "2026-10-24 00:00:00-05:00", usuario.getIdUsuario(), null, null);
		TablaAuditoriaH2.insertar(em, "LOGIN_FALLIDO", "2026-10-24 23:59:59-05:00", null, "99999999",
				"{\"motivo\":\"DNI_NO_REGISTRADO\"}");
		// 00:00 del día siguiente en Lima: fuera del rango (intervalo semiabierto)
		TablaAuditoriaH2.insertar(em, "LOGIN_OK", "2026-10-25 00:00:00-05:00", usuario.getIdUsuario(), null, null);
		em.flush();
		em.clear();
	}

	@Test
	void cargaElUsuarioEnLaMismaConsultaYOrdenaDescendente() {
		List<Auditoria> filas = auditoriaDao.findAll(AuditoriaDao.conFiltros(DIA_24, null),
				PageRequest.of(0, 10, AuditoriaDao.ORDEN_AUDITORIA)).getContent();

		assertEquals(2, filas.size());
		assertEquals("LOGIN_FALLIDO", filas.get(0).getAccionRealizada());
		assertNull(filas.get(0).getUsuario());
		assertEquals("LOGIN_OK", filas.get(1).getAccionRealizada());
		assertTrue(Hibernate.isInitialized(filas.get(1).getUsuario()));
		assertEquals("22222222", filas.get(1).getUsuario().getDni());
	}

	@Test
	void qBuscaPorPrefijoEnElDniDelUsuarioOEnElIntentado() {
		assertEquals(1, auditoriaDao.findAll(AuditoriaDao.conFiltros(DIA_24, conQ("2222")),
				PageRequest.of(0, 10)).getTotalElements());
		assertEquals(1, auditoriaDao.findAll(AuditoriaDao.conFiltros(DIA_24, conQ("99999999")),
				PageRequest.of(0, 10)).getTotalElements());
	}

	private static AuditoriaFiltro conQ(String q) {
		return new AuditoriaFiltro(null, null, null, null, null, q);
	}

}
