package com.amiti.finance.dao;

import com.amiti.finance.entity.FinanceTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface TransactionRepository extends JpaRepository<FinanceTransaction, UUID>, JpaSpecificationExecutor<FinanceTransaction> {
}
