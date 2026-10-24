package com.segandina.sgi.service;

import org.springframework.data.domain.Page;

import com.segandina.sgi.dto.request.ZonaFiltro;
import com.segandina.sgi.dto.response.ZonaResponse;

/**
 * Lógica de negocio de zonas (RF-09).
 */
public interface ZonaService {

	/** Tamaño de página máximo permitido en la búsqueda. */
	int TAMANO_MAXIMO = 100;

	/**
	 * Busca zonas con filtros opcionales y combinables, ordenadas por nombre (sin distinguir
	 * mayúsculas) y paginadas.
	 *
	 * @param filtro filtros a aplicar; {@code null} devuelve todas las zonas
	 * @param pagina número de página desde 0; un valor negativo se toma como 0
	 * @param tamano elementos por página; se acota entre 1 y {@link #TAMANO_MAXIMO}
	 * @return la página de zonas encontradas
	 */
	Page<ZonaResponse> buscar(ZonaFiltro filtro, int pagina, int tamano);

}
