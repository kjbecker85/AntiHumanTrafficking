IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'dim')
BEGIN
  EXEC(N'CREATE SCHEMA dim');
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'fact')
BEGIN
  EXEC(N'CREATE SCHEMA fact');
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'bridge')
BEGIN
  EXEC(N'CREATE SCHEMA bridge');
END
GO

IF OBJECT_ID(N'dim.dim_date', N'U') IS NULL
CREATE TABLE dim.dim_date (
  date_sk int NOT NULL,
  calendar_date date NOT NULL,
  day_of_week_name varchar(20) NOT NULL,
  month_name varchar(20) NOT NULL,
  month_number smallint NOT NULL,
  quarter_number smallint NOT NULL,
  calendar_year smallint NOT NULL,
  is_weekend bit NOT NULL
);
GO

IF OBJECT_ID(N'dim.dim_time', N'U') IS NULL
CREATE TABLE dim.dim_time (
  time_sk int NOT NULL,
  time_of_day time(0) NOT NULL,
  hour_number smallint NOT NULL,
  minute_number smallint NOT NULL
);
GO

IF OBJECT_ID(N'dim.dim_role', N'U') IS NULL
CREATE TABLE dim.dim_role (
  role_sk bigint NOT NULL,
  role_nk varchar(64) NOT NULL,
  role_code varchar(32) NOT NULL,
  role_name varchar(100) NOT NULL
);
GO

IF OBJECT_ID(N'dim.dim_user', N'U') IS NULL
CREATE TABLE dim.dim_user (
  user_sk bigint IDENTITY NOT NULL,
  user_nk uniqueidentifier NOT NULL,
  legacy_user_id varchar(64) NOT NULL,
  email varchar(320) NOT NULL,
  display_name varchar(200) NOT NULL,
  default_role_code varchar(32) NOT NULL,
  effective_start_utc datetime2(3) NOT NULL,
  effective_end_utc datetime2(3) NOT NULL,
  is_current bit NOT NULL
);
GO

IF OBJECT_ID(N'dim.dim_case', N'U') IS NULL
CREATE TABLE dim.dim_case (
  case_sk bigint IDENTITY NOT NULL,
  case_nk uniqueidentifier NOT NULL,
  legacy_case_id varchar(64) NOT NULL,
  case_name varchar(200) NOT NULL,
  jurisdiction varchar(120) NOT NULL,
  status_code varchar(32) NOT NULL,
  priority_code varchar(32) NOT NULL,
  owner_legacy_user_id varchar(64) NULL,
  effective_start_utc datetime2(3) NOT NULL,
  effective_end_utc datetime2(3) NOT NULL,
  is_current bit NOT NULL
);
GO

IF OBJECT_ID(N'dim.dim_entity_type', N'U') IS NULL
CREATE TABLE dim.dim_entity_type (
  entity_type_sk bigint NOT NULL,
  entity_type_nk varchar(64) NOT NULL,
  entity_type_code varchar(32) NOT NULL,
  entity_type_name varchar(100) NOT NULL
);
GO

IF OBJECT_ID(N'dim.dim_location', N'U') IS NULL
CREATE TABLE dim.dim_location (
  location_sk bigint IDENTITY NOT NULL,
  location_nk uniqueidentifier NOT NULL,
  display_name varchar(200) NOT NULL,
  address varchar(400) NULL,
  latitude float NULL,
  longitude float NULL,
  effective_start_utc datetime2(3) NOT NULL,
  effective_end_utc datetime2(3) NOT NULL,
  is_current bit NOT NULL
);
GO

IF OBJECT_ID(N'dim.dim_relationship_type', N'U') IS NULL
CREATE TABLE dim.dim_relationship_type (
  relationship_type_sk bigint NOT NULL,
  relationship_type_nk varchar(64) NOT NULL,
  relationship_type_code varchar(32) NOT NULL,
  relationship_type_name varchar(100) NOT NULL
);
GO

IF OBJECT_ID(N'dim.dim_source_type', N'U') IS NULL
CREATE TABLE dim.dim_source_type (
  source_type_sk bigint NOT NULL,
  source_type_nk varchar(64) NOT NULL,
  source_type_code varchar(32) NOT NULL,
  source_type_name varchar(100) NOT NULL
);
GO

IF OBJECT_ID(N'dim.dim_status', N'U') IS NULL
CREATE TABLE dim.dim_status (
  status_sk bigint NOT NULL,
  status_nk varchar(64) NOT NULL,
  status_code varchar(32) NOT NULL,
  status_name varchar(100) NOT NULL,
  status_domain varchar(32) NOT NULL
);
GO

IF OBJECT_ID(N'dim.dim_jurisdiction', N'U') IS NULL
CREATE TABLE dim.dim_jurisdiction (
  jurisdiction_sk bigint IDENTITY NOT NULL,
  jurisdiction_nk varchar(128) NOT NULL,
  jurisdiction_name varchar(120) NOT NULL
);
GO

IF OBJECT_ID(N'dim.dim_entity', N'U') IS NULL
CREATE TABLE dim.dim_entity (
  entity_sk bigint IDENTITY NOT NULL,
  entity_nk uniqueidentifier NOT NULL,
  legacy_entity_id varchar(64) NOT NULL,
  entity_type_code varchar(32) NOT NULL,
  display_name varchar(200) NOT NULL,
  protected_flag bit NOT NULL,
  confidence decimal(9,6) NOT NULL,
  unique_identity varchar(200) NULL,
  unique_identifier_type varchar(100) NULL,
  primary_location_nk uniqueidentifier NULL,
  effective_start_utc datetime2(3) NOT NULL,
  effective_end_utc datetime2(3) NOT NULL,
  is_current bit NOT NULL
);
GO

IF OBJECT_ID(N'fact.fact_report_event', N'U') IS NULL
CREATE TABLE fact.fact_report_event (
  report_event_sk bigint IDENTITY NOT NULL,
  report_nk uniqueidentifier NOT NULL,
  legacy_report_id varchar(64) NOT NULL,
  case_sk bigint NOT NULL,
  date_sk int NOT NULL,
  time_sk int NOT NULL,
  source_type_sk bigint NOT NULL,
  jurisdiction_sk bigint NULL,
  report_count int NOT NULL,
  related_entity_count int NOT NULL
);
GO

IF OBJECT_ID(N'fact.fact_entity_case_membership', N'U') IS NULL
CREATE TABLE fact.fact_entity_case_membership (
  entity_case_membership_sk bigint IDENTITY NOT NULL,
  case_sk bigint NOT NULL,
  entity_sk bigint NOT NULL,
  entity_type_sk bigint NOT NULL,
  effective_date_sk int NOT NULL,
  is_primary_case_link bit NOT NULL,
  membership_count int NOT NULL
);
GO

IF OBJECT_ID(N'fact.fact_relationship_event', N'U') IS NULL
CREATE TABLE fact.fact_relationship_event (
  relationship_event_sk bigint IDENTITY NOT NULL,
  relationship_nk uniqueidentifier NOT NULL,
  legacy_relationship_id varchar(64) NOT NULL,
  case_sk bigint NOT NULL,
  from_entity_sk bigint NOT NULL,
  to_entity_sk bigint NOT NULL,
  relationship_type_sk bigint NOT NULL,
  date_sk int NOT NULL,
  confidence decimal(9,6) NOT NULL,
  source_count int NOT NULL,
  relationship_count int NOT NULL
);
GO

IF OBJECT_ID(N'fact.fact_case_snapshot', N'U') IS NULL
CREATE TABLE fact.fact_case_snapshot (
  case_snapshot_sk bigint IDENTITY NOT NULL,
  case_sk bigint NOT NULL,
  snapshot_date_sk int NOT NULL,
  status_sk bigint NOT NULL,
  jurisdiction_sk bigint NULL,
  entity_count int NOT NULL,
  report_count int NOT NULL,
  relationship_count int NOT NULL,
  protected_entity_count int NOT NULL
);
GO

IF OBJECT_ID(N'fact.fact_auth_activity', N'U') IS NULL
CREATE TABLE fact.fact_auth_activity (
  auth_activity_sk bigint IDENTITY NOT NULL,
  user_sk bigint NOT NULL,
  role_sk bigint NULL,
  date_sk int NOT NULL,
  time_sk int NOT NULL,
  activity_type varchar(32) NOT NULL,
  success_flag bit NOT NULL,
  attempt_count int NOT NULL
);
GO

IF OBJECT_ID(N'fact.fact_attachment_event', N'U') IS NULL
CREATE TABLE fact.fact_attachment_event (
  attachment_event_sk bigint IDENTITY NOT NULL,
  attachment_nk uniqueidentifier NOT NULL,
  legacy_attachment_id varchar(64) NOT NULL,
  case_sk bigint NOT NULL,
  entity_sk bigint NULL,
  date_sk int NOT NULL,
  attachment_count int NOT NULL
);
GO

IF OBJECT_ID(N'bridge.bridge_report_entity', N'U') IS NULL
CREATE TABLE bridge.bridge_report_entity (
  report_entity_bridge_sk bigint IDENTITY NOT NULL,
  report_nk uniqueidentifier NOT NULL,
  entity_nk uniqueidentifier NOT NULL,
  relationship_role varchar(32) NOT NULL
);
GO
