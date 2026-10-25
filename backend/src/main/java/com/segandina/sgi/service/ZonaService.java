package com.segandina.sgi.service;

import org.springframework.data.domain.Page;

import com.segandina.sgi.dto.request.ZonaFiltro;
import com.segandina.sgi.dto.request.ZonaRequest;
import com.segandina.sgi.dto.response.ZonaResponse;

/**
 * Lógica de negocio de zonas (RF-09). No hay borrado físico: la baja es lógica.
 */
public interface ZonaService {

	/** Tamaño de página máximo permitido en la búsqueda. */
	int TAMANO_MAXIMO = 100;

	/**
	 * Busca zonas con filtros opcionales y combinables, ordenadas por nombre (sin distinguir
	 * mayúsculas) y paginadas.
	 *
	 * @param filtro filtros a aplicar; {@code null} devuelve todas las zonas
	 * @param pagina número de página desde 0; un valor negativo se toma como 0
	 * @param tamano elementos por página; se acota entre 1 y {@link #TAMANO_MAXIMO}
	 * @return la página de zonas encontradas
	 */
	Page<ZonaResponse> buscar(ZonaFiltro filtro, int pagina, int tamano);

	/**
	 * Obtiene una zona por id, activa o no.
	 *
	 * @param idZona id de la zona
	 * @return la zona
	 * @throws com.segandina.sgi.exception.RecursoNoEncontradoException si no existe
	 */
	ZonaResponse obtener(Integer idZona);

	/**
	 * Crea una zona activa y audita {@code CREAR_ZONA}.
	 *
	 * @param request datos de la zona (los textos se guardan recortados)
	 * @param idActor id del Administrador (del token)
	 * @return la zona creada
	 * @throws com.segandina.sgi.exception.DatoDuplicadoException si el nombre ya existe (sin distinguir
	 *         mayúsculas)
	 */
	ZonaResponse crear(ZonaRequest request, Long idActor);

	/**
	 * Reemplaza los datos de una zona y audita {@code MODIFICAR_ZONA} con los valores antes y después. Si no
	 * cambia nada, no audita.
	 *
	 * @param idZona  zona a editar
	 * @param request datos nuevos
	 * @param idActor id del Administrador (del token)
	 * @return la zona actualizada
	 * @throws com.segandina.sgi.exception.RecursoNoEncontradoException si la zona no existe
	 * @throws com.segandina.sgi.exception.DatoDuplicadoException si otra zona ya usa el nombre
	 */
	ZonaResponse actualizar(Integer idZona, ZonaRequest request, Long idActor);

	/**
	 * Activa o da de baja una zona y audita {@code CAMBIAR_ESTADO_ZONA}. Si ya tenía ese estado, no cambia ni
	 * audita nada.
	 *
	 * @param idZona  zona a modificar
	 * @param activo  estado nuevo
	 * @param idActor id del Administrador (del token)
	 * @return la zona con su estado final
	 * @throws com.segandina.sgi.exception.RecursoNoEncontradoException si la zona no existe
	 */
	ZonaResponse cambiarEstado(Integer idZona, boolean activo, Long idActor);

}
