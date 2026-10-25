package com.segandina.sgi.service.impl;

import java.util.LinkedHashMap;
import java.util.Map;

import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.exception.CredencialesInvalidasException;
import com.segandina.sgi.model.Usuario;

/**
 * Operaciones comunes de los servicios de administración (usuarios y catálogos).
 */
final class SoporteServicio {

	private SoporteServicio() {
	}

	/**
	 * Usuario que realiza la acción, tomado del {@code sub} del token. Si fue eliminado o desactivado después
	 * de emitir el token, la petición se rechaza con 401.
	 */
	static Usuario actor(UsuarioDao usuarioDao, Long idUsuario) {
		return usuarioDao.findById(idUsuario)
				.filter(u -> Boolean.TRUE.equals(u.getEstadoActivo()))
				.orElseThrow(CredencialesInvalidasException::new);
	}

	/** Recorta el texto; devuelve {@code null} si es nulo o queda vacío (campos opcionales). */
	static String opcional(String valor) {
		if (valor == null || valor.isBlank()) {
			return null;
		}
		return valor.trim();
	}

	/**
	 * Detalle de auditoría {@code { <claveId>: id, antes: {...}, despues: {...} }}. Usa {@link LinkedHashMap}
	 * porque admite valores nulos y conserva el orden de las claves en el JSON.
	 */
	static Map<String, Object> cambio(String claveId, Object id, Map<String, Object> antes,
			Map<String, Object> despues) {
		Map<String, Object> detalle = new LinkedHashMap<>();
		detalle.put(claveId, id);
		if (antes != null) {
			detalle.put("antes", antes);
		}
		detalle.put("despues", despues);
		return detalle;
	}

}
