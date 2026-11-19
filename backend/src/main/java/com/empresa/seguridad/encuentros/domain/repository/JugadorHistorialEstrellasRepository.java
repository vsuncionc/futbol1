package com.empresa.seguridad.encuentros.domain.repository;

import com.empresa.seguridad.encuentros.domain.model.JugadorHistorialEstrellas;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JugadorHistorialEstrellasRepository extends JpaRepository<JugadorHistorialEstrellas, Long> {
    List<JugadorHistorialEstrellas> findByJugadorIdOrderByCambiadoEnDesc(Long jugadorId);
}
