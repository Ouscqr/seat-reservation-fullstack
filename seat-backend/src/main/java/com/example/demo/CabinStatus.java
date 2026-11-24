package com.example.demo;

import java.time.Instant;

public record CabinStatus(Instant lastResetAt, Instant nextResetAt, long resetIntervalMinutes) {
}