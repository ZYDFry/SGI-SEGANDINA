package com.segandina.sgi.dao;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.request.RangoFechas;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;

/**
 * Implementación de {@link IncidenciaEstadisticasDao}. Spring Data la une a {@link IncidenciaDao} por el
 * sufijo {@code Impl}.
 * <p>
 * Las condiciones de zona, nivel y tipo se agregan al texto de la consulta solo cuando tienen valor, para no
 * enviar parámetros nulos (PostgreSQL no puede deducir su tipo en las consultas nativas).
 */
public class IncidenciaEstadisticasDaoImpl implements IncidenciaEstadisticasDao {

	@PersistenceContext
	private EntityManager entityManager;

	@Override
	public List<ConteoAgrupado> contarPorZona(RangoFechas rango, IncidenciaFiltro filtro) {
		return contarAgrupado("i.zona", "idZona", "nombreZona", rango, filtro);
	}

	@Override
	public List<ConteoAgrupado> contarPorTipo(RangoFechas rango, IncidenciaFiltro filtro) {
		return contarAgrupado("i.tipoEvento", "idTipoEvento", "nombreTipoEvento", rango, filtro);
	}

	@Override
	public List<ConteoAgrupado> contarPorNivel(RangoFechas rango, IncidenciaFiltro filtro) {
		return contarAgrupado("i.nivelGravedad", "idNivelGravedad", "nombreNivel", rango, filtro);
	}

	@Override
	public List<ConteoDiario> contarPorDia(RangoFechas rango, IncidenciaFiltro filtro) {
		Map<String, Object> parametros = new HashMap<>();
		String condiciones = condiciones(rango, filtro, parametros,
				"i.fecha_hora", "i.id_zona", "i.id_nivel_gravedad", "i.id_tipo_evento");
		Query consulta = entityManager.createNativeQuery(
				"SELECT to_char(i.fecha_hora AT TIME ZONE 'America/Lima', 'YYYY-MM-DD') AS dia, COUNT(*) AS total"
						+ " FROM incidencia i WHERE " + condiciones
						+ " GROUP BY dia ORDER BY dia");
		parametros.forEach(consulta::setParameter);
		return filas(consulta).stream()
				.map(fila -> new ConteoDiario(LocalDate.parse((String) fila[0]), ((Number) fila[1]).longValue()))
				.toList();
	}

	// Cuenta por una relación de la incidencia (zona, tipo o nivel), de mayor a menor total
	private List<ConteoAgrupado> contarAgrupado(String relacion, String campoId, String campoNombre,
			RangoFechas rango, IncidenciaFiltro filtro) {
		Map<String, Object> parametros = new HashMap<>();
		String condiciones = condiciones(rango, filtro, parametros,
				"i.fechaHora", "i.zona.idZona", "i.nivelGravedad.idNivelGravedad", "i.tipoEvento.idTipoEvento");
		String id = "g." + campoId;
		String nombre = "g." + campoNombre;
		Query consulta = entityManager.createQuery(
				"SELECT " + id + ", " + nombre + ", COUNT(i) FROM Incidencia i JOIN " + relacion + " g"
						+ " WHERE " + condiciones
						+ " GROUP BY " + id + ", " + nombre
						+ " ORDER BY COUNT(i) DESC, " + nombre);
		parametros.forEach(consulta::setParameter);
		return filas(consulta).stream()
				.map(fila -> new ConteoAgrupado(((Number) fila[0]).longValue(), (String) fila[1],
						((Number) fila[2]).longValue()))
				.toList();
	}

	// Arma el WHERE con los nombres de columna (nativa) o de atributo (JPQL) recibidos y llena sus parámetros
	private static String condiciones(RangoFechas rango, IncidenciaFiltro filtro, Map<String, Object> parametros,
			String fechaHora, String idZona, String idNivel, String idTipo) {
		StringBuilder sql = new StringBuilder(fechaHora + " >= :inicio AND " + fechaHora + " < :fin");
		parametros.put("inicio", rango.inicio());
		parametros.put("fin", rango.fin());
		if (filtro != null) {
			if (filtro.idZona() != null) {
				sql.append(" AND ").append(idZona).append(" = :idZona");
				parametros.put("idZona", filtro.idZona());
			}
			if (filtro.idNivelGravedad() != null) {
				sql.append(" AND ").append(idNivel).append(" = :idNivelGravedad");
				parametros.put("idNivelGravedad", filtro.idNivelGravedad());
			}
			if (filtro.idTipoEvento() != null) {
				sql.append(" AND ").append(idTipo).append(" = :idTipoEvento");
				parametros.put("idTipoEvento", filtro.idTipoEvento());
			}
		}
		return sql.toString();
	}

	@SuppressWarnings("unchecked")
	private static List<Object[]> filas(Query consulta) {
		return consulta.getResultList();
	}

}
