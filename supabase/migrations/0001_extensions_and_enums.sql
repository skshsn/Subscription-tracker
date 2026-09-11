-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type billing_frequency as enum ('weekly', 'monthly', 'quarterly', 'half_yearly', 'annual', 'custom');
create type subscription_status as enum ('trial', 'active', 'paused', 'cancelled', 'expired', 'unknown');
create type detection_source as enum ('manual', 'email', 'bank', 'upi', 'app_store', 'api');
create type purchase_platform as enum ('website', 'apple', 'google_play', 'upi', 'paypal', 'credit_card', 'telecom', 'other');
create type cancellation_type as enum ('direct_web', 'app_store', 'email', 'phone', 'customer_support', 'unknown');
create type candidate_status as enum ('pending', 'confirmed', 'rejected', 'expired');
create type reminder_type as enum ('renewal', 'trial_end');
create type gmail_connection_status as enum ('connected', 'revoked', 'error');
