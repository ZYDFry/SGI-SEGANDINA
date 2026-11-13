package com.segandina.sgi.exception;

import java.util.List;

import org.springframework.core.MethodParameter;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.validation.method.ParameterErrors;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

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

	/** Query param con un valor que incumple una regla (p. ej. rango invertido): 400 con el campo en detalles. */
	@ExceptionHandler(ParametroInvalidoException.class)
	public ResponseEntity<ErrorRespuesta> parametroInvalido(ParametroInvalidoException ex) {
		return responder(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of(ex.getCampo() + ": " + ex.getMessage()));
	}

	/** Regla de negocio incumplida: 400 con el motivo. */
	@ExceptionHandler(ReglaNegocioException.class)
	public ResponseEntity<ErrorRespuesta> reglaNegocio(ReglaNegocioException ex) {
		return responder(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
	}

	/** Recurso inexistente: 404 con el motivo. */
	@ExceptionHandler(RecursoNoEncontradoException.class)
	public ResponseEntity<ErrorRespuesta> noEncontrado(RecursoNoEncontradoException ex) {
		return responder(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
	}

	/** Dato único repetido: 409 con el motivo. */
	@ExceptionHandler(DatoDuplicadoException.class)
	public ResponseEntity<ErrorRespuesta> duplicado(DatoDuplicadoException ex) {
		return responder(HttpStatus.CONFLICT, ex.getMessage(), List.of());
	}

	/**
	 * Restricción de la BD violada (p. ej. dos altas simultáneas con el mismo nombre que pasaron la validación
	 * previa): 409 con un mensaje genérico, sin exponer el detalle del motor.
	 */
	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<ErrorRespuesta> integridad(DataIntegrityViolationException ex) {
		return responder(HttpStatus.CONFLICT, "El dato ya existe o entra en conflicto con otro registro", List.of());
	}

	/**
	 * Errores de {@code @Valid} o de conversión al armar un objeto de filtros desde los query params (p. ej.
	 * {@code periodo=AYER} o {@code desde=24-10-2026}): 400 con un detalle por campo.
	 */
	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorRespuesta> validacion(MethodArgumentNotValidException ex) {
		return responder(HttpStatus.BAD_REQUEST, "Datos de entrada inválidos", detallesCampos(ex));
	}

	/** Error de enlace de query params fuera de {@code @Valid}: 400 con un detalle por campo. */
	@ExceptionHandler(BindException.class)
	public ResponseEntity<ErrorRespuesta> parametrosInvalidos(BindException ex) {
		return responder(HttpStatus.BAD_REQUEST, "Parámetros de consulta inválidos", detallesCampos(ex));
	}

	/** Query param suelto con un tipo incorrecto (p. ej. {@code agrupacion=ANIO}): 400. */
	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<ErrorRespuesta> tipoInvalido(MethodArgumentTypeMismatchException ex) {
		return responder(HttpStatus.BAD_REQUEST, "Parámetros de consulta inválidos",
				List.of(ex.getName() + ": valor no válido '" + ex.getValue() + "'"));
	}

	/**
	 * Query params que incumplen una restricción cuando el método del controller valida parámetros sueltos
	 * ({@code @Min}, {@code @Max}; p. ej. {@code size=101}) y objetos con {@code @Valid} a la vez: 400 con un detalle
	 * por parámetro o por campo.
	 */
	@ExceptionHandler(HandlerMethodValidationException.class)
	public ResponseEntity<ErrorRespuesta> restriccionParametro(HandlerMethodValidationException ex) {
		List<String> detalles = ex.getParameterValidationResults().stream()
				.flatMap(resultado -> resultado instanceof ParameterErrors errores
						// Objeto de filtros con @Valid: un detalle por campo del objeto
						? errores.getFieldErrors().stream()
								.map(error -> error.getField() + ": " + error.getDefaultMessage())
						: resultado.getResolvableErrors().stream()
								.map(error -> nombreParametro(resultado.getMethodParameter()) + ": "
										+ error.getDefaultMessage()))
				.toList();
		return responder(HttpStatus.BAD_REQUEST, "Parámetros de consulta inválidos", detalles);
	}

	/** Cuerpo ausente o JSON mal formado: 400. */
	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ErrorRespuesta> cuerpoIlegible(HttpMessageNotReadableException ex) {
		return responder(HttpStatus.BAD_REQUEST, "El cuerpo de la petición no es un JSON válido", List.of());
	}

	// Un detalle por campo; los fallos de conversión de tipo no exponen el mensaje técnico de Spring
	private static List<String> detallesCampos(BindException ex) {
		return ex.getBindingResult().getFieldErrors().stream()
				.map(error -> error.isBindingFailure()
						? error.getField() + ": valor no válido '" + error.getRejectedValue() + "'"
						: error.getField() + ": " + error.getDefaultMessage())
				.toList();
	}

	// Nombre con el que llega el query param (el de @RequestParam si lo declara, si no el del parámetro)
	private static String nombreParametro(MethodParameter parametro) {
		RequestParam anotacion = parametro.getParameterAnnotation(RequestParam.class);
		if (anotacion != null && !anotacion.name().isBlank()) {
			return anotacion.name();
		}
		return parametro.getParameterName();
	}

	private static ResponseEntity<ErrorRespuesta> responder(HttpStatus status, String mensaje, List<String> detalles) {
		return ResponseEntity.status(status).body(ErrorRespuesta.de(status.value(), mensaje, detalles));
	}

}
