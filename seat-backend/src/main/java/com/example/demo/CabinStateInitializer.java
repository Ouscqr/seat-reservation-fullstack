package com.example.demo;

import java.time.Instant;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CabinStateInitializer implements ApplicationRunner {

    private final CabinStateRepository stateRepository;

    public CabinStateInitializer(CabinStateRepository stateRepository) {
        this.stateRepository = stateRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (stateRepository.existsById(1L)) {
            return;
        }
        try {
            stateRepository.save(new CabinState(1L, Instant.now()));
        } catch (DataIntegrityViolationException ignored) {
            // Another instance created it first.
        }
    }
}