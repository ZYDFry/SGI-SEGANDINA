package com.segandina.sgi.model;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Incidencia reportada en campo. Tabla {@code incidencia}.
 * <p>
 * {@code fechaHora} es cuándo ocurrió el hecho; {@code fechaRegistro} es cuándo se guardó
 * y la asigna la base de datos ({@code DEFAULT now()}), por eso no se inserta ni actualiza desde Java.
 */
@Entity
@Table(name = "incidencia")
public class Incidencia {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_incidencia")
	private Long idIncidencia;

	@Column(name = "fecha_hora", nullable = false)
	private OffsetDateTime fechaHora;

	@Column(name = "fecha_registro", nullable = false, insertable = false, updatable = false)
	private OffsetDateTime fechaRegistro;

	@Column(name = "descripcion", nullable = false, columnDefinition = "text")
	private String descripcion;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "id_tipo_evento", nullable = false)
	private TipoEvento tipoEvento;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "id_nivel_gravedad", nullable = false)
	private NivelGravedad nivelGravedad;

	/** Usuario que registró la incidencia (siempre el del token, nunca el del body). */
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "id_usuario", nullable = false)
	private Usuario usuario;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "id_zona", nullable = false)
	private Zona zona;

	public Long getIdIncidencia() {
		return idIncidencia;
	}

	public void setIdIncidencia(Long idIncidencia) {
		this.idIncidencia = idIncidencia;
	}

	public OffsetDateTime getFechaHora() {
		return fechaHora;
	}

	public void setFechaHora(OffsetDateTime fechaHora) {
		this.fechaHora = fechaHora;
	}

	public OffsetDateTime getFechaRegistro() {
		return fechaRegistro;
	}

	public String getDescripcion() {
		return descripcion;
	}

	public void setDescripcion(String descripcion) {
		this.descripcion = descripcion;
	}

	public TipoEvento getTipoEvento() {
		return tipoEvento;
	}

	public void setTipoEvento(TipoEvento tipoEvento) {
		this.tipoEvento = tipoEvento;
	}

	public NivelGravedad getNivelGravedad() {
		return nivelGravedad;
	}

	public void setNivelGravedad(NivelGravedad nivelGravedad) {
		this.nivelGravedad = nivelGravedad;
	}

	public Usuario getUsuario() {
		return usuario;
	}

	public void setUsuario(Usuario usuario) {
		this.usuario = usuario;
	}

	public Zona getZona() {
		return zona;
	}

	public void setZona(Zona zona) {
		this.zona = zona;
	}

	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		return o instanceof Incidencia otra && idIncidencia != null && idIncidencia.equals(otra.getIdIncidencia());
	}

	@Override
	public int hashCode() {
		return Incidencia.class.hashCode();
	}

}
