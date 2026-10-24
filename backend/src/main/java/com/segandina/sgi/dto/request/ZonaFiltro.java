package com.segandina.sgi.dto.request;

/**
 * Filtros opcionales y combinables para buscar zonas (RF-09). Un valor {@code null} o en blanco
 * no filtra. Las comparaciones de texto no distinguen mayúsculas.
 *
 * @param nombre       parte del nombre de la zona (contiene)
 * @param departamento departamento exacto
 * @param provincia    provincia exacta
 * @param distrito     distrito exacto
 * @param activo       {@code true} solo activas, {@code false} solo dadas de baja, {@code null} todas
 * @param q            texto libre buscado en la referencia o en la descripción (contiene)
 */
public record ZonaFiltro(String nombre, String departamento, String provincia, String distrito, Boolean activo,
		String q) {
}
