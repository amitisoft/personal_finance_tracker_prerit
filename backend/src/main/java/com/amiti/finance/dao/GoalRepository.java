package com.amiti.finance.dao;

import com.amiti.finance.entity.Goal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GoalRepository extends JpaRepository<Goal, UUID> {
    List<Goal> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
}
