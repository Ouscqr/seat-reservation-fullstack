package com.example.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class CabinState {

    @Id
    private Long id;

    private Instant lastResetAt;

    public CabinState(Long id, Instant lastResetAt) {
        this.id = id;
        this.lastResetAt = lastResetAt;
    }
}