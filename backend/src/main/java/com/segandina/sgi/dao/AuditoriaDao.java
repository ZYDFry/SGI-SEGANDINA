package com.segandina.sgi.dao;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.repository.Repository;

import com.segandina.sgi.dto.request.AuditoriaFiltro;
import com.segandina.sgi.dto.request.RangoFechas;
import com.segandina.sgi.model.Auditoria;
import com.segandina.sgi.model.Usuario;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

/**
 * DAO de la tabla {@code auditoria}, que es solo inserción.
 * <p>
 * Extiende {@link Repository} (no {@code JpaRepository} ni {@code JpaSpecificationExecutor}, que traen
 * métodos {@code delete}) para exponer únicamente inserción y consultas: no existen métodos de borrado ni de
 * actualización.
 */
public interface AuditoriaDao extends Repository<Auditoria, Long> {

	/**
	 * Orden de la consulta de auditoría: más reciente primero; el id desempata registros con la misma fecha para
	 * que la paginación sea estable.
	 */
	Sort ORDEN_AUDITORIA = Sort.by(Sort.Order.desc("fechaHora"), Sort.Order.desc("idAuditoria"));

	/**
	 * Inserta un nuevo registro de auditoría.
	 *
	 * @param auditoria registro nuevo (sin id)
	 * @return el registro guardado, con su id generado
	 */
	Auditoria save(Auditoria auditoria);

	/**
	 * Busca un registro por id.
	 *
	 * @param idAuditoria id del registro
	 * @return el registro, o vacío si no existe
	 */
	Optional<Auditoria> findById(Long idAuditoria);

	/**
	 * Lista registros de auditoría paginados.
	 *
	 * @param pageable página, tamaño y orden
	 * @return página de registros
	 */
	Page<Auditoria> findAll(Pageable pageable);

	/**
	 * Busca registros paginados cargando su usuario en la misma consulta (LEFT JOIN, sin N+1). Consulta de
	 * auditoría RF-08.
	 *
	 * @param spec     condición de búsqueda, normalmente {@link #conFiltros(RangoFechas, AuditoriaFiltro)}
	 * @param pageable página, tamaño y orden, normalmente {@link #ORDEN_AUDITORIA}
	 * @return página de registros con su usuario cargado
	 */
	@EntityGraph(attributePaths = "usuario")
	Page<Auditoria> findAll(Specification<Auditoria> spec, Pageable pageable);

	/**
	 * Cuenta todos los registros.
	 *
	 * @return total de registros
	 */
	long count();

	/**
	 * Arma la condición de búsqueda: {@code fecha_hora} dentro de {@code [rango.inicio(), rango.fin())} y, si
	 * tienen valor, la acción, el usuario y el DNI ({@code q}) por coincidencia exacta o por prefijo sobre el DNI
	 * del usuario o el DNI intentado.
	 *
	 * @param rango  rango de días ya resuelto
	 * @param filtro filtros opcionales; su periodo y fechas no se usan aquí (ya están en {@code rango}); {@code q}
	 *               llega validado (solo dígitos), así que no contiene comodines de LIKE
	 * @return la especificación para la consulta
	 */
	static Specification<Auditoria> conFiltros(RangoFechas rango, AuditoriaFiltro filtro) {
		return (root, query, cb) -> {
			List<Predicate> condiciones = new ArrayList<>();
			condiciones.add(cb.greaterThanOrEqualTo(root.get("fechaHora"), rango.inicio()));
			condiciones.add(cb.lessThan(root.get("fechaHora"), rango.fin()));
			if (filtro != null) {
				if (filtro.accion() != null) {
					condiciones.add(cb.equal(root.get("accionRealizada"), filtro.accion().name()));
				}
				if (filtro.idUsuario() != null) {
					condiciones.add(cb.equal(root.get("usuario").get("idUsuario"), filtro.idUsuario()));
				}
				if (filtro.q() != null && !filtro.q().isBlank()) {
					String prefijo = filtro.q().trim() + "%";
					Join<Auditoria, Usuario> usuario = root.join("usuario", JoinType.LEFT);
					condiciones.add(cb.or(
							cb.like(usuario.get("dni"), prefijo),
							cb.like(root.get("dniIntentado"), prefijo)));
				}
			}
			return cb.and(condiciones.toArray(Predicate[]::new));
		};
	}

}
