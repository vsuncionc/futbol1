package com.empresa.seguridad.encuentros.application.dto;

import com.empresa.seguridad.encuentros.domain.model.EstadoReserva;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public class ReservaDtos {

    public record ReservaDto(
            Long id,
            Long canchaId,
            String canchaNombre,
            String canchaTipo,
            UUID tecnicoId,
            String tecnicoNombre,
            String tecnicoEmail,
            LocalDate fecha,
            LocalTime horaInicio,
            LocalTime horaFin,
            BigDecimal monto,
            EstadoReserva estado,
            String comprobanteUrl,
            String comprobanteTipo,
            String motivoRechazo,
            String motivoCancelacion,
            boolean enConflicto,
            LocalDateTime creadaEn,
            LocalDateTime actualizadaEn
    ) {}

    public record ReservaCreateRequest(
            @NotNull(message = "La cancha es requerida")
            Long canchaId,

            @NotNull(message = "La fecha es requerida")
            LocalDate fecha,

            @NotNull(message = "La hora de inicio es requerida")
            LocalTime horaInicio,

            @NotNull(message = "La hora de fin es requerida")
            LocalTime horaFin,

            UUID tecnicoId // Solo admin puede pasar un técnico distinto al autenticado
    ) {}

    public record DecisionReservaRequest(
            String motivo
    ) {}

    public record CancelReservaRequest(
            String motivo
    ) {}

    public record ReprogramarReservaRequest(
            @NotNull(message = "La fecha es requerida")
            LocalDate fecha,

            @NotNull(message = "La hora de inicio es requerida")
            LocalTime horaInicio,

            @NotNull(message = "La hora de fin es requerida")
            LocalTime horaFin
    ) {}

    public record AlertaReservaDto(
            Long id,
            UUID tecnicoId,
            String tecnicoNombre,
            Long canchaId,
            String canchaNombre,
            LocalDate fecha,
            LocalTime horaInicio,
            LocalTime horaFin,
            BigDecimal monto,
            long diasRestantes,
            String semaforo, // ROJO, AMBAR, VERDE
            String textoSemaforo,
            String comprobanteUrl,
            boolean enConflicto
    ) {}

    public record AlertaResumenDto(
            long totalRojas,
            long totalAmbar,
            long totalVerdes,
            List<AlertaReservaDto> alertas
    ) {}

    public record DisponibilidadSlotDto(
            Long canchaId,
            String canchaNombre,
            LocalDate fecha,
            LocalTime horaInicio,
            LocalTime horaFin,
            String estado // LIBRE u OCUPADO
    ) {}

    public record DisponibilidadCheckDto(
            boolean disponible,
            String mensaje
    ) {}
}
