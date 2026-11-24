package com.empresa.seguridad.encuentros.application.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class CanchaDtos {

    public record CanchaDto(
            Long id,
            String nombre,
            String tipo,
            BigDecimal tarifaHora,
            boolean activa
    ) {}

    public record UpdateTarifaRequest(
            @NotNull(message = "La tarifa por hora es requerida")
            @DecimalMin(value = "0.01", message = "La tarifa debe ser mayor a cero")
            BigDecimal tarifaHora
    ) {}
}
