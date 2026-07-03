package com.vocab.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SuggestResponse {
    private String word;
    private String suggestedMeaning;
    private String exampleSentence;
}