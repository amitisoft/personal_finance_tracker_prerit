package com.amiti.finance.dao;

import com.amiti.finance.entity.enums.RecurringStatus;
import com.amiti.finance.entity.RecurringTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface RecurringRepository extends JpaRepository<RecurringTransaction, UUID> {
    List<RecurringTransaction> findAllByUserIdOrderByNextRunDateAsc(UUID userId);

    List<RecurringTransaction> findAllByStatusAndAutoCreateTransactionTrueAndNextRunDateLessThanEqual(RecurringStatus status, LocalDate nextRunDate);
}
