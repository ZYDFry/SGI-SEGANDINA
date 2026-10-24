package com.segandina.sgi.exception;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Convierte las excepciones de los controllers en respuestas {@link ErrorRespuesta}.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

	/** Login fallido: 401 con el mensaje genérico. */
	@ExceptionHandler(CredencialesInvalidasException.class)
	public ResponseEntity<ErrorRespuesta> credencialesInvalidas(CredencialesInvalidasException ex) {
		return responder(HttpStatus.UNAUTHORIZED, ex.getMessage(), List.of());
	}

	/** Errores de {@code @Valid}: 400 con un detalle por campo. */
	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorRespuesta> validacion(MethodArgumentNotValidException ex) {
		List<String> detalles = ex.getBindingResult().getFieldErrors().stream()
				.map(error -> error.getField() + ": " + error.getDefaultMessage())
				.toList();
		return responder(HttpStatus.BAD_REQUEST, "Datos de entrada inválidos", detalles);
	}

	/** Cuerpo ausente o JSON mal formado: 400. */
	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ErrorRespuesta> cuerpoIlegible(HttpMessageNotReadableException ex) {
		return responder(HttpStatus.BAD_REQUEST, "El cuerpo de la petición no es un JSON válido", List.of());
	}

	private static ResponseEntity<ErrorRespuesta> responder(HttpStatus status, String mensaje, List<String> detalles) {
		return ResponseEntity.status(status).body(ErrorRespuesta.de(status.value(), mensaje, detalles));
	}

}
