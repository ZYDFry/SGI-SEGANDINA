package com.segandina.sgi.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.junit.jupiter.api.Test;

import com.segandina.sgi.dao.AuditoriaDao;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/**
 * Verifica el mapeo de entidades por reflexión, sin levantar Spring ni conectarse a la BD.
 */
class MapeoEntidadesTest {

	@Test
	void cadaEntidadApuntaASuTabla() {
		Map<Class<?>, String> esperadas = Map.of(
				Rol.class, "rol",
				Zona.class, "zona",
				TipoEvento.class, "tipo_evento",
				NivelGravedad.class, "nivel_gravedad",
				Usuario.class, "usuario",
				Incidencia.class, "incidencia",
				Auditoria.class, "auditoria");

		esperadas.forEach((clase, tabla) -> {
			assertNotNull(clase.getAnnotation(Entity.class), clase.getSimpleName() + " sin @Entity");
			Table anotacion = clase.getAnnotation(Table.class);
			assertNotNull(anotacion, clase.getSimpleName() + " sin @Table");
			assertEquals(tabla, anotacion.name());
		});
	}

	@Test
	void auditoriaEsInmutable() {
		assertNotNull(Auditoria.class.getAnnotation(Immutable.class));
		boolean tieneSetters = Arrays.stream(Auditoria.class.getMethods())
				.anyMatch(m -> m.getName().startsWith("set"));
		assertFalse(tieneSetters, "Auditoria no debe exponer setters");
	}

	@Test
	void auditoriaDaoNoPermiteBorrar() {
		boolean tieneBorrado = Arrays.stream(AuditoriaDao.class.getMethods())
				.map(Method::getName)
				.anyMatch(n -> n.startsWith("delete"));
		assertFalse(tieneBorrado, "AuditoriaDao no debe exponer métodos delete");
	}

	@Test
	void incidenciaNoPermiteAsignarFechaRegistro() {
		boolean tieneSetter = Arrays.stream(Incidencia.class.getMethods())
				.filter(m -> Modifier.isPublic(m.getModifiers()))
				.anyMatch(m -> m.getName().equals("setFechaRegistro"));
		assertFalse(tieneSetter, "fecha_registro la asigna la BD");
	}

	@Test
	void columnasDniSeMapeanComoChar8() throws NoSuchFieldException {
		for (Field campo : List.of(Usuario.class.getDeclaredField("dni"),
				Auditoria.class.getDeclaredField("dniIntentado"))) {
			JdbcTypeCode tipo = campo.getAnnotation(JdbcTypeCode.class);
			assertNotNull(tipo, campo.getName() + " sin @JdbcTypeCode");
			assertEquals(SqlTypes.CHAR, tipo.value(), campo.getName() + " debe mapearse como CHAR (bpchar)");
			assertEquals(8, campo.getAnnotation(Column.class).length());
		}
	}

	@Test
	void usuarioNuevoEstaActivoPorDefecto() {
		assertTrue(new Usuario().getEstadoActivo());
	}

	@Test
	void catalogoNuevoEstaActivoPorDefecto() {
		assertTrue(new Zona().getEstadoActivo());
		assertTrue(new TipoEvento().getEstadoActivo());
		assertTrue(new NivelGravedad().getEstadoActivo());
	}

}
