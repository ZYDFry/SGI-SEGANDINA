package com.segandina.sgi.dto.response;

import java.util.List;

import org.springframework.data.domain.Page;

/**
 * Página de resultados con el formato común de los listados de la API.
 *
 * @param <T>            tipo de cada elemento
 * @param contenido      elementos de la página
 * @param pagina         número de página (desde 0)
 * @param tamano         tamaño de página usado
 * @param totalElementos total de elementos que cumplen los filtros
 * @param totalPaginas   total de páginas
 */
public record PaginaResponse<T>(List<T> contenido, int pagina, int tamano, long totalElementos,
		int totalPaginas) {

	/**
	 * Convierte una página de Spring Data al formato de la API.
	 *
	 * @param <T>    tipo de cada elemento
	 * @param pagina página origen (ya mapeada a DTO)
	 * @return la página lista para serializar
	 */
	public static <T> PaginaResponse<T> desde(Page<T> pagina) {
		return new PaginaResponse<>(pagina.getContent(), pagina.getNumber(), pagina.getSize(),
				pagina.getTotalElements(), pagina.getTotalPages());
	}

}
