package com.empresa.seguridad.encuentros.domain.repository;

import com.empresa.seguridad.encuentros.domain.model.Jugador;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JugadorRepository extends JpaRepository<Jugador, Long> {
    List<Jugador> findByTecnicoIdOrderByNombreAsc(UUID tecnicoId);
    List<Jugador> findByTecnicoIdAndActivoTrueOrderByNombreAsc(UUID tecnicoId);
    Optional<Jugador> findByIdAndTecnicoId(Long id, UUID tecnicoId);
    boolean existsByTecnicoIdAndNombreIgnoreCase(UUID tecnicoId, String nombre);
}
