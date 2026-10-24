package com.segandina.sgi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Zona o sede donde se asigna personal y ocurren incidencias. Tabla {@code zona}.
 * No hay borrado físico: la baja es lógica con {@code estadoActivo = false}.
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

	@Column(name = "departamento", nullable = false, length = 50)
	private String departamento;

	@Column(name = "provincia", nullable = false, length = 50)
	private String provincia;

	@Column(name = "distrito", nullable = false, length = 80)
	private String distrito;

	@Column(name = "referencia", length = 150)
	private String referencia;

	@Column(name = "descripcion", columnDefinition = "text")
	private String descripcion;

	@Column(name = "estado_activo", nullable = false)
	private Boolean estadoActivo = Boolean.TRUE;

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

	public String getDepartamento() {
		return departamento;
	}

	public void setDepartamento(String departamento) {
		this.departamento = departamento;
	}

	public String getProvincia() {
		return provincia;
	}

	public void setProvincia(String provincia) {
		this.provincia = provincia;
	}

	public String getDistrito() {
		return distrito;
	}

	public void setDistrito(String distrito) {
		this.distrito = distrito;
	}

	public String getReferencia() {
		return referencia;
	}

	public void setReferencia(String referencia) {
		this.referencia = referencia;
	}

	public String getDescripcion() {
		return descripcion;
	}

	public void setDescripcion(String descripcion) {
		this.descripcion = descripcion;
	}

	public Boolean getEstadoActivo() {
		return estadoActivo;
	}

	public void setEstadoActivo(Boolean estadoActivo) {
		this.estadoActivo = estadoActivo;
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
