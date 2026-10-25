package com.segandina.sgi.dto.request;

import jakarta.validation.constraints.NotNull;

/**
 * Cuerpo de los {@code PATCH .../{id}/estado} (baja lógica de usuarios, zonas y tipos de evento).
 *
 * @param activo {@code true} para activar, {@code false} para dar de baja
 */
public record CambioEstadoRequest(@NotNull(message = "es obligatorio") Boolean activo) {
}
