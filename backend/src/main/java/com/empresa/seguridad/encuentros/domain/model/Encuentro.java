package com.empresa.seguridad.encuentros.domain.model;

import com.empresa.seguridad.domain.model.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "encuentro", indexes = {
        @Index(name = "idx_encuentro_estado", columnList = "estado")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Encuentro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reserva_id", nullable = false, unique = true)
    private Reserva reserva;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tecnico_id", nullable = false)
    private User tecnico;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(name = "banner_url", length = 1000)
    private String bannerUrl;

    @Column(name = "apuesta_monto", precision = 10, scale = 2)
    private BigDecimal apuestaMonto;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoEncuentro estado = EstadoEncuentro.BORRADOR;

    @Builder.Default
    @Column(name = "creado_en", nullable = false, updatable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    @Column(name = "publicado_en")
    private LocalDateTime publicadoEn;

    @Builder.Default
    @OneToMany(mappedBy = "encuentro", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<Equipo> equipos = new ArrayList<>();
}
