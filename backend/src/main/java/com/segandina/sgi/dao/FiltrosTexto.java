package com.segandina.sgi.dao;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;

/**
 * Utilidades para armar filtros de texto en las búsquedas con {@code Specification} (zonas y usuarios).
 */
final class FiltrosTexto {

	private FiltrosTexto() {
	}

	/** Recorta el texto; devuelve {@code null} si queda vacío. */
	static String limpiar(String valor) {
		if (valor == null || valor.isBlank()) {
			return null;
		}
		return valor.trim();
	}

	/** {@code lower(campo) LIKE %texto%} escapando los comodines del texto. */
	static Predicate contiene(CriteriaBuilder cb, Expression<String> campo, String texto) {
		String escapado = texto.toLowerCase()
				.replace("\\", "\\\\")
				.replace("%", "\\%")
				.replace("_", "\\_");
		return cb.like(cb.lower(campo), "%" + escapado + "%", '\\');
	}

	/** {@code lower(campo) = lower(texto)}. */
	static Predicate igualSinMayusculas(CriteriaBuilder cb, Expression<String> campo, String texto) {
		return cb.equal(cb.lower(campo), texto.toLowerCase());
	}

}
