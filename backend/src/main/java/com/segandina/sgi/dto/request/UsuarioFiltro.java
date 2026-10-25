package com.segandina.sgi.dto.request;

/**
 * Filtros opcionales y combinables para listar usuarios (RF-02). Un valor {@code null} o en blanco no filtra.
 *
 * @param idRol  solo usuarios de ese rol
 * @param idZona solo usuarios asignados a esa zona
 * @param activo {@code true} solo activos, {@code false} solo dados de baja, {@code null} todos
 * @param q      texto libre buscado en DNI, nombres y apellidos (contiene, sin distinguir mayúsculas)
 */
public record UsuarioFiltro(Short idRol, Integer idZona, Boolean activo, String q) {
}
