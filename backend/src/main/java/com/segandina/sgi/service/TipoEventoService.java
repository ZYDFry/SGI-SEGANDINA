package com.segandina.sgi.service;

import java.util.List;

import com.segandina.sgi.dto.request.TipoEventoRequest;
import com.segandina.sgi.dto.response.TipoEventoResponse;

/**
 * Administración del catálogo de tipos de evento (RF-09). No hay borrado físico: la baja es lógica.
 */
public interface TipoEventoService {

	/**
	 * Lista todos los tipos de evento, activos o no.
	 *
	 * @return tipos ordenados por nombre
	 */
	List<TipoEventoResponse> listar();

	/**
	 * Crea un tipo de evento activo y audita {@code CREAR_TIPO_EVENTO}.
	 *
	 * @param request nombre del tipo (se guarda recortado)
	 * @param idActor id del Administrador (del token)
	 * @return el tipo creado
	 * @throws com.segandina.sgi.exception.DatoDuplicadoException si el nombre ya existe (sin distinguir
	 *         mayúsculas)
	 */
	TipoEventoResponse crear(TipoEventoRequest request, Long idActor);

	/**
	 * Renombra un tipo de evento y audita {@code MODIFICAR_TIPO_EVENTO} con el nombre antes y después. El tipo
	 * {@link IncidenciaService#TIPO_OTRO} no se puede renombrar porque la regla de descripción mínima de RF-03
	 * depende de su nombre.
	 *
	 * @param idTipoEvento tipo a editar
	 * @param request      nombre nuevo
	 * @param idActor      id del Administrador (del token)
	 * @return el tipo actualizado
	 * @throws com.segandina.sgi.exception.RecursoNoEncontradoException si el tipo no existe
	 * @throws com.segandina.sgi.exception.DatoDuplicadoException si otro tipo ya usa el nombre
	 * @throws com.segandina.sgi.exception.ReglaNegocioException si se intenta renombrar el tipo "Otro"
	 */
	TipoEventoResponse actualizar(Short idTipoEvento, TipoEventoRequest request, Long idActor);

	/**
	 * Activa o da de baja un tipo de evento y audita {@code CAMBIAR_ESTADO_TIPO_EVENTO}. Si ya tenía ese
	 * estado, no cambia ni audita nada.
	 *
	 * @param idTipoEvento tipo a modificar
	 * @param activo       estado nuevo
	 * @param idActor      id del Administrador (del token)
	 * @return el tipo con su estado final
	 * @throws com.segandina.sgi.exception.RecursoNoEncontradoException si el tipo no existe
	 */
	TipoEventoResponse cambiarEstado(Short idTipoEvento, boolean activo, Long idActor);

}
