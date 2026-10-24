package com.segandina.sgi.service;

import java.util.List;

import com.segandina.sgi.dto.response.NivelGravedadResponse;
import com.segandina.sgi.dto.response.TipoEventoResponse;
import com.segandina.sgi.dto.response.ZonaResponse;

/**
 * Consulta de catálogos para los formularios. Solo devuelve registros activos: los dados de baja
 * siguen en la BD (las incidencias antiguas los referencian), pero ya no se ofrecen.
 */
public interface CatalogoService {

	/**
	 * Lista las zonas activas.
	 *
	 * @return zonas con {@code estado_activo = true}, ordenadas por nombre
	 */
	List<ZonaResponse> listarZonasActivas();

	/**
	 * Lista los tipos de evento activos.
	 *
	 * @return tipos con {@code estado_activo = true}, ordenados por nombre
	 */
	List<TipoEventoResponse> listarTiposEventoActivos();

	/**
	 * Lista los niveles de gravedad activos.
	 *
	 * @return niveles con {@code estado_activo = true}, de menos a más grave
	 */
	List<NivelGravedadResponse> listarNivelesGravedadActivos();

}
