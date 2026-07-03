package com.vocab.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vocab.backend.dto.GeminiRawResponse;
import com.vocab.backend.dto.SuggestResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.url}")
    private String apiUrl;

    @Value("${gemini.api.key}")
    private String apiKey;

    public SuggestResponse getSuggestionFromGemini(String word) {
        // 1. Kỹ thuật Prompt Engineering: Ép AI chỉ trả về JSON thuần túy
        String prompt = String.format(
            "Bạn là từ điển. Hãy giải nghĩa ngắn gọn từ tiếng Anh '%s' sang tiếng Việt và cho 1 ví dụ tiếng Anh có sử dụng từ này. " +
            "TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON NHƯ SAU, KHÔNG GIẢI THÍCH GÌ THÊM: {\"word\": \"%s\", \"suggestedMeaning\": \"nghĩa\", \"exampleSentence\": \"câu ví dụ\"}", 
            word, word
        );

        // 2. Build cấu trúc Body gửi lên Gemini
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)
                        ))
                )
        );

        try {
            // 3. Gọi HTTP POST bằng WebClient
            GeminiRawResponse rawResponse = webClientBuilder.build()
                    .post()
                    .uri(apiUrl + "?key=" + apiKey)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(GeminiRawResponse.class)
                    .block(); // Vì Controller hiện đang đồng bộ (sync) nên dùng block()

            // 4. Lấy text từ AI và dọn dẹp markdown block (nếu AI vô tình bọc ```json ... ```)
            String aiText = rawResponse.getExtractedText()
                    .replaceAll("```json", "")
                    .replaceAll("```", "")
                    .trim();

            // 5. Map chuỗi JSON AI sinh ra thành Object Java
            return objectMapper.readValue(aiText, SuggestResponse.class);

        } catch (JsonProcessingException e) {
            log.error("Lỗi khi parse JSON từ AI cho từ {}: {}", word, e.getMessage());
            throw new RuntimeException("AI trả về sai định dạng dữ liệu");
        } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
            log.error("Lỗi từ API Gemini (Status: {}): {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Lỗi từ dịch vụ AI: " + e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("Lỗi hệ thống khi gọi API Gemini: {}", e.getMessage(), e);
            throw new RuntimeException("Không thể kết nối đến dịch vụ AI: " + e.getMessage());
        }
    }
}