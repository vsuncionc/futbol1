package com.empresa.seguridad.encuentros;

import com.empresa.seguridad.domain.model.EstadoAprobacion;
import com.empresa.seguridad.domain.model.User;
import com.empresa.seguridad.domain.repository.UserRepository;
import com.empresa.seguridad.encuentros.application.dto.EncuentroDtos.ActualizarEquiposRequest;
import com.empresa.seguridad.encuentros.application.dto.EncuentroDtos.EncuentroCreateRequest;
import com.empresa.seguridad.encuentros.application.dto.EncuentroDtos.EncuentroDto;
import com.empresa.seguridad.encuentros.application.dto.EncuentroDtos.EquipoRequest;
import com.empresa.seguridad.encuentros.application.dto.JugadorDtos.JugadorDto;
import com.empresa.seguridad.encuentros.application.dto.ReservaDtos.AlertaReservaDto;
import com.empresa.seguridad.encuentros.application.dto.ReservaDtos.AlertaResumenDto;
import com.empresa.seguridad.encuentros.application.dto.ReservaDtos.ReservaCreateRequest;
import com.empresa.seguridad.encuentros.application.dto.ReservaDtos.ReservaDto;
import com.empresa.seguridad.encuentros.application.service.EncuentroService;
import com.empresa.seguridad.encuentros.application.service.JugadorService;
import com.empresa.seguridad.encuentros.application.service.ReservaService;
import com.empresa.seguridad.encuentros.application.service.TecnicoApprovalService;
import com.empresa.seguridad.encuentros.domain.model.Cancha;
import com.empresa.seguridad.encuentros.domain.model.EstadoEncuentro;
import com.empresa.seguridad.encuentros.domain.model.EstadoReserva;
import com.empresa.seguridad.encuentros.domain.model.Reserva;
import com.empresa.seguridad.encuentros.domain.repository.CanchaRepository;
import com.empresa.seguridad.encuentros.domain.repository.EncuentroRepository;
import com.empresa.seguridad.encuentros.domain.repository.ReservaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class EncuentrosModuleTests {

    @Autowired
    private ReservaService reservaService;

    @Autowired
    private JugadorService jugadorService;

    @Autowired
    private EncuentroService encuentroService;

    @Autowired
    private TecnicoApprovalService approvalService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CanchaRepository canchaRepository;

    @Autowired
    private ReservaRepository reservaRepository;

    @Autowired
    private EncuentroRepository encuentroRepository;

    private User admin;
    private User tecnicoActivo;
    private User tecnicoPendiente;
    private Cancha cancha;

    @BeforeEach
    void setUp() {
        admin = userRepository.findByEmail("admin@demo.pe")
                .orElseThrow(() -> new IllegalStateException("admin@demo.pe no encontrado"));
        tecnicoActivo = userRepository.findByEmail("tecnico1@demo.pe")
                .orElseThrow(() -> new IllegalStateException("tecnico1@demo.pe no encontrado"));
        tecnicoPendiente = userRepository.findByEmail("tecnico2@demo.pe")
                .orElseThrow(() -> new IllegalStateException("tecnico2@demo.pe no encontrado"));
        cancha = canchaRepository.findAll().get(0);
    }

    @Test
    @DisplayName("Escenario: Semaforo - reservas a 0, 2, 3 y 5 dias asignan colores correctos")
    void testSemaforoAlertas() {
        AlertaResumenDto resumen = reservaService.getAlertasSemaforo();
        assertNotNull(resumen);
        assertTrue(resumen.totalRojas() >= 1, "Debe haber alertas rojas");
        assertTrue(resumen.totalAmbar() >= 1, "Debe haber alertas ambar");
        assertTrue(resumen.totalVerdes() >= 1, "Debe haber alertas verdes");

        for (AlertaReservaDto a : resumen.alertas()) {
            if (a.diasRestantes() <= 2) {
                assertEquals("ROJO", a.semaforo());
                assertTrue(a.textoSemaforo().contains("Vence"));
            } else if (a.diasRestantes() == 3) {
                assertEquals("AMBAR", a.semaforo());
                assertEquals("Vence en 3 días", a.textoSemaforo());
            } else {
                assertEquals("VERDE", a.semaforo());
                assertTrue(a.textoSemaforo().contains("Sin urgencia"));
            }
        }
    }

    @Test
    @DisplayName("Escenario: Tecnico PENDIENTE no puede solicitar reservas")
    void testTecnicoPendienteCannotCreateReserva() {
        LocalDate fecha = LocalDate.now().plusDays(10);
        ReservaCreateRequest req = new ReservaCreateRequest(
                cancha.getId(), fecha, LocalTime.of(16, 0), LocalTime.of(17, 30), null
        );

        SecurityException ex = assertThrows(SecurityException.class, () -> {
            reservaService.solicitarReserva(req, null, tecnicoPendiente);
        });
        assertTrue(ex.getMessage().contains("PENDIENTE"));
    }

    @Test
    @DisplayName("Escenario: Admin aprueba tecnico PENDIENTE pasando a ACTIVO")
    void testAprobarTecnico() {
        assertEquals(EstadoAprobacion.PENDIENTE, tecnicoPendiente.getEstadoAprobacion());
        var res = approvalService.aprobarTecnico(tecnicoPendiente.getId(), admin);
        assertEquals(EstadoAprobacion.ACTIVO, res.estado());

        User updated = userRepository.findById(tecnicoPendiente.getId()).orElseThrow();
        assertEquals(EstadoAprobacion.ACTIVO, updated.getEstadoAprobacion());
    }

    @Test
    @DisplayName("Escenario: Rechazo de reserva exige motivo obligatorio")
    void testRechazoExigeMotivo() {
        LocalDate fecha = LocalDate.now().plusDays(8);
        ReservaDto reserva = reservaService.solicitarReserva(
                new ReservaCreateRequest(cancha.getId(), fecha, LocalTime.of(18, 0), LocalTime.of(19, 0), null),
                null,
                admin
        );

        assertThrows(IllegalArgumentException.class, () -> {
            reservaService.rechazarReserva(reserva.id(), "   ", admin);
        });
    }

    @Test
    @DisplayName("Escenario: Cruces entre reservas APROBADAS en misma cancha son rechazados (RN-01, RN-02)")
    void testReservaCrucesValidation() {
        LocalDate fecha = LocalDate.now().plusDays(12);

        // Reserva 1: 18:00 a 19:30 (Aprobada)
        ReservaDto res1 = reservaService.solicitarReserva(
                new ReservaCreateRequest(cancha.getId(), fecha, LocalTime.of(18, 0), LocalTime.of(19, 30), null),
                null,
                admin
        );
        assertEquals(EstadoReserva.APROBADA, res1.estado());

        // Reserva 2 que se cruza: 19:00 a 20:30 (Intentar crear aprobada o aprobarla)
        assertThrows(IllegalStateException.class, () -> {
            reservaService.solicitarReserva(
                    new ReservaCreateRequest(cancha.getId(), fecha, LocalTime.of(19, 0), LocalTime.of(20, 30), null),
                    null,
                    admin
            );
        });
    }

    @Test
    @DisplayName("Escenario: Equipos 4 a 8 jugadores y validacion de duplicados (RN-15, RN-16, RN-17)")
    void testEquiposReglas() {
        // Buscar reserva aprobada sin encuentro
        List<ReservaDto> disponibles = encuentroService.getReservasDisponibles(tecnicoActivo);
        assertFalse(disponibles.isEmpty(), "Debe haber al menos una reserva disponible para pruebas");
        ReservaDto reserva = disponibles.get(0);

        EncuentroDto encuentro = encuentroService.crearEncuentro(
                new EncuentroCreateRequest(reserva.id(), "Torneo Relampago", BigDecimal.valueOf(30)),
                null,
                tecnicoActivo
        );

        List<JugadorDto> misJugadores = jugadorService.getMisJugadores(tecnicoActivo);
        assertTrue(misJugadores.size() >= 12);

        List<Long> equipo1Jugadores = misJugadores.subList(0, 3).stream().map(JugadorDto::id).toList(); // solo 3
        List<Long> equipo2Jugadores = misJugadores.subList(3, 7).stream().map(JugadorDto::id).toList(); // 4

        // Asignar equipos en borrador
        encuentroService.actualizarEquipos(
                encuentro.id(),
                new ActualizarEquiposRequest(List.of(
                        new EquipoRequest(null, "Equipo A", "#FF0000", equipo1Jugadores),
                        new EquipoRequest(null, "Equipo B", "#0000FF", equipo2Jugadores)
                )),
                tecnicoActivo
        );

        // Intentar publicar con un equipo de 3 jugadores debe fallar (RN-16)
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            encuentroService.publicarEncuentro(encuentro.id(), tecnicoActivo);
        });
        assertTrue(ex.getMessage().contains("entre 4 y 8 jugadores"));

        // Intentar asignar el mismo jugador a ambos equipos debe fallar (RN-17)
        List<Long> duplicados = List.of(misJugadores.get(0).id(), misJugadores.get(1).id());
        assertThrows(IllegalArgumentException.class, () -> {
            encuentroService.actualizarEquipos(
                    encuentro.id(),
                    new ActualizarEquiposRequest(List.of(
                            new EquipoRequest(null, "Equipo A", "#FF0000", duplicados),
                            new EquipoRequest(null, "Equipo B", "#0000FF", duplicados)
                    )),
                    tecnicoActivo
            );
        });
    }

    @Test
    @DisplayName("Escenario: Cancelar reserva cancela encuentro automaticamente (RN-08)")
    void testCancelarReservaCancelaEncuentro() {
        // Encontrar el encuentro publicado de las semillas
        var encuentros = encuentroRepository.findAll();
        var publicado = encuentros.stream()
                .filter(e -> e.getEstado() == EstadoEncuentro.PUBLICADO)
                .findFirst()
                .orElseThrow();

        Reserva reserva = publicado.getReserva();

        // Cancelar la reserva
        reservaService.cancelarReserva(reserva.getId(), "Cancelacion por lluvia torrencial", admin);

        Reserva cancelada = reservaRepository.findById(reserva.getId()).orElseThrow();
        assertEquals(EstadoReserva.CANCELADA, cancelada.getEstado());

        var encuentroActualizado = encuentroRepository.findById(publicado.getId()).orElseThrow();
        assertEquals(EstadoEncuentro.CANCELADO, encuentroActualizado.getEstado());
    }

    @Test
    @DisplayName("Escenario: Una reserva tiene como maximo un encuentro (RN-14)")
    void testUnaReservaUnEncuentro() {
        var encuentros = encuentroRepository.findAll();
        var publicado = encuentros.get(0);

        assertThrows(IllegalStateException.class, () -> {
            encuentroService.crearEncuentro(
                    new EncuentroCreateRequest(publicado.getReserva().getId(), "Otro Encuentro", null),
                    null,
                    tecnicoActivo
            );
        });
    }

    @Test
    @DisplayName("Escenario: Aislamiento entre tecnicos - Tecnico 2 no accede a recursos de Tecnico 1")
    void testAislamientoEntreTecnicos() {
        List<JugadorDto> jugadoresTecnico1 = jugadorService.getMisJugadores(tecnicoActivo);
        assertFalse(jugadoresTecnico1.isEmpty());
        Long jugadorId = jugadoresTecnico1.get(0).id();

        // Tecnico 2 intenta obtenerlo
        assertThrows(SecurityException.class, () -> {
            jugadorService.getById(jugadorId, tecnicoPendiente);
        });
    }
}
