package com.empresa.seguridad.encuentros.domain.repository;

import com.empresa.seguridad.encuentros.domain.model.Encuentro;
import com.empresa.seguridad.encuentros.domain.model.EstadoEncuentro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EncuentroRepository extends JpaRepository<Encuentro, Long> {

    List<Encuentro> findByTecnicoIdOrderByCreadoEnDesc(UUID tecnicoId);

    Optional<Encuentro> findByIdAndTecnicoId(Long id, UUID tecnicoId);

    Optional<Encuentro> findByReservaId(Long reservaId);

    boolean existsByReservaId(Long reservaId);

    @Query("SELECT e FROM Encuentro e WHERE e.estado IN ('PUBLICADO', 'EN_JUEGO') " +
           "AND (:canchaId IS NULL OR e.reserva.cancha.id = :canchaId) " +
           "AND (:fecha IS NULL OR e.reserva.fecha = :fecha) " +
           "ORDER BY e.reserva.fecha ASC, e.reserva.horaInicio ASC")
    List<Encuentro> findPublicEncuentros(
            @Param("canchaId") Long canchaId,
            @Param("fecha") LocalDate fecha
    );

    @Query("SELECT e FROM Encuentro e WHERE e.estado = 'FINALIZADO' " +
           "ORDER BY e.reserva.fecha DESC, e.reserva.horaInicio DESC")
    List<Encuentro> findPastEncuentros();

    List<Encuentro> findByEstado(EstadoEncuentro estado);
}
