package com.empresa.seguridad.encuentros.application.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.UUID;

public class JugadorDtos {

    public record JugadorDto(
            Long id,
            UUID tecnicoId,
            String nombre,
            String apodo,
            String posicion,
            String fotoUrl,
            String fotoMiniaturaUrl,
            int estrellas,
            boolean activo,
            LocalDateTime creadoEn
    ) {}

    public record JugadorCreateRequest(
            @NotBlank(message = "El nombre es requerido")
            String nombre,

            String apodo,

            String posicion,

            @NotNull(message = "Las estrellas son requeridas")
            @Min(value = 1, message = "Mínimo 1 estrella")
            @Max(value = 5, message = "Máximo 5 estrellas")
            Integer estrellas,

            Boolean activo
    ) {}

    public record JugadorHistorialDto(
            Long id,
            int estrellasAnterior,
            int estrellasNueva,
            String cambiadoPorNombre,
            LocalDateTime cambiadoEn
    ) {}
}
