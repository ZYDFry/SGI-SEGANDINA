package com.segandina.sgi.dao;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.segandina.sgi.model.NivelGravedad;

/**
 * DAO del catálogo {@code nivel_gravedad}.
 */
public interface NivelGravedadDao extends JpaRepository<NivelGravedad, Short> {

	/**
	 * Lista los niveles de gravedad de menos a más grave.
	 *
	 * @return niveles ordenados por {@code orden} ascendente
	 */
	List<NivelGravedad> findAllByOrderByOrdenAsc();

	/**
	 * Lista solo los niveles de gravedad activos (los dados de baja no se ofrecen en formularios).
	 *
	 * @return niveles con {@code estado_activo = true}
	 */
	List<NivelGravedad> findByEstadoActivoTrue();

	/**
	 * Lista los niveles de gravedad activos de menos a más grave, para el formulario de incidencias.
	 *
	 * @return niveles activos ordenados por {@code orden} ascendente
	 */
	List<NivelGravedad> findByEstadoActivoTrueOrderByOrdenAsc();

}
