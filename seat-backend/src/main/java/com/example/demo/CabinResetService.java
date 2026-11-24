package com.example.demo;

import java.time.Duration;
import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CabinResetService {

    public static final Duration RESET_INTERVAL = Duration.ofHours(1);

    private final CabinStateRepository stateRepository;
    private final SeatRepository seatRepository;

    public CabinResetService(
            CabinStateRepository stateRepository,
            SeatRepository seatRepository) {
        this.stateRepository = stateRepository;
        this.seatRepository = seatRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void resetIfStale() {
        Instant now = Instant.now();
        Instant cutoff = now.minus(RESET_INTERVAL);

        CabinState state = stateRepository.findById(1L).orElse(null);
        if (state == null) {
            // The startup initializer creates this row. If a request arrives
            // before it exists, skip the check rather than racing the insert.
            return;
        }

        Instant lastResetAt = state.getLastResetAt();
        if (lastResetAt != null && lastResetAt.isAfter(cutoff)) {
            return;
        }

        int claimed = stateRepository.claimReset(now, cutoff);
        if (claimed == 1) {
            seatRepository.resetAll(SeatStatus.AVAILABLE);
        }
    }

    @Transactional(readOnly = true)
    public CabinStatus status() {
        Instant now = Instant.now();
        Instant lastResetAt = stateRepository.findById(1L)
                .map(CabinState::getLastResetAt)
                .orElse(now);

        if (lastResetAt == null) {
            lastResetAt = now;
        }

        return new CabinStatus(
                lastResetAt,
                lastResetAt.plus(RESET_INTERVAL),
                RESET_INTERVAL.toMinutes());
    }
}