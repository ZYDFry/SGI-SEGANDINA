package com.segandina.sgi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Catálogo de tipos de evento (Robo, Accidente, Alerta, Otro). Tabla {@code tipo_evento}.
 * No hay borrado físico: la baja es lógica con {@code estadoActivo = false}.
 */
@Entity
@Table(name = "tipo_evento")
public class TipoEvento {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_tipo_evento")
	private Short idTipoEvento;

	@Column(name = "nombre_tipo_evento", nullable = false, unique = true, length = 30)
	private String nombreTipoEvento;

	@Column(name = "estado_activo", nullable = false)
	private Boolean estadoActivo = Boolean.TRUE;

	public Short getIdTipoEvento() {
		return idTipoEvento;
	}

	public void setIdTipoEvento(Short idTipoEvento) {
		this.idTipoEvento = idTipoEvento;
	}

	public String getNombreTipoEvento() {
		return nombreTipoEvento;
	}

	public void setNombreTipoEvento(String nombreTipoEvento) {
		this.nombreTipoEvento = nombreTipoEvento;
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
		return o instanceof TipoEvento otro && idTipoEvento != null && idTipoEvento.equals(otro.getIdTipoEvento());
	}

	@Override
	public int hashCode() {
		return TipoEvento.class.hashCode();
	}

}
