package com.example.demo;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SeatConcurrencyTest {

    private static final int BOTS = 12;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${local.server.port}")
    private int port;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private CabinStateRepository cabinStateRepository;

    @Autowired
    private CabinResetService cabinResetService;

    @Test
    void exactlyOneNamedRequestWinsAndBookedByMatches() throws Exception {
        Seat seat = firstAvailableSeat();
        seat.setStatus(SeatStatus.AVAILABLE);
        seat.setBookedBy(null);
        seatRepository.saveAndFlush(seat);
        setLastResetAt(Instant.now());

        ExecutorService pool = Executors.newFixedThreadPool(BOTS);
        CountDownLatch ready = new CountDownLatch(BOTS);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<String>> futures = new ArrayList<>();

        try {
            for (int i = 1; i <= BOTS; i++) {
                String bot = "Bot " + i;
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    start.await();
                    return reserve(seat.getId(), bot);
                }));
            }

            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            List<String> responses = new ArrayList<>();
            for (Future<String> future : futures) {
                responses.add(future.get(20, TimeUnit.SECONDS));
            }

            List<String> winners = responses.stream()
                    .filter(response -> response != null && response.startsWith("Reserved by "))
                    .toList();

            assertThat(winners).hasSize(1);
            assertThat(responses.stream()
                    .filter("This seat is taken"::equals)
                    .count()).isEqualTo(BOTS - 1);

            Seat after = seatRepository.findById(seat.getId()).orElseThrow();
            assertThat(after.getStatus()).isEqualTo(SeatStatus.SOLD);
            assertThat(after.getBookedBy())
                    .isEqualTo(winners.get(0).substring("Reserved by ".length()));
        } finally {
            pool.shutdownNow();
            Seat cleanup = seatRepository.findById(seat.getId()).orElse(null);
            if (cleanup != null) {
                cleanup.setStatus(SeatStatus.AVAILABLE);
                cleanup.setBookedBy(null);
                seatRepository.saveAndFlush(cleanup);
            }
        }
    }

    @Test
    void staleCabinResetsSeatsAndClearsBookedBy() {
        Seat seat = firstAvailableSeat();
        seat.setStatus(SeatStatus.SOLD);
        seat.setBookedBy("Bot 1");
        seatRepository.saveAndFlush(seat);

        Instant stale = Instant.now().minus(Duration.ofHours(2));
        setLastResetAt(stale);

        cabinResetService.resetIfStale();

        Seat after = seatRepository.findById(seat.getId()).orElseThrow();
        assertThat(after.getStatus()).isEqualTo(SeatStatus.AVAILABLE);
        assertThat(after.getBookedBy()).isNull();

        Instant newReset = cabinStateRepository.findById(1L)
                .orElseThrow()
                .getLastResetAt();
        assertThat(newReset).isAfter(stale);
    }

    private Seat firstAvailableSeat() {
        return seatRepository.findAllByOrderByIdAsc().stream()
                .filter(seat -> seat.getStatus() == SeatStatus.AVAILABLE)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No available seat for the test"));
    }

    private String reserve(Long seatId, String bot) throws IOException, InterruptedException {
        String path = "/seats/" + seatId + "/reserve?by="
                + URLEncoder.encode(bot, StandardCharsets.UTF_8);
        HttpRequest request = HttpRequest.newBuilder(
                        URI.create("http://localhost:" + port + path))
                .header("Accept", "text/plain")
                .POST(HttpRequest.BodyPublishers.noBody())
                .build();

        return httpClient.send(request, HttpResponse.BodyHandlers.ofString()).body();
    }

    private void setLastResetAt(Instant instant) {
        CabinState state = cabinStateRepository.findById(1L)
                .orElseGet(() -> new CabinState(1L, instant));
        state.setLastResetAt(instant);
        cabinStateRepository.saveAndFlush(state);
    }
}