package com.example.demo;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(SeatNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleSeatNotFound(SeatNotFoundException ex) {
        Map<String, Object> body = Map.of(
                "error", "Seat not found",
                "message", ex.getMessage(),
                "status", 404
        );
        return new ResponseEntity<>(body, HttpStatus.NOT_FOUND);
    }
}