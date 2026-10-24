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

}
