package com.amiti.finance.dao;

import com.amiti.finance.entity.GoalEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GoalEntryRepository extends JpaRepository<GoalEntry, UUID> {
}
