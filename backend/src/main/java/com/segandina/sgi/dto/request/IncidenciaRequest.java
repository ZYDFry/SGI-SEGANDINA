package com.segandina.sgi.dto.request;

import java.time.OffsetDateTime;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de {@code POST /api/incidencias} (RF-03). El usuario no viaja aquí: se toma del token.
 *
 * @param idZona          zona donde ocurrió
 * @param idTipoEvento    tipo de evento
 * @param idNivelGravedad nivel de gravedad
 * @param descripcion     qué pasó; si el tipo es "Otro", al menos 20 caracteres
 * @param fechaHora       cuándo ocurrió; opcional (por defecto, la hora actual) y no futura
 */
public record IncidenciaRequest(
		@NotNull(message = "es obligatoria") Integer idZona,
		@NotNull(message = "es obligatorio") Short idTipoEvento,
		@NotNull(message = "es obligatorio") Short idNivelGravedad,
		@NotBlank(message = "es obligatoria")
		@Size(max = 2000, message = "no debe superar los 2000 caracteres") String descripcion,
		OffsetDateTime fechaHora) {

}
