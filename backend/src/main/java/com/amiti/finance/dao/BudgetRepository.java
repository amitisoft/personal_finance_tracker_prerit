package com.amiti.finance.dao;

import com.amiti.finance.entity.Budget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BudgetRepository extends JpaRepository<Budget, UUID> {
    List<Budget> findAllByUserIdAndMonthAndYearOrderByCreatedAtAsc(UUID userId, int month, int year);

    boolean existsByUserIdAndCategoryIdAndMonthAndYear(UUID userId, UUID categoryId, int month, int year);
}
