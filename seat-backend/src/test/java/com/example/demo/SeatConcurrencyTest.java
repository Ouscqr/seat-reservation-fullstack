package com.example.demo;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Bewijst dat de pessimistische lock in SeatRepository.findByIdWithLock ervoor
 * zorgt dat precies één thread dezelfde stoel kan reserveren.
 *
 * De test gebruikt een eigen H2 database (LOCK_TIMEOUT verhoogd), zodat hij
 * niet afhankelijk is van data.sql of van de state die andere tests achterlaten.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:seat-concurrency-test;LOCK_TIMEOUT=10000;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class SeatConcurrencyTest {

    private static final int USERS = 10;

    @Autowired
    private SeatService seatService;

    @Autowired
    private SeatRepository seatRepository;

    private Long seatId;

    @BeforeEach
    void setUp() {
        // Verse stoel per testrun, zodat de uitkomst niet afhangt van eerdere runs.
        Seat seat = new Seat();
        seat.setSeatNumber("TEST-1");
        seat.setStatus(SeatStatus.AVAILABLE);
        seatId = seatRepository.save(seat).getId();
    }

    @Test
    void onlyOneUserCanReserveTheSameSeat() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(USERS);
        CountDownLatch ready = new CountDownLatch(USERS);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger success = new AtomicInteger();
        AtomicInteger failed = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();

        try {
            for (int i = 0; i < USERS; i++) {
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    try {
                        start.await();                 // alle threads wachten op hetzelfde startsein
                        String result = seatService.reserveSeat(seatId);
                        // reserveSeat gooit geen exception bij een bezette stoel, maar
                        // retourneert "This seat is taken" -> dat is een mislukking.
                        if (result != null && result.startsWith("Reserved")) {
                            success.incrementAndGet();
                        } else {
                            failed.incrementAndGet();
                        }
                    } catch (Exception e) {
                        failed.incrementAndGet();
                    }
                }));
            }

            assertTrue(ready.await(5, TimeUnit.SECONDS), "niet alle threads waren klaar");
            start.countDown();                         // startsein
        } finally {
            executor.shutdown();
            assertTrue(executor.awaitTermination(30, TimeUnit.SECONDS), "threads niet binnen de tijd klaar");
        }

        // exceptions in de threads niet stil laten verdwijnen
        for (Future<?> future : futures) {
            future.get();
        }

        assertEquals(1, success.get(), "precies één reservering mag slagen");
        assertEquals(USERS - 1, failed.get(), "alle andere pogingen moeten afgewezen worden");

        Seat stored = seatRepository.findById(seatId).orElseThrow();
        assertEquals(SeatStatus.LOCKED, stored.getStatus(), "stoel moet LOCKED zijn in de database");
    }
}
