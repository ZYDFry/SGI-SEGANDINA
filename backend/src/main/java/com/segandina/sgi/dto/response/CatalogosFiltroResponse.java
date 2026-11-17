package com.segandina.sgi.dto.response;

import java.util.List;

/**
 * Catálogos para los filtros del historial y del dashboard (RF-04, RF-05). A diferencia de los de los formularios,
 * incluyen los registros dados de baja ({@code estadoActivo = false}), porque las incidencias antiguas los siguen
 * referenciando y deben poder filtrarse.
 *
 * @param zonas           todas las zonas, ordenadas por nombre
 * @param tiposEvento     todos los tipos de evento, ordenados por nombre
 * @param nivelesGravedad todos los niveles de gravedad, de menos a más grave
 */
public record CatalogosFiltroResponse(List<ZonaResponse> zonas, List<TipoEventoResponse> tiposEvento,
		List<NivelGravedadResponse> nivelesGravedad) {
}
