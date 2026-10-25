package com.segandina.sgi.dao;

import java.time.LocalDate;

/**
 * Cantidad de incidencias de un día calendario de Lima.
 *
 * @param dia   día
 * @param total incidencias de ese día
 */
public record ConteoDiario(LocalDate dia, long total) {
}
