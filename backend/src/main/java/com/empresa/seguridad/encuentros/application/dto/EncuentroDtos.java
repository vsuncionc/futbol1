package com.empresa.seguridad.encuentros.application.dto;

import com.empresa.seguridad.encuentros.domain.model.EstadoEncuentro;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public class EncuentroDtos {

    public record EncuentroDto(
            Long id,
            Long reservaId,
            Long canchaId,
            String canchaNombre,
            String canchaTipo,
            LocalDate fecha,
            LocalTime horaInicio,
            LocalTime horaFin,
            UUID tecnicoId,
            String tecnicoNombre,
            String nombre,
            String bannerUrl,
            BigDecimal apuestaMonto,
            EstadoEncuentro estado,
            LocalDateTime creadoEn,
            LocalDateTime publicadoEn,
            List<EquipoDto> equipos
    ) {}

    public record EquipoDto(
            Long id,
            String nombre,
            String color,
            int totalEstrellas,
            double promedioEstrellas,
            List<JugadorDtos.JugadorDto> jugadores
    ) {}

    public record EncuentroCreateRequest(
            @NotNull(message = "La reserva es requerida")
            Long reservaId,

            @NotBlank(message = "El nombre del encuentro es requerido")
            String nombre,

            BigDecimal apuestaMonto
    ) {}

    public record EncuentroUpdateRequest(
            @NotBlank(message = "El nombre del encuentro es requerido")
            String nombre,

            BigDecimal apuestaMonto
    ) {}

    public record EquipoRequest(
            Long id,
            @NotBlank(message = "El nombre del equipo es requerido")
            String nombre,
            String color,
            List<Long> jugadorIds
    ) {}

    public record ActualizarEquiposRequest(
            @NotEmpty(message = "Debe haber al menos 2 equipos")
            List<EquipoRequest> equipos
    ) {}

    public record BalancearRequest(
            @NotEmpty(message = "Debe seleccionar jugadores")
            List<Long> jugadorIds,
            int numEquipos
    ) {}

    public record SugerenciaEquipoDto(
            String nombre,
            String color,
            int totalEstrellas,
            double promedioEstrellas,
            List<JugadorDtos.JugadorDto> jugadores
    ) {}
}
