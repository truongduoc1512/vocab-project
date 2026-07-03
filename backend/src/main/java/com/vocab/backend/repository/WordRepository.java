package com.vocab.backend.repository;

import com.vocab.backend.entity.Word;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WordRepository extends JpaRepository<Word, Long> {
    // Kiểm tra xem từ vựng đã tồn tại chưa để tránh lưu trùng lặp
    boolean existsByEnglishWord(String englishWord);
    
    // Lấy toàn bộ từ vựng và sắp xếp từ A-Z
    List<Word> findAllByOrderByEnglishWordAsc();
}