package com.segandina.sgi.dao;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.request.RangoFechas;
import com.segandina.sgi.model.Incidencia;

import jakarta.persistence.criteria.Predicate;

/**
 * DAO de la tabla {@code incidencia}. Las consultas agregadas del dashboard están en
 * {@link IncidenciaEstadisticasDao}.
 */
public interface IncidenciaDao extends JpaRepository<Incidencia, Long>, JpaSpecificationExecutor<Incidencia>,
		IncidenciaEstadisticasDao {

	/**
	 * Busca incidencias paginadas cargando zona, tipo, nivel y usuario en la misma consulta (historial RF-04).
	 *
	 * @param spec     condición de búsqueda, normalmente {@link #conFiltros(RangoFechas, IncidenciaFiltro)}
	 * @param pageable página, tamaño y orden
	 * @return página de incidencias con sus relaciones cargadas
	 */
	@Override
	@EntityGraph(attributePaths = { "zona", "tipoEvento", "nivelGravedad", "usuario" })
	Page<Incidencia> findAll(Specification<Incidencia> spec, Pageable pageable);

	/**
	 * Arma la condición de búsqueda de incidencias: {@code fecha_hora} dentro de
	 * {@code [rango.inicio(), rango.fin())} y, si tienen valor, zona, nivel de gravedad y tipo de evento.
	 *
	 * @param rango  rango de días ya resuelto
	 * @param filtro filtros opcionales; su periodo y fechas no se usan aquí (ya están en {@code rango})
	 * @return la especificación para la consulta
	 */
	static Specification<Incidencia> conFiltros(RangoFechas rango, IncidenciaFiltro filtro) {
		return (root, query, cb) -> {
			List<Predicate> condiciones = new ArrayList<>();
			condiciones.add(cb.greaterThanOrEqualTo(root.get("fechaHora"), rango.inicio()));
			condiciones.add(cb.lessThan(root.get("fechaHora"), rango.fin()));
			if (filtro != null) {
				if (filtro.idZona() != null) {
					condiciones.add(cb.equal(root.get("zona").get("idZona"), filtro.idZona()));
				}
				if (filtro.idNivelGravedad() != null) {
					condiciones.add(cb.equal(root.get("nivelGravedad").get("idNivelGravedad"), filtro.idNivelGravedad()));
				}
				if (filtro.idTipoEvento() != null) {
					condiciones.add(cb.equal(root.get("tipoEvento").get("idTipoEvento"), filtro.idTipoEvento()));
				}
			}
			return cb.and(condiciones.toArray(Predicate[]::new));
		};
	}

}
