# Database Schema

The database will be built on PostgreSQL using Prisma ORM.

## Tables

### 1. `users`
- `id`: UUID (Primary Key)
- `name`: String
- `email`: String (Unique)
- `password_hash`: String
- `created_at`: DateTime

### 2. `groups`
- `id`: UUID (Primary Key)
- `name`: String
- `base_currency`: String (e.g., 'INR')
- `created_by`: UUID (Foreign Key to users)
- `created_at`: DateTime

### 3. `group_memberships`
- `id`: UUID (Primary Key)
- `group_id`: UUID (Foreign Key to groups)
- `user_id`: UUID (Foreign Key to users, nullable if guest)
- `member_name`: String (Useful for guests without user accounts)
- `join_date`: DateTime
- `leave_date`: DateTime (Nullable)
- `status`: Enum (ACTIVE, INACTIVE)
- `created_at`: DateTime

### 4. `expenses`
- `id`: UUID (Primary Key)
- `group_id`: UUID (Foreign Key to groups)
- `paid_by_member_id`: UUID (Foreign Key to group_memberships)
- `expense_date`: DateTime
- `description`: String
- `amount_original`: Decimal
- `currency_original`: String
- `amount_base`: Decimal
- `base_currency`: String
- `split_type`: Enum (EQUAL, UNEQUAL, PERCENTAGE, SHARE)
- `note`: String (Nullable)
- `source_import_row_id`: UUID (Nullable, Foreign Key to import_rows)
- `created_at`: DateTime
- `updated_at`: DateTime

### 5. `expense_splits`
- `id`: UUID (Primary Key)
- `expense_id`: UUID (Foreign Key to expenses)
- `member_id`: UUID (Foreign Key to group_memberships)
- `split_method_value`: String (Nullable, stores raw split input like '30' for 30%)
- `percentage`: Decimal (Nullable)
- `share_weight`: Decimal (Nullable)
- `amount_base`: Decimal (Calculated debit in base currency)
- `final_owed_amount`: Decimal (Same as amount_base, explicitly stored)

### 6. `settlements`
- `id`: UUID (Primary Key)
- `group_id`: UUID (Foreign Key to groups)
- `from_member_id`: UUID (Foreign Key to group_memberships)
- `to_member_id`: UUID (Foreign Key to group_memberships)
- `amount`: Decimal
- `currency`: String
- `amount_base`: Decimal
- `payment_date`: DateTime
- `note`: String (Nullable)
- `source_import_row_id`: UUID (Nullable)
- `created_at`: DateTime

### 7. `imports`
- `id`: UUID (Primary Key)
- `group_id`: UUID (Foreign Key to groups)
- `uploaded_by`: UUID (Foreign Key to users)
- `file_name`: String
- `file_hash`: String
- `status`: Enum (PENDING, REVIEWING, COMPLETED, FAILED)
- `total_rows`: Int
- `valid_rows`: Int
- `anomaly_rows`: Int
- `created_at`: DateTime

### 8. `import_rows`
- `id`: UUID (Primary Key)
- `import_id`: UUID (Foreign Key to imports)
- `row_number`: Int
- `raw_payload`: JSONB
- `parsed_status`: Enum (VALID, ANOMALY, RESOLVED, IGNORED)
- `action_taken`: Enum (NONE, IMPORTED, MODIFIED, CONVERTED_TO_SETTLEMENT, DISCARDED)
- `resolved_payload`: JSONB (Nullable)
- `created_at`: DateTime

### 9. `import_anomalies`
- `id`: UUID (Primary Key)
- `import_id`: UUID (Foreign Key to imports)
- `row_id`: UUID (Foreign Key to import_rows)
- `anomaly_type`: Enum (MISSING_DATA, FORMATTING, DUPLICATE, ALIAS, SPLIT_CONFLICT, MEMBERSHIP, SETTLEMENT, NEGATIVE_AMOUNT, ZERO_AMOUNT)
- `severity`: Enum (WARNING, ERROR)
- `description`: String
- `detected_rule`: String
- `final_action`: String (Nullable)
- `user_decision`: String (Nullable)
- `created_at`: DateTime

### 10. `alias_mappings`
- `id`: UUID (Primary Key)
- `group_id`: UUID (Foreign Key to groups)
- `raw_name`: String
- `canonical_member_id`: UUID (Foreign Key to group_memberships)
- `approved_by`: UUID (Foreign Key to users)
- `approved_at`: DateTime

### 11. `exchange_rates`
- `id`: UUID (Primary Key)
- `base_currency`: String
- `quote_currency`: String
- `rate`: Decimal
- `rate_date`: DateTime
- `created_at`: DateTime

### 12. `audit_logs`
- `id`: UUID (Primary Key)
- `actor_user_id`: UUID (Foreign Key to users)
- `entity_type`: String
- `entity_id`: UUID
- `action`: String
- `before_state`: JSONB (Nullable)
- `after_state`: JSONB (Nullable)
- `created_at`: DateTime
