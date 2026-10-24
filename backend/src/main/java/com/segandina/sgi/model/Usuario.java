package com.segandina.sgi.model;

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
 * Usuario del sistema (administrador, supervisor o vigilante). Tabla {@code usuario}.
 * <p>
 * No hay borrado físico: la baja es lógica con {@code estadoActivo = false}.
 * El campo {@code contrasena} guarda el hash BCrypt y nunca debe exponerse en la API;
 * las respuestas se construyen con DTOs, no con esta entidad.
 */
@Entity
@Table(name = "usuario")
public class Usuario {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_usuario")
	private Long idUsuario;

	@Column(name = "dni", nullable = false, unique = true, length = 8, columnDefinition = "char(8)")
	private String dni;

	@Column(name = "nombres", nullable = false, length = 80)
	private String nombres;

	@Column(name = "apellido_paterno", nullable = false, length = 50)
	private String apellidoPaterno;

	@Column(name = "apellido_materno", length = 50)
	private String apellidoMaterno;

	@Column(name = "contrasena", nullable = false, length = 255)
	private String contrasena;

	@Column(name = "estado_activo", nullable = false)
	private Boolean estadoActivo = Boolean.TRUE;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "id_rol", nullable = false)
	private Rol rol;

	/** Zona asignada; puede ser nula (p. ej. administradores o personal sin asignar). */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "id_zona")
	private Zona zona;

	public Long getIdUsuario() {
		return idUsuario;
	}

	public void setIdUsuario(Long idUsuario) {
		this.idUsuario = idUsuario;
	}

	public String getDni() {
		return dni;
	}

	public void setDni(String dni) {
		this.dni = dni;
	}

	public String getNombres() {
		return nombres;
	}

	public void setNombres(String nombres) {
		this.nombres = nombres;
	}

	public String getApellidoPaterno() {
		return apellidoPaterno;
	}

	public void setApellidoPaterno(String apellidoPaterno) {
		this.apellidoPaterno = apellidoPaterno;
	}

	public String getApellidoMaterno() {
		return apellidoMaterno;
	}

	public void setApellidoMaterno(String apellidoMaterno) {
		this.apellidoMaterno = apellidoMaterno;
	}

	public String getContrasena() {
		return contrasena;
	}

	public void setContrasena(String contrasena) {
		this.contrasena = contrasena;
	}

	public Boolean getEstadoActivo() {
		return estadoActivo;
	}

	public void setEstadoActivo(Boolean estadoActivo) {
		this.estadoActivo = estadoActivo;
	}

	public Rol getRol() {
		return rol;
	}

	public void setRol(Rol rol) {
		this.rol = rol;
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
		return o instanceof Usuario otro && idUsuario != null && idUsuario.equals(otro.getIdUsuario());
	}

	@Override
	public int hashCode() {
		return Usuario.class.hashCode();
	}

}
