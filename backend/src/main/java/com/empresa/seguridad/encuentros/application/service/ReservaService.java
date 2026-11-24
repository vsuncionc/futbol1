package com.empresa.seguridad.encuentros.application.service;

import com.empresa.seguridad.domain.model.EstadoAprobacion;
import com.empresa.seguridad.domain.model.User;
import com.empresa.seguridad.domain.repository.UserRepository;
import com.empresa.seguridad.encuentros.application.dto.ReservaDtos.*;
import com.empresa.seguridad.encuentros.domain.model.Cancha;
import com.empresa.seguridad.encuentros.domain.model.EstadoEncuentro;
import com.empresa.seguridad.encuentros.domain.model.EstadoReserva;
import com.empresa.seguridad.encuentros.domain.model.Reserva;
import com.empresa.seguridad.encuentros.domain.repository.CanchaRepository;
import com.empresa.seguridad.encuentros.domain.repository.EncuentroRepository;
import com.empresa.seguridad.encuentros.domain.repository.ReservaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservaService {

    public static final ZoneId ZONE_LIMA = ZoneId.of("America/Lima");

    private final ReservaRepository reservaRepository;
    private final CanchaRepository canchaRepository;
    private final UserRepository userRepository;
    private final EncuentroRepository encuentroRepository;
    private final FileStorageService fileStorageService;
    private final ParametroService parametroService;
    private final NotificacionService notificacionService;
    private final AuditoriaEncuentrosService auditoriaService;

    @Transactional
    public ReservaDto solicitarReserva(ReservaCreateRequest req, MultipartFile comprobante, User usuario) {
        validarTecnicoActivo(usuario);

        Cancha cancha = canchaRepository.findById(req.canchaId())
                .orElseThrow(() -> new IllegalArgumentException("Cancha no encontrada con id: " + req.canchaId()));
        if (!cancha.isActiva()) {
            throw new IllegalArgumentException("La cancha seleccionada no se encuentra activa");
        }

        validarFechaYHorarios(req.fecha(), req.horaInicio(), req.horaFin());

        boolean isAdmin = esAdmin(usuario);
        User tecnicoAsignado = usuario;

        if (isAdmin && req.tecnicoId() != null) {
            tecnicoAsignado = userRepository.findById(req.tecnicoId())
                    .orElseThrow(() -> new IllegalArgumentException("Técnico asignado no encontrado"));
        }

        // RN-06: Comprobante obligatorio para técnico, opcional para admin
        String comprobanteUrl = null;
        String comprobanteTipo = null;
        boolean obligaComprobante = parametroService.getBoolean("COMPROBANTE_OBLIGATORIO_TECNICO", false);

        if (!isAdmin && obligaComprobante) {
            if (comprobante == null || comprobante.isEmpty()) {
                throw new IllegalArgumentException("El comprobante de pago es obligatorio para solicitar la reserva.");
            }
        }

        if (comprobante != null && !comprobante.isEmpty()) {
            comprobanteUrl = fileStorageService.storeComprobante(comprobante);
            comprobanteTipo = comprobante.getContentType();
        }

        // Cálculo de monto
        BigDecimal horas = calcularHoras(req.horaInicio(), req.horaFin());
        BigDecimal monto = cancha.getTarifaHora().multiply(horas).setScale(2, RoundingMode.HALF_UP);

        EstadoReserva estadoInicial = isAdmin ? EstadoReserva.APROBADA : EstadoReserva.PENDIENTE;

        // Si es Admin y nace APROBADA, validar cruces de inmediato (RN-01)
        if (isAdmin) {
            List<Reserva> cruces = reservaRepository.findOverlappingApprovedReservations(
                    cancha.getId(), req.fecha(), req.horaInicio(), req.horaFin(), null);
            if (!cruces.isEmpty()) {
                throw new IllegalStateException("Existe un cruce con otra reserva ya aprobada en este horario.");
            }
        }

        Reserva reserva = Reserva.builder()
                .cancha(cancha)
                .tecnico(tecnicoAsignado)
                .fecha(req.fecha())
                .horaInicio(req.horaInicio())
                .horaFin(req.horaFin())
                .monto(monto)
                .estado(estadoInicial)
                .comprobanteUrl(comprobanteUrl)
                .comprobanteTipo(comprobanteTipo)
                .creadaPor(usuario)
                .decididaPor(isAdmin ? usuario : null)
                .fechaDecision(isAdmin ? LocalDateTime.now(ZONE_LIMA) : null)
                .build();

        Reserva saved = reservaRepository.save(reserva);

        if (!isAdmin) {
            notificacionService.notificarAdmins(
                    "NUEVA_RESERVA",
                    "Nueva solicitud de reserva",
                    "El técnico " + usuario.getFullName() + " solicitó reserva en " + cancha.getNombre() + " para el "
                            + req.fecha(),
                    "/encuentros/reservas/solicitudes");
        }

        auditoriaService.registrar(usuario, "RESERVA", saved.getId(), "CREAR_RESERVA",
                "Reserva creada con estado: " + estadoInicial + " en cancha: " + cancha.getNombre());

        return mapToDto(saved);
    }

    @Transactional
    public ReservaDto aprobarReserva(Long reservaId, User admin) {
        Reserva reserva = reservaRepository.findById(reservaId)
                .orElseThrow(() -> new IllegalArgumentException("Reserva no encontrada con id: " + reservaId));

        if (reserva.getEstado() != EstadoReserva.PENDIENTE) {
            throw new IllegalStateException("Solo se pueden aprobar reservas en estado PENDIENTE.");
        }

        // RN-02: Revalidar cruces dentro de la transacción con bloqueo
        List<Reserva> cruces = reservaRepository.findOverlappingApprovedReservations(
                reserva.getCancha().getId(),
                reserva.getFecha(),
                reserva.getHoraInicio(),
                reserva.getHoraFin(),
                reserva.getId());

        if (!cruces.isEmpty()) {
            throw new IllegalStateException(
                    "Conflicto de horario: Ya existe una reserva aprobada para la misma cancha en este horario.");
        }

        reserva.setEstado(EstadoReserva.APROBADA);
        reserva.setDecididaPor(admin);
        reserva.setFechaDecision(LocalDateTime.now(ZONE_LIMA));
        reserva.setMotivoRechazo(null);

        Reserva saved = reservaRepository.save(reserva);

        notificacionService.crearNotificacion(
                reserva.getTecnico(),
                "RESERVA_APROBADA",
                "¡Reserva Aprobada!",
                "Tu reserva para " + reserva.getCancha().getNombre() + " el " + reserva.getFecha() + " ("
                        + reserva.getHoraInicio() + " - " + reserva.getHoraFin() + ") ha sido aprobada.",
                "/encuentros/eventos/nuevo");

        auditoriaService.registrar(admin, "RESERVA", saved.getId(), "APROBAR_RESERVA",
                "Reserva aprobada por administrador: " + admin.getEmail());

        return mapToDto(saved);
    }

    @Transactional
    public ReservaDto rechazarReserva(Long reservaId, String motivo, User admin) {
        if (motivo == null || motivo.trim().isEmpty()) {
            throw new IllegalArgumentException("El motivo de rechazo es obligatorio.");
        }

        Reserva reserva = reservaRepository.findById(reservaId)
                .orElseThrow(() -> new IllegalArgumentException("Reserva no encontrada con id: " + reservaId));

        if (reserva.getEstado() != EstadoReserva.PENDIENTE) {
            throw new IllegalStateException("Solo se pueden rechazar reservas en estado PENDIENTE.");
        }

        reserva.setEstado(EstadoReserva.RECHAZADA);
        reserva.setMotivoRechazo(motivo.trim());
        reserva.setDecididaPor(admin);
        reserva.setFechaDecision(LocalDateTime.now(ZONE_LIMA));

        Reserva saved = reservaRepository.save(reserva);

        notificacionService.crearNotificacion(
                reserva.getTecnico(),
                "RESERVA_RECHAZADA",
                "Reserva rechazada",
                "Tu reserva para el " + reserva.getFecha() + " fue rechazada. Motivo: " + motivo.trim(),
                "/encuentros/reservas/mias");

        auditoriaService.registrar(admin, "RESERVA", saved.getId(), "RECHAZAR_RESERVA",
                "Reserva rechazada con motivo: " + motivo);

        return mapToDto(saved);
    }

    @Transactional
    public ReservaDto cancelarReserva(Long reservaId, String motivo, User usuario) {
        Reserva reserva = reservaRepository.findById(reservaId)
                .orElseThrow(() -> new IllegalArgumentException("Reserva no encontrada con id: " + reservaId));

        boolean isAdmin = esAdmin(usuario);

        // Regla de propiedad
        if (!isAdmin && !reserva.getTecnico().getId().equals(usuario.getId())) {
            throw new SecurityException("No tienes permiso para cancelar esta reserva.");
        }

        if (reserva.getEstado() != EstadoReserva.PENDIENTE && reserva.getEstado() != EstadoReserva.APROBADA) {
            throw new IllegalStateException("Solo se pueden cancelar reservas en estado PENDIENTE o APROBADA.");
        }

        // RN-07: Ventana mínima de cancelación para técnicos
        if (!isAdmin) {
            int horasMinimas = parametroService.getInt("CANCELACION_HORAS_MIN", 24);
            LocalDateTime inicioReserva = LocalDateTime.of(reserva.getFecha(), reserva.getHoraInicio());
            LocalDateTime ahora = LocalDateTime.now(ZONE_LIMA);

            if (ChronoUnit.HOURS.between(ahora, inicioReserva) < horasMinimas) {
                throw new IllegalStateException(
                        "Solo puedes cancelar con al menos " + horasMinimas + " horas de anticipación.");
            }
        }

        reserva.setEstado(EstadoReserva.CANCELADA);
        reserva.setMotivoCancelacion(motivo != null ? motivo.trim() : "Cancelada por el usuario");
        Reserva saved = reservaRepository.save(reserva);

        // RN-08: Cancelar encuentro asociado si existe
        encuentroRepository.findByReservaId(reservaId).ifPresent(encuentro -> {
            if (encuentro.getEstado() != EstadoEncuentro.CANCELADO
                    && encuentro.getEstado() != EstadoEncuentro.FINALIZADO) {
                encuentro.setEstado(EstadoEncuentro.CANCELADO);
                encuentroRepository.save(encuentro);
                notificacionService.crearNotificacion(
                        reserva.getTecnico(),
                        "ENCUENTRO_CANCELADO",
                        "Encuentro Cancelado",
                        "El encuentro '" + encuentro.getNombre()
                                + "' fue cancelado debido a la cancelación de su reserva.",
                        "/encuentros/eventos");
            }
        });

        auditoriaService.registrar(usuario, "RESERVA", saved.getId(), "CANCELAR_RESERVA",
                "Reserva cancelada: " + reserva.getMotivoCancelacion());

        return mapToDto(saved);
    }

    @Transactional
    public ReservaDto reprogramarReserva(Long reservaId, ReprogramarReservaRequest req, User usuario) {
        Reserva reserva = reservaRepository.findById(reservaId)
                .orElseThrow(() -> new IllegalArgumentException("Reserva no encontrada con id: " + reservaId));

        boolean isAdmin = esAdmin(usuario);
        if (!isAdmin && !reserva.getTecnico().getId().equals(usuario.getId())) {
            throw new SecurityException("No tienes permiso para reprogramar esta reserva.");
        }

        validarFechaYHorarios(req.fecha(), req.horaInicio(), req.horaFin());

        List<Reserva> cruces = reservaRepository.findOverlappingApprovedReservations(
                reserva.getCancha().getId(), req.fecha(), req.horaInicio(), req.horaFin(), reserva.getId());
        if (!cruces.isEmpty()) {
            throw new IllegalStateException("Existe un cruce con otra reserva aprobada en el nuevo horario.");
        }

        reserva.setFecha(req.fecha());
        reserva.setHoraInicio(req.horaInicio());
        reserva.setHoraFin(req.horaFin());

        BigDecimal horas = calcularHoras(req.horaInicio(), req.horaFin());
        reserva.setMonto(reserva.getCancha().getTarifaHora().multiply(horas).setScale(2, RoundingMode.HALF_UP));

        // Si lo hace el técnico, vuelve a PENDIENTE
        if (!isAdmin) {
            reserva.setEstado(EstadoReserva.PENDIENTE);
        }

        Reserva saved = reservaRepository.save(reserva);
        auditoriaService.registrar(usuario, "RESERVA", saved.getId(), "REPROGRAMAR_RESERVA",
                "Nueva fecha: " + req.fecha());

        return mapToDto(saved);
    }

    @Transactional
    public ReservaDto actualizarComprobante(Long reservaId, MultipartFile file, User tecnico) {
        Reserva reserva = reservaRepository.findById(reservaId)
                .orElseThrow(() -> new IllegalArgumentException("Reserva no encontrada"));

        if (!esAdmin(tecnico) && !reserva.getTecnico().getId().equals(tecnico.getId())) {
            throw new SecurityException("No autorizado");
        }
        if (reserva.getEstado() != EstadoReserva.PENDIENTE) {
            throw new IllegalStateException(
                    "Solo se puede actualizar el comprobante mientras la reserva esté PENDIENTE.");
        }

        String url = fileStorageService.storeComprobante(file);
        reserva.setComprobanteUrl(url);
        reserva.setComprobanteTipo(file.getContentType());
        return mapToDto(reservaRepository.save(reserva));
    }

    @Transactional(readOnly = true)
    public List<ReservaDto> getMisReservas(User tecnico) {
        if (esAdmin(tecnico)) {
            List<Reserva> propias = reservaRepository.findByTecnicoIdOrderByFechaDescHoraInicioDesc(tecnico.getId());
            if (!propias.isEmpty()) {
                return propias.stream().map(this::mapToDto).toList();
            }
            return reservaRepository.findAll().stream()
                    .sorted((a, b) -> b.getFecha().compareTo(a.getFecha()))
                    .map(this::mapToDto)
                    .toList();
        }
        return reservaRepository.findByTecnicoIdOrderByFechaDescHoraInicioDesc(tecnico.getId())
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReservaDto> getSolicitudesPendientes() {
        return reservaRepository.findPendientesParaAlertas(EstadoReserva.PENDIENTE)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReservaDto> getCalendario(LocalDate desde, LocalDate hasta, Long canchaId, EstadoReserva estado,
            UUID tecnicoId) {
        LocalDate start = (desde != null) ? desde : LocalDate.now(ZONE_LIMA).minusMonths(1);
        LocalDate end = (hasta != null) ? hasta : LocalDate.now(ZONE_LIMA).plusMonths(2);

        return reservaRepository.findForCalendar(start, end, canchaId, estado, tecnicoId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DisponibilidadSlotDto> getDisponibilidadPublica(LocalDate desde, LocalDate hasta, Long canchaId) {
        LocalDate start = (desde != null) ? desde : LocalDate.now(ZONE_LIMA);
        LocalDate end = (hasta != null) ? hasta : LocalDate.now(ZONE_LIMA).plusWeeks(2);

        List<Reserva> aprobadas = reservaRepository.findPublicAvailability(start, end, canchaId);

        return aprobadas.stream()
                .map(r -> new DisponibilidadSlotDto(
                        r.getCancha().getId(),
                        r.getCancha().getNombre(),
                        r.getFecha(),
                        r.getHoraInicio(),
                        r.getHoraFin(),
                        "OCUPADO"))
                .toList();
    }

    @Transactional(readOnly = true)
    public AlertaResumenDto getAlertasSemaforo() {
        LocalDate hoy = LocalDate.now(ZONE_LIMA);
        int umbralRojo = parametroService.getInt("ALERTA_ROJO_DIAS", 2);
        int umbralAmbar = parametroService.getInt("ALERTA_AMBAR_DIAS", 3);
        boolean mostrarVerde = parametroService.getBoolean("MOSTRAR_SEMAFORO_VERDE", true);

        List<Reserva> pendientes = reservaRepository.findPendientesParaAlertas(EstadoReserva.PENDIENTE);
        List<AlertaReservaDto> alertas = new ArrayList<>();

        long totalRojas = 0;
        long totalAmbar = 0;
        long totalVerdes = 0;

        for (Reserva r : pendientes) {
            long diasRestantes = ChronoUnit.DAYS.between(hoy, r.getFecha());

            String semaforo;
            String texto;

            if (diasRestantes <= umbralRojo) {
                semaforo = "ROJO";
                texto = (diasRestantes <= 0) ? "Vence hoy"
                        : (diasRestantes == 1 ? "Vence en 1 día" : "Vence en " + diasRestantes + " días");
                totalRojas++;
            } else if (diasRestantes == umbralAmbar) {
                semaforo = "AMBAR";
                texto = "Vence en " + diasRestantes + " días";
                totalAmbar++;
            } else {
                semaforo = "VERDE";
                texto = "Sin urgencia (" + diasRestantes + " días)";
                totalVerdes++;
                if (!mostrarVerde)
                    continue;
            }

            boolean enConflicto = tieneCruces(r);

            alertas.add(new AlertaReservaDto(
                    r.getId(),
                    r.getTecnico().getId(),
                    r.getTecnico().getFullName(),
                    r.getCancha().getId(),
                    r.getCancha().getNombre(),
                    r.getFecha(),
                    r.getHoraInicio(),
                    r.getHoraFin(),
                    r.getMonto(),
                    diasRestantes,
                    semaforo,
                    texto,
                    r.getComprobanteUrl(),
                    enConflicto));
        }

        // Ordenar por días restantes ascendente
        alertas.sort(Comparator.comparingLong(AlertaReservaDto::diasRestantes));

        return new AlertaResumenDto(totalRojas, totalAmbar, totalVerdes, alertas);
    }

    @Transactional(readOnly = true)
    public ReservaDto getById(Long id, User usuario) {
        Reserva r = reservaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Reserva no encontrada con id: " + id));

        if (!esAdmin(usuario) && !r.getTecnico().getId().equals(usuario.getId())) {
            throw new SecurityException("No tienes permiso para ver esta reserva.");
        }
        return mapToDto(r);
    }

    private void validarTecnicoActivo(User usuario) {
        if (!esAdmin(usuario)) {
            if (usuario.getEstadoAprobacion() == EstadoAprobacion.PENDIENTE) {
                throw new SecurityException(
                        "Tu cuenta se encuentra en estado 'PENDIENTE'. Solo los técnicos aprobados y activos pueden solicitar reservas.");
            } else if (usuario.getEstadoAprobacion() == EstadoAprobacion.SUSPENDIDO) {
                throw new SecurityException(
                        "Tu cuenta se encuentra en estado 'SUSPENDIDO'. No puedes solicitar reservas.");
            } else if (usuario.getEstadoAprobacion() == EstadoAprobacion.RECHAZADO) {
                throw new SecurityException("Tu cuenta se encuentra en estado 'RECHAZADO' por un administrador.");
            }
        }
    }

    private void validarFechaYHorarios(LocalDate fecha, LocalTime horaInicio, LocalTime horaFin) {
        if (fecha == null || horaInicio == null || horaFin == null) {
            throw new IllegalArgumentException("Fecha y horas de inicio y fin son obligatorias.");
        }

        LocalDate hoy = LocalDate.now(ZONE_LIMA);
        LocalTime ahora = LocalTime.now(ZONE_LIMA);

        // RN-04: No permitir reservas en el pasado
        if (fecha.isBefore(hoy) || (fecha.isEqual(hoy) && horaInicio.isBefore(ahora))) {
            throw new IllegalArgumentException("No se pueden solicitar reservas para fechas u horas en el pasado.");
        }

        if (!horaFin.isAfter(horaInicio)) {
            throw new IllegalArgumentException("La hora de fin debe ser posterior a la hora de inicio.");
        }

        // RN-05: Solo horas enteras (minutos en 00) y duración min/max (1h a 24h)
        boolean esFinDeDia = (horaFin.getHour() == 23 && horaFin.getMinute() == 59);
        if (horaInicio.getMinute() != 0 || (horaFin.getMinute() != 0 && !esFinDeDia)) {
            throw new IllegalArgumentException("Las reservas solo se permiten en horas enteras (ej. 08:00, 09:00).");
        }

        long minutos = Duration.between(horaInicio, horaFin).toMinutes();
        if (esFinDeDia) {
            minutos += 1; // 23:59 cuenta como 24:00 (hora completa)
        }
        int minHoras = parametroService.getInt("RESERVA_DURACION_MIN_H", 1);
        int maxHoras = parametroService.getInt("RESERVA_DURACION_MAX_H", 24);

        if (minutos < (minHoras * 60) || minutos > (maxHoras * 60) || minutos % 60 != 0) {
            throw new IllegalArgumentException("La duración debe ser de horas enteras entre " + minHoras + " y " + maxHoras + " horas.");
        }
    }

    private BigDecimal calcularHoras(LocalTime inicio, LocalTime fin) {
        long minutos = Duration.between(inicio, fin).toMinutes();
        if (fin.getHour() == 23 && fin.getMinute() == 59) {
            minutos += 1;
        }
        return BigDecimal.valueOf(minutos).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }

    public boolean verificarDisponibilidadConfirmada(Long canchaId, LocalDate fecha, LocalTime horaInicio,
            LocalTime horaFin, Long excluirReservaId) {
        List<Reserva> cruces = reservaRepository.findOverlappingApprovedReservations(
                canchaId, fecha, horaInicio, horaFin, excluirReservaId);
        return cruces.isEmpty();
    }

    private boolean tieneCruces(Reserva r) {
        List<Reserva> cruces = reservaRepository.findOverlappingApprovedReservations(
                r.getCancha().getId(), r.getFecha(), r.getHoraInicio(), r.getHoraFin(), r.getId());
        return !cruces.isEmpty();
    }

    public boolean esAdmin(User user) {
        if (user == null || user.getRoles() == null)
            return false;
        return user.getRoles().stream()
                .anyMatch(r -> "ROLE_ADMIN".equals(r.getCode()) || "ROLE_SUPER_ADMIN".equals(r.getCode()));
    }

    public ReservaDto mapToDto(Reserva r) {
        boolean enConflicto = (r.getEstado() == EstadoReserva.PENDIENTE) && tieneCruces(r);

        return new ReservaDto(
                r.getId(),
                r.getCancha().getId(),
                r.getCancha().getNombre(),
                r.getCancha().getTipo(),
                r.getTecnico().getId(),
                r.getTecnico().getFullName(),
                r.getTecnico().getEmail(),
                r.getFecha(),
                r.getHoraInicio(),
                r.getHoraFin(),
                r.getMonto(),
                r.getEstado(),
                r.getComprobanteUrl(),
                r.getComprobanteTipo(),
                r.getMotivoRechazo(),
                r.getMotivoCancelacion(),
                enConflicto,
                r.getCreadaEn(),
                r.getActualizadaEn());
    }
}
