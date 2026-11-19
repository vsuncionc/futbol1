package com.empresa.seguridad.encuentros.domain.repository;

import com.empresa.seguridad.encuentros.domain.model.Notificacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {
    List<Notificacion> findByUsuarioIdOrderByCreadaEnDesc(UUID usuarioId);
    long countByUsuarioIdAndLeidaFalse(UUID usuarioId);
}
