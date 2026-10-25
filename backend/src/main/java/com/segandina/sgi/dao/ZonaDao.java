package com.segandina.sgi.dao;

import static com.segandina.sgi.dao.FiltrosTexto.contiene;
import static com.segandina.sgi.dao.FiltrosTexto.igualSinMayusculas;
import static com.segandina.sgi.dao.FiltrosTexto.limpiar;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.segandina.sgi.dto.request.ZonaFiltro;
import com.segandina.sgi.model.Zona;

import jakarta.persistence.criteria.Predicate;

/**
 * DAO de la tabla {@code zona}.
 */
public interface ZonaDao extends JpaRepository<Zona, Integer>, JpaSpecificationExecutor<Zona> {

	/**
	 * Busca una zona por su nombre exacto.
	 *
	 * @param nombreZona nombre de la zona
	 * @return la zona, o vacío si no existe
	 */
	Optional<Zona> findByNombreZona(String nombreZona);

	/**
	 * Lista solo las zonas activas (las dadas de baja no se ofrecen en formularios).
	 *
	 * @return zonas con {@code estado_activo = true}
	 */
	List<Zona> findByEstadoActivoTrue();

	/**
	 * Lista las zonas activas ordenadas por nombre, para el formulario de incidencias.
	 *
	 * @return zonas activas ordenadas por {@code nombre_zona} ascendente
	 */
	List<Zona> findByEstadoActivoTrueOrderByNombreZonaAsc();

	/**
	 * Indica si ya hay una zona con ese nombre, sin distinguir mayúsculas (alta de RF-09).
	 *
	 * @param nombreZona nombre a comprobar
	 * @return {@code true} si el nombre ya está en uso
	 */
	boolean existsByNombreZonaIgnoreCase(String nombreZona);

	/**
	 * Indica si otra zona (distinta de {@code idZona}) ya usa ese nombre, sin distinguir mayúsculas (edición).
	 *
	 * @param nombreZona nombre a comprobar
	 * @param idZona     zona que se está editando
	 * @return {@code true} si otra zona ya usa el nombre
	 */
	boolean existsByNombreZonaIgnoreCaseAndIdZonaNot(String nombreZona, Integer idZona);

	/**
	 * Arma la condición de búsqueda de zonas (RF-09) para usar con
	 * {@link #findAll(Specification, org.springframework.data.domain.Pageable)}. Solo se aplican los
	 * filtros con valor; todos se combinan con AND y comparan sin distinguir mayúsculas. Los
	 * caracteres {@code %} y {@code _} del texto del usuario se buscan de forma literal.
	 *
	 * @param filtro filtros a aplicar; {@code null} equivale a sin filtros
	 * @return la especificación para la consulta
	 */
	static Specification<Zona> conFiltros(ZonaFiltro filtro) {
		return (root, query, cb) -> {
			List<Predicate> condiciones = new ArrayList<>();
			if (filtro != null) {
				String nombre = limpiar(filtro.nombre());
				if (nombre != null) {
					condiciones.add(contiene(cb, root.get("nombreZona"), nombre));
				}
				String departamento = limpiar(filtro.departamento());
				if (departamento != null) {
					condiciones.add(igualSinMayusculas(cb, root.get("departamento"), departamento));
				}
				String provincia = limpiar(filtro.provincia());
				if (provincia != null) {
					condiciones.add(igualSinMayusculas(cb, root.get("provincia"), provincia));
				}
				String distrito = limpiar(filtro.distrito());
				if (distrito != null) {
					condiciones.add(igualSinMayusculas(cb, root.get("distrito"), distrito));
				}
				if (filtro.activo() != null) {
					condiciones.add(cb.equal(root.get("estadoActivo"), filtro.activo()));
				}
				String q = limpiar(filtro.q());
				if (q != null) {
					condiciones.add(cb.or(
							contiene(cb, root.get("referencia"), q),
							contiene(cb, root.get("descripcion"), q)));
				}
			}
			return cb.and(condiciones.toArray(Predicate[]::new));
		};
	}

}
