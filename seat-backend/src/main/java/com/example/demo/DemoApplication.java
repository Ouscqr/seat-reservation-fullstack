package com.example.demo;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@SpringBootApplication
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }

    @GetMapping("/hello")
    public String hello() {
        return "Hello, seat reservation!123";
    }

    @GetMapping("/iwantaseat")
    public String SeatReservation() {
        return "Okay which one LOL";
    }

    @Bean
    CommandLineRunner initDatabase(SeatRepository repository) {
        return args -> {
            // Als de database leeg is, voeg dan stoelen toe
            if (repository.count() == 0) {
                String[] rows = {"A", "B", "C", "D", "E", "F"};
                for (int i = 1; i <= 3; i++) { // 3 rijen
                    for (String row : rows) {
                        Seat seat = new Seat();
                        seat.setSeatNumber(row + i);
                        seat.setStatus(SeatStatus.AVAILABLE);
                        repository.save(seat);
                    }
                }
                System.out.println("Database gevuld met stoelen!");
            }
        };
    }
        


}