package com.vocab.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WordResponse {
    private Long id;
    private String englishWord;
    private String vietnameseMeaning;
}