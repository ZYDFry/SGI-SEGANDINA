package com.segandina.sgi.dao;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.segandina.sgi.model.Zona;

/**
 * DAO de la tabla {@code zona}.
 */
public interface ZonaDao extends JpaRepository<Zona, Integer> {

	/**
	 * Busca una zona por su nombre exacto.
	 *
	 * @param nombreZona nombre de la zona
	 * @return la zona, o vacío si no existe
	 */
	Optional<Zona> findByNombreZona(String nombreZona);

}
