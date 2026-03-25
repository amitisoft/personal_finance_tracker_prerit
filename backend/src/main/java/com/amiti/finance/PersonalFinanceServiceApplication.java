package com.amiti.finance;

import com.amiti.finance.config.JwtProperties;
import com.amiti.finance.config.LoginRateLimitProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({JwtProperties.class, LoginRateLimitProperties.class})
public class PersonalFinanceServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PersonalFinanceServiceApplication.class, args);
    }
}
