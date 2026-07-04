package com.vocab.backend.controller;

import com.vocab.backend.dto.SaveWordRequest;
import com.vocab.backend.dto.SuggestResponse;
import com.vocab.backend.dto.WordResponse;
import com.vocab.backend.service.AiService;
import com.vocab.backend.service.WordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/words")
@RequiredArgsConstructor
@Tag(name = "Word Controller", description = "Các API quản lý và tra cứu từ vựng")
public class WordController {

    private final AiService aiService;
    private final WordService wordService;

    @GetMapping("/suggest")
    @Operation(summary = "Gợi ý từ vựng bằng AI", description = "Gọi AI để lấy nghĩa và ví dụ của một từ tiếng Anh")
    public ResponseEntity<SuggestResponse> suggestWord(
            @Parameter(description = "Từ tiếng Anh cần tra cứu", example = "hello") 
            @RequestParam String q) {
        
        if (q == null || q.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        SuggestResponse response = aiService.getSuggestionFromGemini(q.trim().toLowerCase());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Operation(summary = "Lưu từ vựng thủ công", description = "Lưu từ vựng và nghĩa do chính user tự nhập vào")
    public ResponseEntity<?> saveWord(@RequestBody SaveWordRequest request) {
        try {
            WordResponse savedWord = wordService.saveWord(request);
            return ResponseEntity.ok(savedWord);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @Operation(summary = "Sửa từ vựng", description = "Cập nhật từ tiếng Anh hoặc nghĩa tiếng Việt của từ vựng đã lưu")
    public ResponseEntity<?> updateWord(@PathVariable Long id, @RequestBody SaveWordRequest request) {
        try {
            WordResponse updatedWord = wordService.updateWord(id, request);
            return ResponseEntity.ok(updatedWord);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa từ vựng", description = "Xóa từ vựng khỏi sổ tay theo ID")
    public ResponseEntity<?> deleteWord(@PathVariable Long id) {
        try {
            wordService.deleteWord(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách từ vựng", description = "Trả về toàn bộ sổ tay từ vựng đã được sắp xếp A-Z")
    public ResponseEntity<List<WordResponse>> getAllWords() {
        return ResponseEntity.ok(wordService.getAllWords());
    }
}