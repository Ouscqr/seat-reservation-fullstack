package com.example.demo;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service 

public class SeatService {

    private final SeatRepository seatRepository;

    public SeatService (SeatRepository seatRepository) {
        this.seatRepository = seatRepository;
    }

    public List <Seat> getSeats(SeatStatus status) {
        if (status != null) {
            return seatRepository.findByStatus(status);
        }

        return seatRepository.findAll();
    }

    @Transactional 
    public String reserveSeat(Long seatId) {
        // Seat seat = seatRepository.findById(seatId).orElseThrow(() -> new SeatNotFoundException(seatId));
        Seat seat = seatRepository.findByIdWithLock(seatId)
            .orElseThrow(() -> new SeatNotFoundException(seatId));

        if (seat.getStatus() != SeatStatus.AVAILABLE) {
            return "This seat is taken";
        }
        seat.setStatus(SeatStatus.LOCKED);
        seatRepository.save(seat);
        return "Reserved Sucesfully, pay now";

    }

    @Transactional 
    public String releaseSeat(Long seatId) {
        Seat seat = seatRepository.findById(seatId).orElseThrow(() -> new SeatNotFoundException(seatId));
        if (seat.getStatus() != SeatStatus.LOCKED) {
            return "Seat is not LOCKED";
        }

        seat.setStatus(SeatStatus.AVAILABLE);
        seatRepository.save(seat);
        return "Seat " + seat.getSeatNumber() + " is released and available again";
    }
    

}