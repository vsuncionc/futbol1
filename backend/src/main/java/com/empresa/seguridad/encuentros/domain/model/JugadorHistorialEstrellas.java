package com.empresa.seguridad.encuentros.domain.model;

import com.empresa.seguridad.domain.model.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "jugador_historial_estrellas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JugadorHistorialEstrellas {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "jugador_id", nullable = false)
    private Jugador jugador;

    @Column(name = "estrellas_anterior", nullable = false)
    private int estrellasAnterior;

    @Column(name = "estrellas_nueva", nullable = false)
    private int estrellasNueva;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cambiado_por", nullable = false)
    private User cambiadoPor;

    @Builder.Default
    @Column(name = "cambiado_en", nullable = false, updatable = false)
    private LocalDateTime cambiadoEn = LocalDateTime.now();
}
