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
@CrossOrigin(origins = "http://localhost:5173")
public class SeatController {


    private final SeatService seatService;

    public SeatController (SeatService seatService) {
        this.seatService = seatService;
    }

    @GetMapping 
    public List <Seat> GetAllSeats(@RequestParam(required = false) SeatStatus status) {
        return seatService.getSeats(status);
    }

    //Vraag waarom moeten wij hier geen instance van maken zoals hierboven "private final SeatService seatService"
    //En ook waarom wij geen instance van SeatController maken met reserveSeat als field
    // @PostMapping("/{seatId}/reserve")
    // public String reserveSeat (@PathVariable Long seatId){
    //     return seatService.reserveSeat(seatId);
    // }

    @PostMapping("/{seatId}/reserve")
    public String reserveSeat(@PathVariable Long seatId) {
        return seatService.reserveSeat(seatId);
    }

    @PostMapping("/{seatId}/release")
    public String releaseSeat(@PathVariable Long seatId) {
        return seatService.releaseSeat(seatId);
    }


}
