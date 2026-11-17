package com.segandina.sgi.dto.request;

import jakarta.validation.constraints.NotNull;

/**
 * Cuerpo de {@code PATCH /api/usuarios/{id}/zona}: zona nueva de un vigilante (RF-07).
 *
 * @param idZona zona activa a la que se mueve el vigilante
 */
public record ReasignarZonaRequest(@NotNull(message = "es obligatorio") Integer idZona) {
}
