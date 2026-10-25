package com.segandina.sgi.model;

import org.hibernate.annotations.Immutable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Vigilantes activos de una zona activa (RF-07). Mapea la vista {@code v_despliegue_por_zona}, que es de solo
 * lectura: no tiene setters y Hibernate nunca escribe en ella ({@link Immutable}).
 */
@Entity
@Immutable
@Table(name = "v_despliegue_por_zona")
public class DespliegueZona {

	@Id
	@Column(name = "id_zona")
	private Integer idZona;

	@Column(name = "nombre_zona")
	private String nombreZona;

	@Column(name = "vigilantes_activos")
	private Long vigilantesActivos;

	/** Constructor requerido por JPA. */
	protected DespliegueZona() {
	}

	/**
	 * Crea una fila con sus valores (para pruebas; en ejecución las filas las arma Hibernate desde la vista).
	 *
	 * @param idZona            id de la zona
	 * @param nombreZona        nombre de la zona
	 * @param vigilantesActivos vigilantes activos asignados
	 */
	public DespliegueZona(Integer idZona, String nombreZona, Long vigilantesActivos) {
		this.idZona = idZona;
		this.nombreZona = nombreZona;
		this.vigilantesActivos = vigilantesActivos;
	}

	public Integer getIdZona() {
		return idZona;
	}

	public String getNombreZona() {
		return nombreZona;
	}

	public Long getVigilantesActivos() {
		return vigilantesActivos;
	}

	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		return o instanceof DespliegueZona otra && idZona != null && idZona.equals(otra.getIdZona());
	}

	@Override
	public int hashCode() {
		return DespliegueZona.class.hashCode();
	}

}
