package com.segandina.sgi.dao;

import java.util.List;
import java.util.Optional;

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

	/**
	 * Busca el nivel que ocupa un orden (la columna {@code orden} es única).
	 *
	 * @param orden posición en la escala de gravedad
	 * @return el nivel, o vacío si el orden está libre
	 */
	Optional<NivelGravedad> findByOrden(Short orden);

	/**
	 * Indica si otro nivel (distinto de {@code idNivelGravedad}) ya usa ese nombre, sin distinguir mayúsculas.
	 *
	 * @param nombreNivel     nombre a comprobar
	 * @param idNivelGravedad nivel que se está editando
	 * @return {@code true} si otro nivel ya usa el nombre
	 */
	boolean existsByNombreNivelIgnoreCaseAndIdNivelGravedadNot(String nombreNivel, Short idNivelGravedad);

}
