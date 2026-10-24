package com.segandina.sgi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Zona o sede donde se asigna personal y ocurren incidencias. Tabla {@code zona}.
 */
@Entity
@Table(name = "zona")
public class Zona {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_zona")
	private Integer idZona;

	@Column(name = "nombre_zona", nullable = false, unique = true, length = 80)
	private String nombreZona;

	@Column(name = "descripcion", columnDefinition = "text")
	private String descripcion;

	public Integer getIdZona() {
		return idZona;
	}

	public void setIdZona(Integer idZona) {
		this.idZona = idZona;
	}

	public String getNombreZona() {
		return nombreZona;
	}

	public void setNombreZona(String nombreZona) {
		this.nombreZona = nombreZona;
	}

	public String getDescripcion() {
		return descripcion;
	}

	public void setDescripcion(String descripcion) {
		this.descripcion = descripcion;
	}

	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		return o instanceof Zona otra && idZona != null && idZona.equals(otra.getIdZona());
	}

	@Override
	public int hashCode() {
		return Zona.class.hashCode();
	}

}
