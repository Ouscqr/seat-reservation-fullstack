package com.example.demo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface SeatRepository extends JpaRepository <Seat, Long> {
    List<Seat> findByStatus (SeatStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s from Seat s WHERE s.id = :id")
    Optional <Seat> findByIdWithLock(@Param("id") Long id);

}
