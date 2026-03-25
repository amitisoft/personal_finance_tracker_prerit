package com.amiti.finance.dao;

import com.amiti.finance.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findByUserIdOrUserIdIsNullOrderByTypeAscNameAsc(UUID userId);

    Optional<Category> findByIdAndUserId(UUID id, UUID userId);
}
