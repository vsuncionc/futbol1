package com.empresa.seguridad.encuentros.domain.repository;

import com.empresa.seguridad.encuentros.domain.model.EstadoReserva;
import com.empresa.seguridad.encuentros.domain.model.Reserva;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public interface ReservaRepository extends JpaRepository<Reserva, Long> {

    List<Reserva> findByTecnicoIdOrderByFechaDescHoraInicioDesc(UUID tecnicoId);

    Page<Reserva> findByTecnicoId(UUID tecnicoId, Pageable pageable);

    List<Reserva> findByEstado(EstadoReserva estado);

    long countByEstado(EstadoReserva estado);

    @Query("SELECT r FROM Reserva r WHERE r.estado = :estado ORDER BY r.fecha ASC, r.horaInicio ASC")
    List<Reserva> findPendientesParaAlertas(@Param("estado") EstadoReserva estado);

    // Búsqueda de cruces con reservas APROBADAS (RN-01, RN-02)
    @Query("SELECT r FROM Reserva r WHERE r.cancha.id = :canchaId " +
           "AND r.fecha = :fecha " +
           "AND r.estado = 'APROBADA' " +
           "AND (:excludeId IS NULL OR r.id != :excludeId) " +
           "AND (r.horaInicio < :horaFin AND r.horaFin > :horaInicio)")
    List<Reserva> findOverlappingApprovedReservations(
            @Param("canchaId") Long canchaId,
            @Param("fecha") LocalDate fecha,
            @Param("horaInicio") LocalTime horaInicio,
            @Param("horaFin") LocalTime horaFin,
            @Param("excludeId") Long excludeId
    );

    // Búsqueda de cruces con otras reservas PENDIENTES (para marcar en conflicto RN-03)
    @Query("SELECT r FROM Reserva r WHERE r.cancha.id = :canchaId " +
           "AND r.fecha = :fecha " +
           "AND r.estado = 'PENDIENTE' " +
           "AND r.id != :reservaId " +
           "AND (r.horaInicio < :horaFin AND r.horaFin > :horaInicio)")
    List<Reserva> findOverlappingPendingReservations(
            @Param("canchaId") Long canchaId,
            @Param("fecha") LocalDate fecha,
            @Param("horaInicio") LocalTime horaInicio,
            @Param("horaFin") LocalTime horaFin,
            @Param("reservaId") Long reservaId
    );

    // Calendario administrativo
    @Query("SELECT r FROM Reserva r WHERE r.fecha BETWEEN :desde AND :hasta " +
           "AND (:canchaId IS NULL OR r.cancha.id = :canchaId) " +
           "AND (:estado IS NULL OR r.estado = :estado) " +
           "AND (:tecnicoId IS NULL OR r.tecnico.id = :tecnicoId) " +
           "ORDER BY r.fecha ASC, r.horaInicio ASC")
    List<Reserva> findForCalendar(
            @Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta,
            @Param("canchaId") Long canchaId,
            @Param("estado") EstadoReserva estado,
            @Param("tecnicoId") UUID tecnicoId
    );

    // Disponibilidad pública (solo APROBADA)
    @Query("SELECT r FROM Reserva r WHERE r.fecha BETWEEN :desde AND :hasta " +
           "AND (:canchaId IS NULL OR r.cancha.id = :canchaId) " +
           "AND r.estado = 'APROBADA' " +
           "ORDER BY r.fecha ASC, r.horaInicio ASC")
    List<Reserva> findPublicAvailability(
            @Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta,
            @Param("canchaId") Long canchaId
    );

    // Reservas aprobadas futuras y sin encuentro del técnico
    @Query("SELECT r FROM Reserva r WHERE r.tecnico.id = :tecnicoId " +
           "AND r.estado = 'APROBADA' " +
           "AND (r.fecha > :hoy OR (r.fecha = :hoy AND r.horaInicio > :ahora)) " +
           "AND NOT EXISTS (SELECT e FROM Encuentro e WHERE e.reserva.id = r.id AND e.estado != 'CANCELADO') " +
           "ORDER BY r.fecha ASC, r.horaInicio ASC")
    List<Reserva> findAvailableForEncuentro(
            @Param("tecnicoId") UUID tecnicoId,
            @Param("hoy") LocalDate hoy,
            @Param("ahora") LocalTime ahora
    );
}
