package com.empresa.seguridad.encuentros.domain.model;

import com.empresa.seguridad.domain.model.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "auditoria_encuentros")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Auditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private User usuario;

    @Column(nullable = false, length = 40)
    private String entidad;

    @Column(name = "entidad_id", nullable = false)
    private Long entidadId;

    @Column(nullable = false, length = 40)
    private String accion;

    @Column(columnDefinition = "TEXT")
    private String detalle;

    @Builder.Default
    @Column(nullable = false, updatable = false)
    private LocalDateTime fecha = LocalDateTime.now();
}
