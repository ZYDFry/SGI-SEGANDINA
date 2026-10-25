package com.segandina.sgi.dto.response;

import com.segandina.sgi.model.Rol;

/**
 * Rol para el selector del formulario de usuarios (RF-02).
 *
 * @param idRol     id del rol
 * @param nombreRol nombre (Administrador, Supervisor o Vigilante)
 */
public record RolResponse(Short idRol, String nombreRol) {

	/**
	 * Construye la respuesta a partir de la entidad.
	 *
	 * @param rol entidad origen
	 * @return el rol como DTO
	 */
	public static RolResponse desde(Rol rol) {
		return new RolResponse(rol.getIdRol(), rol.getNombreRol());
	}

}
