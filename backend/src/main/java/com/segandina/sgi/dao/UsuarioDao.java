package com.segandina.sgi.dao;

import static com.segandina.sgi.dao.FiltrosTexto.contiene;
import static com.segandina.sgi.dao.FiltrosTexto.limpiar;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.segandina.sgi.dto.request.UsuarioFiltro;
import com.segandina.sgi.model.Usuario;

import jakarta.persistence.criteria.Predicate;

/**
 * DAO de la tabla {@code usuario}. No se usa borrado físico: la baja es lógica ({@code estado_activo}).
 */
public interface UsuarioDao extends JpaRepository<Usuario, Long>, JpaSpecificationExecutor<Usuario> {

	/**
	 * Busca un usuario por DNI (activo o no). Base del login (RF-01).
	 *
	 * @param dni DNI de 8 dígitos
	 * @return el usuario, o vacío si el DNI no está registrado
	 */
	Optional<Usuario> findByDni(String dni);

	/**
	 * Indica si ya hay un usuario con ese DNI (para evitar duplicados en RF-02).
	 *
	 * @param dni DNI de 8 dígitos
	 * @return {@code true} si el DNI ya existe
	 */
	boolean existsByDni(String dni);

	/**
	 * Indica si otro usuario (distinto de {@code idUsuario}) ya tiene ese DNI (edición en RF-02).
	 *
	 * @param dni       DNI de 8 dígitos
	 * @param idUsuario usuario que se está editando
	 * @return {@code true} si otro usuario ya tiene el DNI
	 */
	boolean existsByDniAndIdUsuarioNot(String dni, Long idUsuario);

	/**
	 * Busca usuarios paginados cargando su rol y su zona en la misma consulta (evita una consulta por fila
	 * al armar el listado).
	 *
	 * @param spec     condición de búsqueda, normalmente {@link #conFiltros(UsuarioFiltro)}
	 * @param pageable página, tamaño y orden
	 * @return página de usuarios con rol y zona cargados
	 */
	@Override
	@EntityGraph(attributePaths = { "rol", "zona" })
	Page<Usuario> findAll(Specification<Usuario> spec, Pageable pageable);

	/**
	 * Arma la condición de búsqueda de usuarios (RF-02). Solo se aplican los filtros con valor y se combinan
	 * con AND. El texto libre {@code q} busca en DNI, nombres y apellidos sin distinguir mayúsculas, con
	 * {@code %} y {@code _} tratados de forma literal.
	 *
	 * @param filtro filtros a aplicar; {@code null} equivale a sin filtros
	 * @return la especificación para la consulta
	 */
	static Specification<Usuario> conFiltros(UsuarioFiltro filtro) {
		return (root, query, cb) -> {
			List<Predicate> condiciones = new ArrayList<>();
			if (filtro != null) {
				if (filtro.idRol() != null) {
					condiciones.add(cb.equal(root.get("rol").get("idRol"), filtro.idRol()));
				}
				if (filtro.idZona() != null) {
					condiciones.add(cb.equal(root.get("zona").get("idZona"), filtro.idZona()));
				}
				if (filtro.activo() != null) {
					condiciones.add(cb.equal(root.get("estadoActivo"), filtro.activo()));
				}
				String q = limpiar(filtro.q());
				if (q != null) {
					condiciones.add(cb.or(
							contiene(cb, root.get("dni"), q),
							contiene(cb, root.get("nombres"), q),
							contiene(cb, root.get("apellidoPaterno"), q),
							contiene(cb, root.get("apellidoMaterno"), q)));
				}
			}
			return cb.and(condiciones.toArray(Predicate[]::new));
		};
	}

}
