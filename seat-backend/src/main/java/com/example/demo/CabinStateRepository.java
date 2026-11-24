package com.example.demo;

import java.time.Instant;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CabinStateRepository extends JpaRepository<CabinState, Long> {

    @Modifying
    @Query("update CabinState c set c.lastResetAt = :now where c.id = 1 and (c.lastResetAt is null or c.lastResetAt < :cutoff)")
    int claimReset(@Param("now") Instant now, @Param("cutoff") Instant cutoff);
}