package com.amiti.finance.dao;

import com.amiti.finance.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, UUID> {
    List<Account> findAllByUserIdOrderByName(UUID userId);
}
