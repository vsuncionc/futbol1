package com.empresa.seguridad.encuentros.application.service;

import com.empresa.seguridad.encuentros.domain.model.Encuentro;
import com.empresa.seguridad.encuentros.domain.model.EstadoEncuentro;
import com.empresa.seguridad.encuentros.domain.model.EstadoReserva;
import com.empresa.seguridad.encuentros.domain.model.Reserva;
import com.empresa.seguridad.encuentros.domain.repository.EncuentroRepository;
import com.empresa.seguridad.encuentros.domain.repository.ReservaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class EncuentrosScheduledTasks {

    private final ReservaRepository reservaRepository;
    private final EncuentroRepository encuentroRepository;
    private final NotificacionService notificacionService;
    private final ReservaService reservaService;

    // Ejecuta cada 15 minutos (900,000 ms)
    @Scheduled(fixedRate = 900000)
    @Transactional
    public void procesarTransicionesAutomaticas() {
        LocalDate hoy = LocalDate.now(ReservaService.ZONE_LIMA);
        LocalTime ahora = LocalTime.now(ReservaService.ZONE_LIMA);

        // 1. Marcar reservas PENDIENTE pasadas como VENCIDA (Supuesto S2)
        List<Reserva> pendientes = reservaRepository.findByEstado(EstadoReserva.PENDIENTE);
        for (Reserva r : pendientes) {
            if (r.getFecha().isBefore(hoy) || (r.getFecha().isEqual(hoy) && r.getHoraInicio().isBefore(ahora))) {
                r.setEstado(EstadoReserva.VENCIDA);
                reservaRepository.save(r);
                log.info("Reserva ID {} marcada automáticamente como VENCIDA", r.getId());
            }
        }

        // 2. Marcar reservas APROBADA con hora fin pasada como FINALIZADA
        List<Reserva> aprobadas = reservaRepository.findByEstado(EstadoReserva.APROBADA);
        for (Reserva r : aprobadas) {
            if (r.getFecha().isBefore(hoy) || (r.getFecha().isEqual(hoy) && r.getHoraFin().isBefore(ahora))) {
                r.setEstado(EstadoReserva.FINALIZADA);
                reservaRepository.save(r);
            }
        }

        // 3. Transicionar Encuentros: PUBLICADO -> EN_JUEGO -> FINALIZADO
        List<Encuentro> publicados = encuentroRepository.findByEstado(EstadoEncuentro.PUBLICADO);
        for (Encuentro e : publicados) {
            Reserva r = e.getReserva();
            if (r.getFecha().isEqual(hoy) && !ahora.isBefore(r.getHoraInicio()) && ahora.isBefore(r.getHoraFin())) {
                e.setEstado(EstadoEncuentro.EN_JUEGO);
                encuentroRepository.save(e);
            } else if (r.getFecha().isBefore(hoy) || (r.getFecha().isEqual(hoy) && !ahora.isBefore(r.getHoraFin()))) {
                e.setEstado(EstadoEncuentro.FINALIZADO);
                encuentroRepository.save(e);
            }
        }

        List<Encuentro> enJuego = encuentroRepository.findByEstado(EstadoEncuentro.EN_JUEGO);
        for (Encuentro e : enJuego) {
            Reserva r = e.getReserva();
            if (r.getFecha().isBefore(hoy) || (r.getFecha().isEqual(hoy) && !ahora.isBefore(r.getHoraFin()))) {
                e.setEstado(EstadoEncuentro.FINALIZADO);
                encuentroRepository.save(e);
            }
        }
    }

    // Diario 08:00 (Lima): Notificar resumen de alertas rojas al Admin
    @Scheduled(cron = "0 0 8 * * ?", zone = "America/Lima")
    public void notificarAlertasRojasDiarias() {
        var resumen = reservaService.getAlertasSemaforo();
        if (resumen.totalRojas() > 0) {
            notificacionService.notificarAdmins(
                    "ALERTA_SEMAFORO_ROJO",
                    "Alertas de Reservas por Vencer",
                    "Existen " + resumen.totalRojas() + " solicitudes de reserva en semáforo ROJO pendientes de revisión.",
                    "/encuentros/reservas/alertas"
            );
        }
    }
}
