package com.empresa.seguridad.encuentros.application.dto;

import java.time.LocalDateTime;

public class NotificacionDtos {

    public record NotificacionDto(
            Long id,
            String tipo,
            String titulo,
            String mensaje,
            String enlace,
            boolean leida,
            LocalDateTime creadaEn
    ) {}
}
