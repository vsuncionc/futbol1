package com.empresa.seguridad.encuentros.domain.model;

import com.empresa.seguridad.domain.model.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "reserva", indexes = {
        @Index(name = "idx_reserva_estado_fecha", columnList = "estado, fecha"),
        @Index(name = "idx_reserva_tecnico", columnList = "tecnico_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reserva {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cancha_id", nullable = false)
    private Cancha cancha;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tecnico_id", nullable = false)
    private User tecnico;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal monto;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoReserva estado = EstadoReserva.PENDIENTE;

    @Column(name = "comprobante_url", length = 1000)
    private String comprobanteUrl;

    @Column(name = "comprobante_tipo", length = 50)
    private String comprobanteTipo;

    @Column(name = "motivo_rechazo", length = 1000)
    private String motivoRechazo;

    @Column(name = "motivo_cancelacion", length = 1000)
    private String motivoCancelacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creada_por", nullable = false)
    private User creadaPor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decidida_por")
    private User decididaPor;

    @Column(name = "fecha_decision")
    private LocalDateTime fechaDecision;

    @Builder.Default
    @Column(name = "creada_en", nullable = false, updatable = false)
    private LocalDateTime creadaEn = LocalDateTime.now();

    @Builder.Default
    @Column(name = "actualizada_en", nullable = false)
    private LocalDateTime actualizadaEn = LocalDateTime.now();

    @PreUpdate
    public void onPreUpdate() {
        this.actualizadaEn = LocalDateTime.now();
    }
}
