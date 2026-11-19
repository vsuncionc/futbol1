package com.empresa.seguridad.encuentros.domain.model;

import com.empresa.seguridad.domain.model.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "jugador", indexes = {
        @Index(name = "idx_jugador_tecnico", columnList = "tecnico_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Jugador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tecnico_id", nullable = false)
    private User tecnico;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(length = 50)
    private String apodo;

    @Column(length = 20)
    private String posicion; // portero, defensa, medio, delantero

    @Column(name = "foto_url", length = 1000)
    private String fotoUrl;

    @Column(name = "foto_miniatura_url", length = 1000)
    private String fotoMiniaturaUrl;

    @Column(nullable = false)
    private int estrellas; // 1 to 5

    @Builder.Default
    @Column(nullable = false)
    private boolean activo = true;

    @Builder.Default
    @Column(name = "creado_en", nullable = false, updatable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();
}
