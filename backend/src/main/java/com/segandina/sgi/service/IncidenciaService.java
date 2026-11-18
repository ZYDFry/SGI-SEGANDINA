package com.segandina.sgi.service;

import java.time.Duration;

import org.springframework.data.domain.Page;

import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.request.IncidenciaRequest;
import com.segandina.sgi.dto.request.PeriodoFiltro;
import com.segandina.sgi.dto.response.IncidenciaHistorialResponse;
import com.segandina.sgi.dto.response.IncidenciaResponse;
import com.segandina.sgi.dto.response.MiIncidenciaResponse;

/**
 * Lógica de negocio de incidencias: registro (RF-03) e historial (RF-04).
 */
public interface IncidenciaService {

	/** Nombre del tipo de evento que exige una descripción más detallada. */
	String TIPO_OTRO = "Otro";

	/** Largo mínimo de la descripción (sin espacios en los extremos) cuando el tipo es {@link #TIPO_OTRO}. */
	int MIN_DESCRIPCION_OTRO = 20;

	/** Margen aceptado para una {@code fechaHora} adelantada, por desfase del reloj del celular. */
	Duration TOLERANCIA_RELOJ = Duration.ofMinutes(2);

	/** Tamaño máximo de página del historial. */
	int TAMANO_MAXIMO = 100;

	/** Rechazo cuando un Vigilante sin zona asignada intenta registrar. */
	String SIN_ZONA_ASIGNADA = "No tiene una zona asignada; avise al Administrador";

	/** Rechazo cuando la zona asignada al Vigilante fue desactivada. */
	String ZONA_ASIGNADA_INACTIVA = "Su zona asignada está inactiva; avise al Administrador";

	/** Rechazo cuando un Vigilante envía una zona distinta de la suya. */
	String SOLO_ZONA_ASIGNADA = "Solo puede registrar incidencias en su zona asignada";

	/** Rechazo cuando un Vigilante intenta mover su incidencia a otra zona al corregirla. */
	String ZONA_NO_EDITABLE = "El Vigilante no puede cambiar la zona de la incidencia";

	/** Rechazo cuando la incidencia no existe o no la registró quien la pide (no revela que existe). */
	String INCIDENCIA_NO_EXISTE = "La incidencia no existe";

	/**
	 * Mensaje de rechazo cuando ya pasó el plazo de corrección.
	 *
	 * @param plazo plazo configurado ({@code incidencias.plazo-edicion})
	 * @return p. ej. "El plazo de corrección de 15 minutos terminó"
	 */
	static String plazoTerminado(Duration plazo) {
		long minutos = plazo.toMinutes();
		String texto;
		if (minutos >= 1 && plazo.toSecondsPart() == 0) {
			texto = minutos + (minutos == 1 ? " minuto" : " minutos");
		} else {
			long segundos = plazo.toSeconds();
			texto = segundos + (segundos == 1 ? " segundo" : " segundos");
		}
		return "El plazo de corrección de " + texto + " terminó";
	}

	/**
	 * Registra una incidencia a nombre del usuario autenticado y audita {@code REGISTRAR_INCIDENCIA} en la
	 * misma transacción. Un Vigilante solo puede registrar en su zona asignada (y esta debe estar activa); el
	 * Administrador puede elegir cualquier zona activa.
	 *
	 * @param request   datos del formulario
	 * @param idUsuario id del usuario, tomado del token (nunca del body)
	 * @return la incidencia guardada
	 * @throws com.segandina.sgi.exception.CredencialesInvalidasException si el usuario no existe o está inactivo
	 * @throws com.segandina.sgi.exception.ReglaNegocioException si el Vigilante no tiene zona, su zona está
	 *         inactiva o envía otra zona; si la zona, el tipo o el nivel no existe o está inactivo, si la fecha es
	 *         futura o si la descripción de un tipo "Otro" es demasiado corta
	 */
	IncidenciaResponse registrar(IncidenciaRequest request, Long idUsuario);

	/**
	 * Corrección por el autor (RF-03): reemplaza zona, tipo, nivel, descripción y, si se envía, la fecha y hora de
	 * una incidencia propia, dentro del plazo {@code incidencias.plazo-edicion} contado desde {@code fecha_registro}.
	 * Aplica las mismas reglas que el registro; el Vigilante no puede cambiar la zona de la incidencia. Si algo
	 * cambió, audita {@code EDITAR_INCIDENCIA} con los valores antes y después de los campos modificados; si no
	 * cambió nada, no guarda ni audita.
	 *
	 * @param idIncidencia id de la incidencia
	 * @param request      datos corregidos; sin {@code fechaHora}, se conserva la registrada
	 * @param idUsuario    id del usuario, tomado del token (nunca del body)
	 * @return la incidencia tal como quedó
	 * @throws com.segandina.sgi.exception.CredencialesInvalidasException si el usuario no existe o está inactivo
	 * @throws com.segandina.sgi.exception.RecursoNoEncontradoException si la incidencia no existe o la registró otro
	 *         usuario
	 * @throws com.segandina.sgi.exception.ReglaNegocioException si venció el plazo, si el Vigilante cambia la zona o
	 *         si los datos incumplen una regla del registro
	 */
	IncidenciaResponse corregir(Long idIncidencia, IncidenciaRequest request, Long idUsuario);

	/**
	 * Historial de incidencias (RF-04): las del rango y filtros indicados, de la más reciente a la más antigua
	 * por {@code fecha_hora}.
	 *
	 * @param filtro periodo o fechas, zona, nivel y tipo (todos opcionales)
	 * @param pagina número de página desde 0 (un valor negativo se toma como 0)
	 * @param tamano elementos por página; se acota entre 1 y {@link #TAMANO_MAXIMO}
	 * @return la página de incidencias
	 * @throws com.segandina.sgi.exception.ReglaNegocioException si el rango de fechas no es válido
	 */
	Page<IncidenciaHistorialResponse> buscar(IncidenciaFiltro filtro, int pagina, int tamano);

	/**
	 * "Mis incidencias" (RF-04): las que registró el usuario autenticado dentro del rango, con el mismo orden
	 * ({@code fecha_hora} descendente, luego id) y la misma paginación que el historial.
	 *
	 * @param filtro    periodo o fechas (opcionales; sin valor, últimos 30 días)
	 * @param idUsuario id del usuario, tomado del token (nunca de los parámetros)
	 * @param pagina    número de página desde 0 (un valor negativo se toma como 0)
	 * @param tamano    elementos por página; se acota entre 1 y {@link #TAMANO_MAXIMO}
	 * @return la página de incidencias propias
	 * @throws com.segandina.sgi.exception.ReglaNegocioException si el rango de fechas no es válido
	 */
	Page<MiIncidenciaResponse> buscarPropias(PeriodoFiltro filtro, Long idUsuario, int pagina, int tamano);

}
