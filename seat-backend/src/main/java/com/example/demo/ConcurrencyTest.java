package com.example.demo;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Component
public class ConcurrencyTest implements CommandLineRunner {

    private final SeatService seatService;

    public ConcurrencyTest(SeatService seatService) {
        this.seatService = seatService;
    }

    @Override
    public void run(String... args) throws Exception {
        // We pakken stoel 1 (zorg dat deze op AVAILABLE staat in je database!)
        Long seatId = 1L;

        // We maken 2 "gebruikers" (threads) die hetzelfde proberen te doen
        ExecutorService executor = Executors.newFixedThreadPool(2);

        Runnable task = () -> {
            try {
                String result = seatService.reserveSeat(seatId);
                System.out.println("Gebruiker zegt: " + result);
            } catch (Exception e) {
                // submit() slikt exceptions in; zo zie je ze toch in de console
                System.out.println("Gebruiker kreeg fout: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            }
        };

        System.out.println("--- START CONCURRENCY TEST ---");
        
        // Beide gebruikers klikken exact tegelijk
        executor.submit(task);
        executor.submit(task);

        executor.shutdown();
        while (!executor.isTerminated()) {
            Thread.sleep(100); // Wacht tot beide klaar zijn
        }
        
        System.out.println("--- EINDE TEST ---");
    }
}