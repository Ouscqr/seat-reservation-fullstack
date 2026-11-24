package com.example.demo;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SeatService {

    private final SeatRepository seatRepository;
    private final CabinResetService cabinResetService;

    public SeatService(
            SeatRepository seatRepository,
            CabinResetService cabinResetService) {
        this.seatRepository = seatRepository;
        this.cabinResetService = cabinResetService;
    }

    public List<Seat> getSeats(SeatStatus status) {
        if (status != null) {
            return seatRepository.findByStatusOrderByIdAsc(status);
        }
        return seatRepository.findAllByOrderByIdAsc();
    }

    public CabinStatus getCabinStatus() {
        return cabinResetService.status();
    }

    @Transactional
    public String reserveSeat(Long seatId) {
        return reserveSeat(seatId, null);
    }

    @Transactional
    public String reserveSeat(Long seatId, String bookedBy) {
        return reserveLocked(seatId, bookedBy);
    }

    private String reserveLocked(Long seatId, String bookedBy) {
        Seat seat = seatRepository.findByIdWithLock(seatId)
                .orElseThrow(() -> new SeatNotFoundException(seatId));

        if (seat.getStatus() != SeatStatus.AVAILABLE) {
            return "This seat is taken";
        }

        if (bookedBy == null || bookedBy.isBlank()) {
            seat.setStatus(SeatStatus.LOCKED);
            seat.setBookedBy(null);
            seatRepository.save(seat);
            return "Reserved Sucesfully, pay now";
        }

        seat.setStatus(SeatStatus.SOLD);
        seat.setBookedBy(bookedBy.trim());
        seatRepository.save(seat);
        return "Reserved by " + seat.getBookedBy();
    }

    @Transactional
    public String releaseSeat(Long seatId) {
        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new SeatNotFoundException(seatId));

        if (seat.getStatus() != SeatStatus.LOCKED) {
            return "Seat is not LOCKED";
        }

        seat.setStatus(SeatStatus.AVAILABLE);
        seat.setBookedBy(null);
        seatRepository.save(seat);
        return "Seat " + seat.getSeatNumber() + " is released and available again";
    }

    @Transactional
    public String buySeat(Long seatId) {
        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new SeatNotFoundException(seatId));

        if (seat.getStatus() == SeatStatus.SOLD) {
            return "Seat is already bought";
        }

        seat.setStatus(SeatStatus.SOLD);
        seat.setBookedBy(null);
        seatRepository.save(seat);
        return "Paid for the seat congrats";
    }

    @Transactional
    public String sellSeat(Long seatId) {
        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new SeatNotFoundException(seatId));

        if (seat.getStatus() != SeatStatus.SOLD) {
            return "Cant sell what you never bought";
        }

        seat.setStatus(SeatStatus.AVAILABLE);
        seat.setBookedBy(null);
        seatRepository.save(seat);
        return "Sold your seat Good";
    }
}