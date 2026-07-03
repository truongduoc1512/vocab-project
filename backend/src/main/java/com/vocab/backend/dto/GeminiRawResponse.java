package com.vocab.backend.dto;

import java.util.List;

public record GeminiRawResponse(List<Candidate> candidates) {
    public record Candidate(Content content) {}
    public record Content(List<Part> parts) {}
    public record Part(String text) {}
    
    // Hàm tiện ích lấy thẳng chuỗi text kết quả
    public String getExtractedText() {
        if (candidates != null && !candidates.isEmpty()) {
            return candidates.get(0).content().parts().get(0).text();
        }
        return "";
    }
}