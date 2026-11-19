package com.empresa.seguridad.encuentros.application.service;

import com.empresa.seguridad.domain.model.EstadoAprobacion;
import com.empresa.seguridad.domain.model.User;
import com.empresa.seguridad.encuentros.application.dto.EncuentroDtos.*;
import com.empresa.seguridad.encuentros.application.dto.ReservaDtos.ReservaDto;
import com.empresa.seguridad.encuentros.domain.model.Encuentro;
import com.empresa.seguridad.encuentros.domain.model.Equipo;
import com.empresa.seguridad.encuentros.domain.model.EstadoEncuentro;
import com.empresa.seguridad.encuentros.domain.model.EstadoReserva;
import com.empresa.seguridad.encuentros.domain.model.Jugador;
import com.empresa.seguridad.encuentros.domain.model.Reserva;
import com.empresa.seguridad.encuentros.domain.repository.EncuentroRepository;
import com.empresa.seguridad.encuentros.domain.repository.JugadorRepository;
import com.empresa.seguridad.encuentros.domain.repository.ReservaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class EncuentroService {

    private final EncuentroRepository encuentroRepository;
    private final ReservaRepository reservaRepository;
    private final JugadorRepository jugadorRepository;
    private final FileStorageService fileStorageService;
    private final ParametroService parametroService;
    private final ReservaService reservaService;
    private final JugadorService jugadorService;
    private final AuditoriaEncuentrosService auditoriaService;

    @Transactional(readOnly = true)
    public List<ReservaDto> getReservasDisponibles(User tecnico) {
        LocalDate hoy = LocalDate.now(ReservaService.ZONE_LIMA);
        LocalTime ahora = LocalTime.now(ReservaService.ZONE_LIMA);

        return reservaRepository.findAvailableForEncuentro(tecnico.getId(), hoy, ahora)
                .stream()
                .map(reservaService::mapToDto)
                .toList();
    }

    @Transactional
    public EncuentroDto crearEncuentro(EncuentroCreateRequest req, MultipartFile banner, User tecnico) {
        validarTecnicoActivo(tecnico);

        Reserva reserva = reservaRepository.findById(req.reservaId())
                .orElseThrow(() -> new IllegalArgumentException("Reserva no encontrada con id: " + req.reservaId()));

        // RN-13: Solo se crea encuentro desde reserva APROBADA
        if (reserva.getEstado() != EstadoReserva.APROBADA) {
            throw new IllegalStateException("Solo se puede crear un encuentro sobre una reserva en estado APROBADA.");
        }

        // RN-14: Una reserva tiene como máximo un encuentro
        if (encuentroRepository.existsByReservaId(reserva.getId())) {
            throw new IllegalStateException("Esta reserva ya tiene un encuentro asignado.");
        }

        // Regla de propiedad de reserva
        if (!reservaService.esAdmin(tecnico) && !reserva.getTecnico().getId().equals(tecnico.getId())) {
            throw new SecurityException("No puedes crear encuentros sobre reservas de otro técnico.");
        }

        // RN-19: Apuesta opcional > 0
        if (req.apuestaMonto() != null && req.apuestaMonto().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El monto de apuesta debe ser mayor a 0.");
        }

        String bannerUrl = null;
        if (banner != null && !banner.isEmpty()) {
            bannerUrl = fileStorageService.storeBanner(banner);
        }

        Encuentro encuentro = Encuentro.builder()
                .reserva(reserva)
                .tecnico(tecnico)
                .nombre(req.nombre().trim())
                .bannerUrl(bannerUrl)
                .apuestaMonto(req.apuestaMonto())
                .estado(EstadoEncuentro.BORRADOR)
                .build();

        Encuentro saved = encuentroRepository.save(encuentro);
        auditoriaService.registrar(tecnico, "ENCUENTRO", saved.getId(), "CREAR_ENCUENTRO", "Borrador de encuentro creado: " + saved.getNombre());

        return mapToDto(saved);
    }

    @Transactional
    public EncuentroDto actualizarEncuentro(Long id, EncuentroUpdateRequest req, MultipartFile banner, User tecnico) {
        Encuentro encuentro = getEncuentroVerificandoAcceso(id, tecnico);
        validarTecnicoActivo(tecnico);

        if (req.apuestaMonto() != null && req.apuestaMonto().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El monto de apuesta debe ser mayor a 0.");
        }

        encuentro.setNombre(req.nombre().trim());
        encuentro.setApuestaMonto(req.apuestaMonto());

        if (banner != null && !banner.isEmpty()) {
            String bannerUrl = fileStorageService.storeBanner(banner);
            encuentro.setBannerUrl(bannerUrl);
        }

        Encuentro saved = encuentroRepository.save(encuentro);
        return mapToDto(saved);
    }

    @Transactional
    public EncuentroDto actualizarEquipos(Long id, ActualizarEquiposRequest req, User tecnico) {
        Encuentro encuentro = getEncuentroVerificandoAcceso(id, tecnico);
        validarTecnicoActivo(tecnico);

        if (encuentro.getEstado() == EstadoEncuentro.PUBLICADO) {
            int horasMinEdicion = parametroService.getInt("EDICION_HORAS_MIN", 2);
            LocalDateTime inicioReserva = LocalDateTime.of(encuentro.getReserva().getFecha(), encuentro.getReserva().getHoraInicio());
            LocalDateTime ahora = LocalDateTime.now(ReservaService.ZONE_LIMA);

            if (ChronoUnit.HOURS.between(ahora, inicioReserva) < horasMinEdicion) {
                throw new IllegalStateException("Solo se permite editar jugadores hasta " + horasMinEdicion + " horas antes del inicio.");
            }
        }

        // RN-15: Mínimo 2 equipos
        if (req.equipos() == null || req.equipos().size() < 2) {
            throw new IllegalArgumentException("El encuentro debe tener al menos 2 equipos.");
        }

        int maxJugadores = parametroService.getInt("EQUIPO_MAX_JUGADORES", 8);

        // RN-17: Un jugador no puede estar en dos equipos del mismo encuentro
        Set<Long> jugadorIdsUnicos = new HashSet<>();
        List<Equipo> nuevosEquipos = new ArrayList<>();

        for (EquipoRequest eqReq : req.equipos()) {
            List<Long> jIds = eqReq.jugadorIds() != null ? eqReq.jugadorIds() : Collections.emptyList();

            // RN-16: Máximo 8 jugadores por equipo se valida siempre
            if (jIds.size() > maxJugadores) {
                throw new IllegalArgumentException("El equipo '" + eqReq.nombre() + "' excede el máximo de " + maxJugadores + " jugadores.");
            }

            for (Long jId : jIds) {
                if (!jugadorIdsUnicos.add(jId)) {
                    throw new IllegalArgumentException("El jugador con ID " + jId + " está asignado a más de un equipo.");
                }
            }

            // RN-18: Solo jugadores activos y propios del técnico
            List<Jugador> jugadores = new ArrayList<>();
            for (Long jId : jIds) {
                Jugador j = jugadorRepository.findById(jId)
                        .orElseThrow(() -> new IllegalArgumentException("Jugador no encontrado: " + jId));

                if (!reservaService.esAdmin(tecnico) && !j.getTecnico().getId().equals(tecnico.getId())) {
                    throw new SecurityException("El jugador " + j.getNombre() + " no pertenece a este técnico.");
                }
                if (!j.isActivo()) {
                    throw new IllegalArgumentException("El jugador " + j.getNombre() + " está inactivo.");
                }
                jugadores.add(j);
            }

            Equipo equipo = Equipo.builder()
                    .encuentro(encuentro)
                    .nombre(eqReq.nombre().trim())
                    .color(eqReq.color() != null ? eqReq.color().trim() : "#0066FF")
                    .jugadores(jugadores)
                    .build();

            nuevosEquipos.add(equipo);
        }

        encuentro.getEquipos().clear();
        encuentro.getEquipos().addAll(nuevosEquipos);

        Encuentro saved = encuentroRepository.save(encuentro);
        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public List<SugerenciaEquipoDto> balancearEquipos(BalancearRequest req, User tecnico) {
        int nEquipos = (req.numEquipos() >= 2) ? req.numEquipos() : 2;
        int maxPorEquipo = parametroService.getInt("EQUIPO_MAX_JUGADORES", 8);

        List<Jugador> jugadores = jugadorRepository.findAllById(req.jugadorIds());

        // Ordenar descendente por estrellas
        jugadores.sort(Comparator.comparingInt(Jugador::getEstrellas).reversed());

        List<List<Jugador>> equiposJugadores = new ArrayList<>();
        for (int i = 0; i < nEquipos; i++) {
            equiposJugadores.add(new ArrayList<>());
        }

        // Algoritmo Snake Draft (10.3.1): A, B, B, A, A, B...
        boolean haciaAdelante = true;
        int idxEquipo = 0;

        for (Jugador j : jugadores) {
            // Buscar un equipo con cupo (< maxPorEquipo)
            int intentos = 0;
            while (equiposJugadores.get(idxEquipo).size() >= maxPorEquipo && intentos < nEquipos) {
                if (haciaAdelante) {
                    idxEquipo++;
                    if (idxEquipo >= nEquipos) {
                        idxEquipo = nEquipos - 1;
                        haciaAdelante = false;
                    }
                } else {
                    idxEquipo--;
                    if (idxEquipo < 0) {
                        idxEquipo = 0;
                        haciaAdelante = true;
                    }
                }
                intentos++;
            }

            if (equiposJugadores.get(idxEquipo).size() < maxPorEquipo) {
                equiposJugadores.get(idxEquipo).add(j);
            }

            // Avanzar en patrón serpiente
            if (haciaAdelante) {
                idxEquipo++;
                if (idxEquipo >= nEquipos) {
                    idxEquipo = nEquipos - 1;
                    haciaAdelante = false;
                }
            } else {
                idxEquipo--;
                if (idxEquipo < 0) {
                    idxEquipo = 0;
                    haciaAdelante = true;
                }
            }
        }

        String[] colores = new String[]{"#0066FF", "#DC2626", "#16A34A", "#CA8A04"};
        List<SugerenciaEquipoDto> resultado = new ArrayList<>();

        for (int i = 0; i < nEquipos; i++) {
            List<Jugador> jList = equiposJugadores.get(i);
            int totalEstrellas = jList.stream().mapToInt(Jugador::getEstrellas).sum();
            double promedio = jList.isEmpty() ? 0.0 : ((double) totalEstrellas / jList.size());

            resultado.add(new SugerenciaEquipoDto(
                    "Equipo " + (i + 1),
                    colores[i % colores.length],
                    totalEstrellas,
                    Math.round(promedio * 10.0) / 10.0,
                    jList.stream().map(jugadorService::mapToDto).toList()
            ));
        }

        return resultado;
    }

    @Transactional
    public EncuentroDto publicarEncuentro(Long id, User tecnico) {
        Encuentro encuentro = getEncuentroVerificandoAcceso(id, tecnico);
        validarTecnicoActivo(tecnico);

        // RN-20: Validaciones para publicar
        if (encuentro.getReserva().getEstado() != EstadoReserva.APROBADA) {
            throw new IllegalStateException("La reserva debe encontrarse APROBADA para publicar el encuentro.");
        }

        LocalDate hoy = LocalDate.now(ReservaService.ZONE_LIMA);
        LocalTime ahora = LocalTime.now(ReservaService.ZONE_LIMA);
        if (encuentro.getReserva().getFecha().isBefore(hoy) ||
                (encuentro.getReserva().getFecha().isEqual(hoy) && encuentro.getReserva().getHoraFin().isBefore(ahora))) {
            throw new IllegalStateException("La reserva ya ha finalizado.");
        }

        if (encuentro.getEquipos().size() < 2) {
            throw new IllegalStateException("El encuentro debe tener al menos 2 equipos para ser publicado.");
        }

        int minJugadores = parametroService.getInt("EQUIPO_MIN_JUGADORES", 4);
        int maxJugadores = parametroService.getInt("EQUIPO_MAX_JUGADORES", 8);

        for (Equipo eq : encuentro.getEquipos()) {
            if (eq.getJugadores().size() < minJugadores || eq.getJugadores().size() > maxJugadores) {
                throw new IllegalStateException("El equipo '" + eq.getNombre() + "' tiene " + eq.getJugadores().size() +
                        " jugadores. Cada equipo debe tener entre " + minJugadores + " y " + maxJugadores + " jugadores para publicar.");
            }
        }

        encuentro.setEstado(EstadoEncuentro.PUBLICADO);
        encuentro.setPublicadoEn(LocalDateTime.now(ReservaService.ZONE_LIMA));
        Encuentro saved = encuentroRepository.save(encuentro);

        auditoriaService.registrar(tecnico, "ENCUENTRO", saved.getId(), "PUBLICAR_ENCUENTRO", "Encuentro publicado: " + saved.getNombre());
        return mapToDto(saved);
    }

    @Transactional
    public EncuentroDto cancelarEncuentro(Long id, User tecnico) {
        Encuentro encuentro = getEncuentroVerificandoAcceso(id, tecnico);
        validarTecnicoActivo(tecnico);

        encuentro.setEstado(EstadoEncuentro.CANCELADO);
        Encuentro saved = encuentroRepository.save(encuentro);
        auditoriaService.registrar(tecnico, "ENCUENTRO", saved.getId(), "CANCELAR_ENCUENTRO", "Encuentro cancelado: " + saved.getNombre());
        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public List<EncuentroDto> getMisEncuentros(User tecnico) {
        if (reservaService.esAdmin(tecnico)) {
            return encuentroRepository.findAll().stream().map(this::mapToDto).toList();
        }
        return encuentroRepository.findByTecnicoIdOrderByCreadoEnDesc(tecnico.getId())
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EncuentroDto> getPublicEncuentros(Long canchaId, LocalDate fecha) {
        return encuentroRepository.findPublicEncuentros(canchaId, fecha)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EncuentroDto> getPastPublicEncuentros() {
        return encuentroRepository.findPastEncuentros()
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public EncuentroDto getById(Long id) {
        Encuentro e = encuentroRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Encuentro no encontrado con id: " + id));
        return mapToDto(e);
    }

    private Encuentro getEncuentroVerificandoAcceso(Long id, User usuario) {
        Encuentro e = encuentroRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Encuentro no encontrado con id: " + id));

        if (!reservaService.esAdmin(usuario) && !e.getTecnico().getId().equals(usuario.getId())) {
            throw new SecurityException("No tienes permiso para gestionar este encuentro.");
        }
        return e;
    }

    private void validarTecnicoActivo(User usuario) {
        if (!reservaService.esAdmin(usuario)) {
            if (usuario.getEstadoAprobacion() != EstadoAprobacion.ACTIVO) {
                throw new SecurityException("Tu cuenta se encuentra en estado '" + usuario.getEstadoAprobacion() + "'. No puedes gestionar encuentros.");
            }
        }
    }

    private String resolverUrlPublica(String relativePath) {
        if (relativePath == null || relativePath.trim().isEmpty()) {
            return null;
        }
        if (relativePath.startsWith("http://") || relativePath.startsWith("https://") || relativePath.startsWith("data:")) {
            return relativePath;
        }
        String clean = relativePath.startsWith("/") ? relativePath.substring(1) : relativePath;
        return "http://localhost:8080/api/v1/publico/archivos/" + clean;
    }

    public EncuentroDto mapToDto(Encuentro e) {
        List<EquipoDto> equiposDto = e.getEquipos().stream().map(eq -> {
            int totalEstrellas = eq.getJugadores().stream().mapToInt(Jugador::getEstrellas).sum();
            double promedio = eq.getJugadores().isEmpty() ? 0.0 : ((double) totalEstrellas / eq.getJugadores().size());
            return new EquipoDto(
                    eq.getId(),
                    eq.getNombre(),
                    eq.getColor(),
                    totalEstrellas,
                    Math.round(promedio * 10.0) / 10.0,
                    eq.getJugadores().stream().map(jugadorService::mapToDto).toList()
            );
        }).toList();

        return new EncuentroDto(
                e.getId(),
                e.getReserva().getId(),
                e.getReserva().getCancha().getId(),
                e.getReserva().getCancha().getNombre(),
                e.getReserva().getCancha().getTipo(),
                e.getReserva().getFecha(),
                e.getReserva().getHoraInicio(),
                e.getReserva().getHoraFin(),
                e.getTecnico().getId(),
                e.getTecnico().getFullName(),
                e.getNombre(),
                resolverUrlPublica(e.getBannerUrl()),
                e.getApuestaMonto(),
                e.getEstado(),
                e.getCreadoEn(),
                e.getPublicadoEn(),
                equiposDto
        );
    }
}
