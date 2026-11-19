package com.empresa.seguridad.encuentros.application.dto;

import jakarta.validation.constraints.NotBlank;

public class ParametroDtos {

    public record ParametroDto(
            String clave,
            String valor,
            String descripcion
    ) {}

    public record UpdateParametroRequest(
            @NotBlank(message = "El valor es requerido")
            String valor
    ) {}
}
