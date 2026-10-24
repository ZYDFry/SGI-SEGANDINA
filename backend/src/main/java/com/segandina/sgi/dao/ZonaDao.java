package com.segandina.sgi.dao;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.segandina.sgi.dto.request.ZonaFiltro;
import com.segandina.sgi.model.Zona;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
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
					condiciones.add(cb.equal(cb.lower(root.get("departamento")), departamento.toLowerCase()));
				}
				String provincia = limpiar(filtro.provincia());
				if (provincia != null) {
					condiciones.add(cb.equal(cb.lower(root.get("provincia")), provincia.toLowerCase()));
				}
				String distrito = limpiar(filtro.distrito());
				if (distrito != null) {
					condiciones.add(cb.equal(cb.lower(root.get("distrito")), distrito.toLowerCase()));
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

	/** Recorta el texto; devuelve {@code null} si queda vacío. */
	private static String limpiar(String valor) {
		if (valor == null || valor.isBlank()) {
			return null;
		}
		return valor.trim();
	}

	/** {@code lower(campo) LIKE %texto%} escapando los comodines del texto. */
	private static Predicate contiene(CriteriaBuilder cb, Expression<String> campo, String texto) {
		String escapado = texto.toLowerCase()
				.replace("\\", "\\\\")
				.replace("%", "\\%")
				.replace("_", "\\_");
		return cb.like(cb.lower(campo), "%" + escapado + "%", '\\');
	}

}
