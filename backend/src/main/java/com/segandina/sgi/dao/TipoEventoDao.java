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

}
