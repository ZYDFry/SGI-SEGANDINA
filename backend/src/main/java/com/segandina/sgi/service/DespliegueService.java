package com.segandina.sgi.service;

import java.util.List;

import com.segandina.sgi.dto.response.VigilanteZonaResponse;
import com.segandina.sgi.dto.response.ZonaResponse;

/**
 * Consultas de la pantalla de despliegue de una zona (RF-07), para el Administrador y el Supervisor. La gestión
 * completa de zonas y usuarios sigue siendo solo del Administrador.
 */
public interface DespliegueService {

	/**
	 * Obtiene una zona, activa o no.
	 *
	 * @param idZona id de la zona
	 * @return la zona
	 * @throws com.segandina.sgi.exception.RecursoNoEncontradoException si no existe
	 */
	ZonaResponse obtenerZona(Integer idZona);

	/**
	 * Lista los usuarios con rol Vigilante, ordenados por apellidos y nombres.
	 *
	 * @param idZona solo los asignados a esa zona; {@code null}, de todas
	 * @param activo {@code true} activos, {@code false} dados de baja; {@code null}, todos
	 * @return los vigilantes con su zona
	 */
	List<VigilanteZonaResponse> listarVigilantes(Integer idZona, Boolean activo);

}
