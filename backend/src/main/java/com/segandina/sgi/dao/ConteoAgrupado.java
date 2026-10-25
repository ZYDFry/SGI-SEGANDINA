package com.segandina.sgi.dao;

/**
 * Resultado de una consulta agregada: un grupo (zona, tipo o nivel) y su cantidad de incidencias.
 *
 * @param id     id del grupo
 * @param nombre nombre del grupo
 * @param total  incidencias del grupo
 */
public record ConteoAgrupado(Long id, String nombre, long total) {
}
