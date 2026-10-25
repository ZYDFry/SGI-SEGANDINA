package com.segandina.sgi.dao;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.segandina.sgi.model.TipoEvento;

/**
 * DAO del catálogo {@code tipo_evento}.
 */
public interface TipoEventoDao extends JpaRepository<TipoEvento, Short> {

	/**
	 * Lista solo los tipos de evento activos (los dados de baja no se ofrecen en formularios).
	 *
	 * @return tipos de evento con {@code estado_activo = true}
	 */
	List<TipoEvento> findByEstadoActivoTrue();

	/**
	 * Lista los tipos de evento activos ordenados por nombre, para el formulario de incidencias.
	 *
	 * @return tipos activos ordenados por {@code nombre_tipo_evento} ascendente
	 */
	List<TipoEvento> findByEstadoActivoTrueOrderByNombreTipoEventoAsc();

	/**
	 * Lista todos los tipos de evento, activos o no, ordenados por nombre (administración de RF-09).
	 *
	 * @return tipos ordenados por {@code nombre_tipo_evento} ascendente
	 */
	List<TipoEvento> findAllByOrderByNombreTipoEventoAsc();

	/**
	 * Indica si ya hay un tipo de evento con ese nombre, sin distinguir mayúsculas (alta).
	 *
	 * @param nombreTipoEvento nombre a comprobar
	 * @return {@code true} si el nombre ya está en uso
	 */
	boolean existsByNombreTipoEventoIgnoreCase(String nombreTipoEvento);

	/**
	 * Indica si otro tipo de evento (distinto de {@code idTipoEvento}) ya usa ese nombre, sin distinguir
	 * mayúsculas (edición).
	 *
	 * @param nombreTipoEvento nombre a comprobar
	 * @param idTipoEvento     tipo que se está editando
	 * @return {@code true} si otro tipo ya usa el nombre
	 */
	boolean existsByNombreTipoEventoIgnoreCaseAndIdTipoEventoNot(String nombreTipoEvento, Short idTipoEvento);

}
