package com.segandina.sgi.dao;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.segandina.sgi.model.Rol;

/**
 * DAO de la tabla {@code rol}.
 */
public interface RolDao extends JpaRepository<Rol, Short> {

	/**
	 * Busca un rol por su nombre exacto.
	 *
	 * @param nombreRol nombre del rol, p. ej. {@code "Administrador"}
	 * @return el rol, o vacío si no existe
	 */
	Optional<Rol> findByNombreRol(String nombreRol);

}
