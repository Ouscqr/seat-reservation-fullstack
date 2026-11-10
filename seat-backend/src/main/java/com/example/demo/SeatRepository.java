package com.example.demo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface SeatRepository extends JpaRepository <Seat, Long> {
    /*
     * BELANGRIJK: altijd expliciet ordenen.
     * Zonder ORDER BY mag PostgreSQL zelf de volgorde bepalen, en een rij die
     * net ge-UPDATE is (status AVAILABLE -> LOCKED) wordt achteraan de tabel
     * geschreven. Het gevolg in de UI: de gereserveerde stoel "springt naar
     * achteren". H2 gaf toevallig altijd de id-volgorde terug, daarom zag je
     * dit pas na de overstap naar PostgreSQL.
     */
    List<Seat> findAllByOrderByIdAsc ();

    List<Seat> findByStatusOrderByIdAsc (SeatStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s from Seat s WHERE s.id = :id")
    Optional <Seat> findByIdWithLock(@Param("id") Long id);

}
heb geteset moet nu die aanpassingen die test van claude even via github adden !!!! 