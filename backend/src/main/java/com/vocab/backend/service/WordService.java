package com.vocab.backend.service;

import com.vocab.backend.dto.SaveWordRequest;
import com.vocab.backend.dto.WordResponse;
import com.vocab.backend.entity.Word;
import com.vocab.backend.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WordService {

    private final WordRepository wordRepository;

    public WordResponse saveWord(SaveWordRequest request) {
        if (request.getEnglishWord() == null || request.getEnglishWord().trim().isEmpty()) {
            throw new RuntimeException("Từ tiếng Anh không được để trống!");
        }
        if (request.getVietnameseMeaning() == null || request.getVietnameseMeaning().trim().isEmpty()) {
            throw new RuntimeException("Nghĩa tiếng Việt không được để trống!");
        }

        String wordToSave = request.getEnglishWord().trim().toLowerCase();

        if (wordRepository.existsByEnglishWord(wordToSave)) {
            log.warn("Từ vựng '{}' đã tồn tại trong hệ thống.", wordToSave);
            throw new RuntimeException("Từ này đã có trong sổ tay của bạn!");
        }

        Word newWord = new Word();
        newWord.setEnglishWord(wordToSave);
        newWord.setVietnameseMeaning(request.getVietnameseMeaning().trim());
        
        log.info("Đang lưu từ vựng mới: {}", wordToSave);
        Word savedEntity = wordRepository.save(newWord);

        return WordResponse.builder()
                .id(savedEntity.getId())
                .englishWord(savedEntity.getEnglishWord())
                .vietnameseMeaning(savedEntity.getVietnameseMeaning())
                .build();
    }

    public List<WordResponse> getAllWords() {
        return wordRepository.findAllByOrderByEnglishWordAsc()
                .stream()
                .map(word -> WordResponse.builder()
                        .id(word.getId())
                        .englishWord(word.getEnglishWord())
                        .vietnameseMeaning(word.getVietnameseMeaning())
                        .build())
                .collect(Collectors.toList());
    }
}