package com.segandina.sgi.dao;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.segandina.sgi.model.Usuario;

/**
 * DAO de la tabla {@code usuario}. No se usa borrado físico: la baja es lógica ({@code estado_activo}).
 */
public interface UsuarioDao extends JpaRepository<Usuario, Long> {

	/**
	 * Busca un usuario por DNI (activo o no). Base del login (RF-01).
	 *
	 * @param dni DNI de 8 dígitos
	 * @return el usuario, o vacío si el DNI no está registrado
	 */
	Optional<Usuario> findByDni(String dni);

	/**
	 * Indica si ya hay un usuario con ese DNI (para evitar duplicados en RF-02).
	 *
	 * @param dni DNI de 8 dígitos
	 * @return {@code true} si el DNI ya existe
	 */
	boolean existsByDni(String dni);

}
