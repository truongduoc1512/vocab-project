package com.vocab.backend.dto;

import lombok.Data;

@Data
public class SaveWordRequest {
    private String englishWord;
    private String vietnameseMeaning;
}