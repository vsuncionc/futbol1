package com.empresa.seguridad.encuentros.application.dto;

import com.empresa.seguridad.domain.model.EstadoAprobacion;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

public class SeguridadTecnicoDtos {

    public record TecnicoPendienteDto(
            UUID id,
            String nombres,
            String email,
            String telefono,
            LocalDateTime fechaRegistro,
            EstadoAprobacion estado,
            String motivoRechazo,
            LocalDateTime fechaDecision
    ) {}

    public record DecisionTecnicoRequest(
            @NotBlank(message = "El motivo es requerido")
            @Size(min = 10, message = "El motivo debe tener al menos 10 caracteres")
            String motivo
    ) {}

    public record ConteoPendientesDto(
            long pendientes
    ) {}
}
