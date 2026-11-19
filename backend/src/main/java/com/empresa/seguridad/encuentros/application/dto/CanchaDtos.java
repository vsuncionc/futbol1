package com.empresa.seguridad.encuentros.application.dto;

import java.math.BigDecimal;

public class CanchaDtos {

    public record CanchaDto(
            Long id,
            String nombre,
            String tipo,
            BigDecimal tarifaHora,
            boolean activa
    ) {}
}
