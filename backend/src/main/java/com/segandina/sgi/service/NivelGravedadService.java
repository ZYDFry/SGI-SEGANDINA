package com.segandina.sgi.service;

import java.util.List;

import com.segandina.sgi.dto.request.NivelGravedadRequest;
import com.segandina.sgi.dto.response.NivelGravedadResponse;

/**
 * Administración del catálogo de niveles de gravedad (RF-09): solo se editan el nombre y el orden.
 */
public interface NivelGravedadService {

	/**
	 * Lista todos los niveles de gravedad, activos o no.
	 *
	 * @return niveles de menos a más grave
	 */
	List<NivelGravedadResponse> listar();

	/**
	 * Cambia el nombre y el orden de un nivel y audita {@code MODIFICAR_NIVEL_GRAVEDAD} con los valores antes y
	 * después. Si el orden nuevo lo tiene otro nivel, los dos niveles intercambian su orden en la misma
	 * transacción (el detalle de auditoría lo indica en {@code intercambiadoCon}). Si no cambia nada, no audita.
	 *
	 * @param idNivelGravedad nivel a editar
	 * @param request         nombre y orden nuevos
	 * @param idActor         id del Administrador (del token)
	 * @return el nivel actualizado
	 * @throws com.segandina.sgi.exception.RecursoNoEncontradoException si el nivel no existe
	 * @throws com.segandina.sgi.exception.DatoDuplicadoException si otro nivel ya usa el nombre
	 */
	NivelGravedadResponse actualizar(Short idNivelGravedad, NivelGravedadRequest request, Long idActor);

}
