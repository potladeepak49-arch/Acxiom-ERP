
-- ==========================================
-- ACXIOMCRM DATABASE SCHEMA
-- PostgreSQL 18
-- ==========================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- 1. ROLES
-- ==========================================

CREATE TABLE roles (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (role_name)
VALUES
    ('Admin'),
    ('Manager'),
    ('SalesExecutive')
ON CONFLICT (role_name) DO NOTHING;


-- ==========================================
-- 2. USERS
-- ==========================================

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash TEXT NOT NULL,

    role_id UUID NOT NULL
        REFERENCES roles(role_id),

    phone VARCHAR(15),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    lockout_until TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_failed_attempts_check
        CHECK (failed_login_attempts >= 0)
);

CREATE UNIQUE INDEX users_email_unique
ON users (LOWER(email));


-- ==========================================
-- 3. CUSTOMERS
-- ==========================================

CREATE TABLE customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code VARCHAR(30) UNIQUE NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(15) NOT NULL,

    company_name VARCHAR(150),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),

    status VARCHAR(20) NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active', 'Inactive')),

    owner_id UUID REFERENCES users(user_id),
    created_by UUID REFERENCES users(user_id),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX customers_email_unique
ON customers (LOWER(email));

CREATE UNIQUE INDEX customers_phone_unique
ON customers (phone);

CREATE INDEX customers_name_idx
ON customers(customer_name);


-- ==========================================
-- 4. LEADS
-- ==========================================

CREATE TABLE leads (
    lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_code VARCHAR(30) UNIQUE NOT NULL,
    lead_name VARCHAR(150) NOT NULL,

    email VARCHAR(150),
    phone VARCHAR(15),
    company_name VARCHAR(150),

    source VARCHAR(50),

    status VARCHAR(30) NOT NULL DEFAULT 'New'
        CHECK (status IN (
            'New',
            'Contacted',
            'Qualified',
            'Unqualified',
            'Converted',
            'Lost'
        )),

    priority VARCHAR(20) NOT NULL DEFAULT 'Medium'
        CHECK (priority IN ('Low', 'Medium', 'High')),

    expected_value NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (expected_value >= 0),

    assigned_to UUID REFERENCES users(user_id),
    converted_customer_id UUID REFERENCES customers(customer_id),
    created_by UUID REFERENCES users(user_id),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX leads_status_idx
ON leads(status);

CREATE INDEX leads_assigned_idx
ON leads(assigned_to);


-- ==========================================
-- 5. OPPORTUNITIES
-- ==========================================

CREATE TABLE opportunities (
    opportunity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    opportunity_name VARCHAR(150) NOT NULL,

    customer_id UUID REFERENCES customers(customer_id),
    lead_id UUID REFERENCES leads(lead_id),

    amount NUMERIC(14,2) NOT NULL
        CHECK (amount >= 0),

    stage VARCHAR(30) NOT NULL DEFAULT 'Qualification'
        CHECK (stage IN (
            'Qualification',
            'Proposal',
            'Negotiation',
            'Won',
            'Lost'
        )),

    probability NUMERIC(5,2) NOT NULL DEFAULT 0
        CHECK (probability BETWEEN 0 AND 100),

    expected_close_date DATE NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'Open'
        CHECK (status IN ('Open', 'Won', 'Lost')),

    assigned_to UUID REFERENCES users(user_id),
    created_by UUID REFERENCES users(user_id),

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT opportunity_related_record_check
        CHECK (customer_id IS NOT NULL OR lead_id IS NOT NULL),

    CONSTRAINT opportunity_stage_status_check
        CHECK (
            (stage IN ('Qualification', 'Proposal', 'Negotiation')
                AND status = 'Open')
            OR (stage = 'Won' AND status = 'Won')
            OR (stage = 'Lost' AND status = 'Lost')
        ),

    CONSTRAINT opportunity_active_amount_check
        CHECK (status <> 'Open' OR amount > 0)
);

CREATE INDEX opportunities_stage_idx
ON opportunities(stage);

CREATE INDEX opportunities_assigned_idx
ON opportunities(assigned_to);

CREATE INDEX opportunities_close_date_idx
ON opportunities(expected_close_date);


-- ==========================================
-- 6. FOLLOW UPS
-- ==========================================

CREATE TABLE follow_ups (
    followup_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    customer_id UUID REFERENCES customers(customer_id),
    lead_id UUID REFERENCES leads(lead_id),
    opportunity_id UUID REFERENCES opportunities(opportunity_id),

    followup_date TIMESTAMPTZ NOT NULL,

    followup_type VARCHAR(30) NOT NULL
        CHECK (followup_type IN (
            'Call',
            'Meeting',
            'Email',
            'Task'
        )),

    subject VARCHAR(150) NOT NULL,
    remarks TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'Planned'
        CHECK (status IN (
            'Planned',
            'Completed',
            'Missed',
            'Cancelled'
        )),

    assigned_to UUID REFERENCES users(user_id),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT followup_related_record_check
        CHECK (
            (customer_id IS NOT NULL)::INT +
            (lead_id IS NOT NULL)::INT +
            (opportunity_id IS NOT NULL)::INT = 1
        )
);

CREATE INDEX followups_date_idx
ON follow_ups(followup_date);

CREATE INDEX followups_assigned_idx
ON follow_ups(assigned_to);


-- ==========================================
-- 7. ACTIVITIES
-- ==========================================

CREATE TABLE activities (
    activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    activity_type VARCHAR(30) NOT NULL
        CHECK (activity_type IN (
            'Call',
            'Meeting',
            'Email',
            'Task'
        )),

    subject VARCHAR(150) NOT NULL,
    description TEXT,

    activity_date TIMESTAMPTZ NOT NULL,

    customer_id UUID REFERENCES customers(customer_id),
    lead_id UUID REFERENCES leads(lead_id),

    assigned_to UUID REFERENCES users(user_id),

    status VARCHAR(20) NOT NULL DEFAULT 'Planned'
        CHECK (status IN (
            'Planned',
            'Completed',
            'Cancelled'
        )),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT activity_related_record_check
        CHECK (
            customer_id IS NOT NULL OR lead_id IS NOT NULL
        )
);

CREATE INDEX activities_date_idx
ON activities(activity_date);

CREATE INDEX activities_assigned_idx
ON activities(assigned_to);


-- ==========================================
-- 8. AUDIT LOGS
-- ==========================================

CREATE TABLE audit_logs (
    audit_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID REFERENCES users(user_id),

    action VARCHAR(50) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    record_id UUID,

    old_value JSONB,
    new_value JSONB,

    ip_address INET,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX audit_user_idx
ON audit_logs(user_id);

CREATE INDEX audit_entity_idx
ON audit_logs(entity_name);

CREATE INDEX audit_created_idx
ON audit_logs(created_at);


-- ==========================================
-- END OF ACXIOMCRM DATABASE SCHEMA
-- ==========================================
