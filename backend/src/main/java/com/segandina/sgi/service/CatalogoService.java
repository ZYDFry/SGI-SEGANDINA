package com.segandina.sgi.service;

import java.util.List;

import com.segandina.sgi.dto.response.CatalogosFiltroResponse;
import com.segandina.sgi.dto.response.NivelGravedadResponse;
import com.segandina.sgi.dto.response.RolResponse;
import com.segandina.sgi.dto.response.TipoEventoResponse;
import com.segandina.sgi.dto.response.ZonaResponse;

/**
 * Consulta de catálogos. Los de los formularios solo devuelven registros activos: los dados de baja siguen en la BD
 * (las incidencias antiguas los referencian), pero ya no se ofrecen. Los de los filtros
 * ({@link #listarParaFiltros()}) incluyen también los inactivos.
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

	/**
	 * Lista los roles del sistema, para el formulario de usuarios (RF-02).
	 *
	 * @return roles ordenados por id
	 */
	List<RolResponse> listarRoles();

	/**
	 * Lista zonas, tipos de evento y niveles de gravedad, activos e inactivos, para filtrar el historial y el
	 * dashboard por catálogos ya dados de baja.
	 *
	 * @return los tres catálogos completos, cada registro con su {@code estadoActivo}
	 */
	CatalogosFiltroResponse listarParaFiltros();

}
