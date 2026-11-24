package com.example.demo;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;



@RestController 
@RequestMapping("/seats")
@CrossOrigin(origins = { "http://localhost:5173", "https://seat-reservation-fullstack.vercel.app" })
public class SeatController {


    private final SeatService seatService;
    private final CabinResetService cabinResetService;

    public SeatController(
            SeatService seatService,
            CabinResetService cabinResetService) {
        this.seatService = seatService;
        this.cabinResetService = cabinResetService;
    }

    @GetMapping 
    public List <Seat> GetAllSeats(@RequestParam(required = false) SeatStatus status) {
        cabinResetService.resetIfStale();
        return seatService.getSeats(status);
    }

    @GetMapping("/status")
    public CabinStatus getCabinStatus() {
        cabinResetService.resetIfStale();
        return seatService.getCabinStatus();
    }

    @PostMapping("/{seatId}/reserve")
    public String reserveSeat(
            @PathVariable Long seatId,
            @RequestParam(required = false) String by) {
        cabinResetService.resetIfStale();
        return seatService.reserveSeat(seatId, by);
    }

    @PostMapping("/{seatId}/release")
    public String releaseSeat(@PathVariable Long seatId) {
        cabinResetService.resetIfStale();
        return seatService.releaseSeat(seatId);
    }

    @PostMapping("/{seatId}/buy")
    public String buySeat(@PathVariable Long seatId) {
        cabinResetService.resetIfStale();
        return seatService.buySeat(seatId);
    }

    @PostMapping("/{seatId}/sell")
    public String sellSeat(@PathVariable Long seatId) {
        cabinResetService.resetIfStale();
        return seatService.sellSeat(seatId);
    }

}
