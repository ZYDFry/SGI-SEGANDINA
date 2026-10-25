package com.segandina.sgi.dao;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.data.repository.Repository;

import com.segandina.sgi.model.DespliegueZona;

/**
 * DAO de la vista {@code v_despliegue_por_zona} (RF-07). Extiende {@link Repository} para exponer solo
 * lectura.
 */
public interface DespliegueZonaDao extends Repository<DespliegueZona, Integer> {

	/**
	 * Lista el despliegue de todas las zonas activas (las que no tienen vigilantes vienen con 0).
	 *
	 * @param orden orden del listado
	 * @return una fila por zona activa
	 */
	List<DespliegueZona> findAll(Sort orden);

}
