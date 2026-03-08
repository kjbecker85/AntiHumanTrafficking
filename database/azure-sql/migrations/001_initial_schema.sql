IF SCHEMA_ID(N'ref') IS NULL EXEC(N'CREATE SCHEMA ref');
IF SCHEMA_ID(N'auth') IS NULL EXEC(N'CREATE SCHEMA auth');
IF SCHEMA_ID(N'core') IS NULL EXEC(N'CREATE SCHEMA core');
IF SCHEMA_ID(N'ops') IS NULL EXEC(N'CREATE SCHEMA ops');
IF SCHEMA_ID(N'audit') IS NULL EXEC(N'CREATE SCHEMA audit');
IF SCHEMA_ID(N'control') IS NULL EXEC(N'CREATE SCHEMA control');
GO

IF OBJECT_ID(N'ref.user_role_ref', N'U') IS NULL
CREATE TABLE ref.user_role_ref (
  role_code nvarchar(32) NOT NULL PRIMARY KEY,
  role_name nvarchar(100) NOT NULL,
  role_description nvarchar(400) NULL
);
GO

IF OBJECT_ID(N'ref.case_status_ref', N'U') IS NULL
CREATE TABLE ref.case_status_ref (
  status_code nvarchar(32) NOT NULL PRIMARY KEY,
  status_name nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID(N'ref.case_priority_ref', N'U') IS NULL
CREATE TABLE ref.case_priority_ref (
  priority_code nvarchar(32) NOT NULL PRIMARY KEY,
  priority_name nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID(N'ref.entity_type_ref', N'U') IS NULL
CREATE TABLE ref.entity_type_ref (
  entity_type_code nvarchar(32) NOT NULL PRIMARY KEY,
  entity_type_name nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID(N'ref.relationship_type_ref', N'U') IS NULL
CREATE TABLE ref.relationship_type_ref (
  relationship_type_code nvarchar(32) NOT NULL PRIMARY KEY,
  relationship_type_name nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID(N'ref.relationship_strength_ref', N'U') IS NULL
CREATE TABLE ref.relationship_strength_ref (
  strength_code nvarchar(16) NOT NULL PRIMARY KEY,
  strength_name nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID(N'ref.report_source_type_ref', N'U') IS NULL
CREATE TABLE ref.report_source_type_ref (
  source_type_code nvarchar(32) NOT NULL PRIMARY KEY,
  source_type_name nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID(N'ref.attachment_file_type_ref', N'U') IS NULL
CREATE TABLE ref.attachment_file_type_ref (
  file_type_code nvarchar(32) NOT NULL PRIMARY KEY,
  file_type_name nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID(N'ref.parent_type_ref', N'U') IS NULL
CREATE TABLE ref.parent_type_ref (
  parent_type_code nvarchar(32) NOT NULL PRIMARY KEY,
  parent_type_name nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID(N'auth.user_profile', N'U') IS NULL
CREATE TABLE auth.user_profile (
  user_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  user_nk uniqueidentifier NOT NULL CONSTRAINT DF_user_profile_user_nk DEFAULT NEWSEQUENTIALID(),
  legacy_user_id nvarchar(64) NOT NULL UNIQUE,
  display_name nvarchar(200) NOT NULL,
  email nvarchar(320) NOT NULL UNIQUE,
  password_hash nvarchar(128) NOT NULL,
  default_role_code nvarchar(32) NOT NULL,
  is_active bit NOT NULL CONSTRAINT DF_user_profile_is_active DEFAULT (1),
  created_at datetime2(3) NOT NULL CONSTRAINT DF_user_profile_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_user_profile_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_user_profile_default_role FOREIGN KEY (default_role_code) REFERENCES ref.user_role_ref(role_code)
);
GO

IF OBJECT_ID(N'auth.user_role_assignment', N'U') IS NULL
CREATE TABLE auth.user_role_assignment (
  user_role_assignment_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  user_sk bigint NOT NULL,
  role_code nvarchar(32) NOT NULL,
  assigned_at datetime2(3) NOT NULL CONSTRAINT DF_user_role_assignment_assigned_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_user_role_assignment_user FOREIGN KEY (user_sk) REFERENCES auth.user_profile(user_sk),
  CONSTRAINT FK_user_role_assignment_role FOREIGN KEY (role_code) REFERENCES ref.user_role_ref(role_code),
  CONSTRAINT UQ_user_role_assignment UNIQUE (user_sk, role_code)
);
GO

IF OBJECT_ID(N'auth.identity_provider_account', N'U') IS NULL
CREATE TABLE auth.identity_provider_account (
  identity_provider_account_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  user_sk bigint NOT NULL,
  provider_type nvarchar(64) NOT NULL,
  provider_subject nvarchar(200) NOT NULL,
  provider_metadata_json nvarchar(max) NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_identity_provider_account_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_identity_provider_account_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_identity_provider_account_user FOREIGN KEY (user_sk) REFERENCES auth.user_profile(user_sk),
  CONSTRAINT UQ_identity_provider_account UNIQUE (provider_type, provider_subject)
);
GO

IF OBJECT_ID(N'auth.auth_session', N'U') IS NULL
CREATE TABLE auth.auth_session (
  auth_session_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  session_nk uniqueidentifier NOT NULL UNIQUE,
  user_sk bigint NOT NULL,
  active_role_code nvarchar(32) NOT NULL,
  created_at datetime2(3) NOT NULL,
  last_accessed_at datetime2(3) NOT NULL,
  revoked_at datetime2(3) NULL,
  CONSTRAINT FK_auth_session_user FOREIGN KEY (user_sk) REFERENCES auth.user_profile(user_sk),
  CONSTRAINT FK_auth_session_role FOREIGN KEY (active_role_code) REFERENCES ref.user_role_ref(role_code)
);
GO

IF OBJECT_ID(N'auth.password_reset', N'U') IS NULL
CREATE TABLE auth.password_reset (
  password_reset_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  password_reset_nk uniqueidentifier NOT NULL UNIQUE,
  user_sk bigint NOT NULL,
  email nvarchar(320) NOT NULL,
  token_hash nvarchar(128) NOT NULL,
  created_at datetime2(3) NOT NULL,
  expires_at datetime2(3) NOT NULL,
  used_at datetime2(3) NULL,
  CONSTRAINT FK_password_reset_user FOREIGN KEY (user_sk) REFERENCES auth.user_profile(user_sk)
);
GO

IF OBJECT_ID(N'auth.login_attempt', N'U') IS NULL
CREATE TABLE auth.login_attempt (
  login_attempt_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  user_sk bigint NULL,
  email nvarchar(320) NOT NULL,
  is_successful bit NOT NULL,
  failure_reason nvarchar(200) NULL,
  ip_address nvarchar(64) NULL,
  user_agent nvarchar(400) NULL,
  attempted_at datetime2(3) NOT NULL,
  CONSTRAINT FK_login_attempt_user FOREIGN KEY (user_sk) REFERENCES auth.user_profile(user_sk)
);
GO

IF OBJECT_ID(N'core.case_record', N'U') IS NULL
CREATE TABLE core.case_record (
  case_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  case_nk uniqueidentifier NOT NULL CONSTRAINT DF_case_record_case_nk DEFAULT NEWSEQUENTIALID(),
  legacy_case_id nvarchar(64) NOT NULL UNIQUE,
  case_name nvarchar(200) NOT NULL,
  status_code nvarchar(32) NOT NULL,
  jurisdiction nvarchar(120) NOT NULL,
  priority_code nvarchar(32) NOT NULL,
  owner_user_sk bigint NULL,
  owner_legacy_user_id nvarchar(64) NULL,
  review_date date NOT NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_case_record_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_case_record_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_case_record_status FOREIGN KEY (status_code) REFERENCES ref.case_status_ref(status_code),
  CONSTRAINT FK_case_record_priority FOREIGN KEY (priority_code) REFERENCES ref.case_priority_ref(priority_code),
  CONSTRAINT FK_case_record_owner FOREIGN KEY (owner_user_sk) REFERENCES auth.user_profile(user_sk)
);
GO

IF OBJECT_ID(N'core.case_tag', N'U') IS NULL
CREATE TABLE core.case_tag (
  case_tag_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  case_sk bigint NOT NULL,
  tag_text nvarchar(100) NOT NULL,
  CONSTRAINT FK_case_tag_case FOREIGN KEY (case_sk) REFERENCES core.case_record(case_sk),
  CONSTRAINT UQ_case_tag UNIQUE (case_sk, tag_text)
);
GO

IF OBJECT_ID(N'core.location', N'U') IS NULL
CREATE TABLE core.location (
  location_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  location_nk uniqueidentifier NOT NULL CONSTRAINT DF_location_location_nk DEFAULT NEWSEQUENTIALID(),
  display_name nvarchar(200) NOT NULL,
  address nvarchar(400) NULL,
  latitude float NULL,
  longitude float NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_location_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_location_updated_at DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'core.entity', N'U') IS NULL
CREATE TABLE core.entity (
  entity_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  entity_nk uniqueidentifier NOT NULL CONSTRAINT DF_entity_entity_nk DEFAULT NEWSEQUENTIALID(),
  legacy_entity_id nvarchar(64) NOT NULL UNIQUE,
  entity_type_code nvarchar(32) NOT NULL,
  display_name nvarchar(200) NOT NULL,
  confidence decimal(9,6) NOT NULL,
  protected_flag bit NOT NULL CONSTRAINT DF_entity_protected_flag DEFAULT (0),
  unique_identity nvarchar(200) NULL,
  unique_identifier_type nvarchar(100) NULL,
  event_datetime datetime2(3) NULL,
  description_text nvarchar(max) NULL,
  image_url nvarchar(max) NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_entity_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_entity_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_entity_type FOREIGN KEY (entity_type_code) REFERENCES ref.entity_type_ref(entity_type_code)
);
GO

IF OBJECT_ID(N'core.entity_case', N'U') IS NULL
CREATE TABLE core.entity_case (
  entity_case_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  entity_sk bigint NOT NULL,
  case_sk bigint NOT NULL,
  is_primary bit NOT NULL CONSTRAINT DF_entity_case_is_primary DEFAULT (0),
  linked_at datetime2(3) NOT NULL CONSTRAINT DF_entity_case_linked_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_entity_case_entity FOREIGN KEY (entity_sk) REFERENCES core.entity(entity_sk),
  CONSTRAINT FK_entity_case_case FOREIGN KEY (case_sk) REFERENCES core.case_record(case_sk),
  CONSTRAINT UQ_entity_case UNIQUE (entity_sk, case_sk)
);
GO

IF OBJECT_ID(N'core.entity_alias', N'U') IS NULL
CREATE TABLE core.entity_alias (
  entity_alias_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  entity_sk bigint NOT NULL,
  alias_text nvarchar(200) NOT NULL,
  CONSTRAINT FK_entity_alias_entity FOREIGN KEY (entity_sk) REFERENCES core.entity(entity_sk)
);
GO

IF OBJECT_ID(N'core.entity_descriptor', N'U') IS NULL
CREATE TABLE core.entity_descriptor (
  entity_descriptor_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  entity_sk bigint NOT NULL,
  descriptor_text nvarchar(200) NOT NULL,
  CONSTRAINT FK_entity_descriptor_entity FOREIGN KEY (entity_sk) REFERENCES core.entity(entity_sk)
);
GO

IF OBJECT_ID(N'core.entity_attribute', N'U') IS NULL
CREATE TABLE core.entity_attribute (
  entity_attribute_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  entity_sk bigint NOT NULL,
  attribute_name nvarchar(200) NOT NULL,
  attribute_value nvarchar(max) NOT NULL,
  CONSTRAINT FK_entity_attribute_entity FOREIGN KEY (entity_sk) REFERENCES core.entity(entity_sk)
);
GO

IF OBJECT_ID(N'core.entity_sensitive', N'U') IS NULL
CREATE TABLE core.entity_sensitive (
  entity_sk bigint NOT NULL PRIMARY KEY,
  redaction_reason nvarchar(200) NULL,
  sensitive_json nvarchar(max) NULL,
  CONSTRAINT FK_entity_sensitive_entity FOREIGN KEY (entity_sk) REFERENCES core.entity(entity_sk)
);
GO

IF OBJECT_ID(N'core.entity_location', N'U') IS NULL
CREATE TABLE core.entity_location (
  entity_location_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  entity_sk bigint NOT NULL,
  location_sk bigint NOT NULL,
  is_primary bit NOT NULL CONSTRAINT DF_entity_location_is_primary DEFAULT (0),
  linked_at datetime2(3) NOT NULL CONSTRAINT DF_entity_location_linked_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_entity_location_entity FOREIGN KEY (entity_sk) REFERENCES core.entity(entity_sk),
  CONSTRAINT FK_entity_location_location FOREIGN KEY (location_sk) REFERENCES core.location(location_sk),
  CONSTRAINT UQ_entity_location UNIQUE (entity_sk, location_sk)
);
GO

IF OBJECT_ID(N'core.relationship', N'U') IS NULL
CREATE TABLE core.relationship (
  relationship_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  relationship_nk uniqueidentifier NOT NULL CONSTRAINT DF_relationship_relationship_nk DEFAULT NEWSEQUENTIALID(),
  legacy_relationship_id nvarchar(64) NOT NULL UNIQUE,
  case_sk bigint NOT NULL,
  from_entity_sk bigint NOT NULL,
  to_entity_sk bigint NOT NULL,
  relationship_type_code nvarchar(32) NOT NULL,
  strength_code nvarchar(16) NOT NULL,
  confidence decimal(9,6) NOT NULL,
  source_count int NOT NULL,
  label nvarchar(200) NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_relationship_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_relationship_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_relationship_case FOREIGN KEY (case_sk) REFERENCES core.case_record(case_sk),
  CONSTRAINT FK_relationship_from_entity FOREIGN KEY (from_entity_sk) REFERENCES core.entity(entity_sk),
  CONSTRAINT FK_relationship_to_entity FOREIGN KEY (to_entity_sk) REFERENCES core.entity(entity_sk),
  CONSTRAINT FK_relationship_type FOREIGN KEY (relationship_type_code) REFERENCES ref.relationship_type_ref(relationship_type_code),
  CONSTRAINT FK_relationship_strength FOREIGN KEY (strength_code) REFERENCES ref.relationship_strength_ref(strength_code)
);
GO

IF OBJECT_ID(N'ops.report', N'U') IS NULL
CREATE TABLE ops.report (
  report_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  report_nk uniqueidentifier NOT NULL CONSTRAINT DF_report_report_nk DEFAULT NEWSEQUENTIALID(),
  legacy_report_id nvarchar(64) NOT NULL UNIQUE,
  case_sk bigint NOT NULL,
  time_observed datetime2(3) NOT NULL,
  location_text nvarchar(200) NOT NULL,
  narrative nvarchar(max) NOT NULL,
  source_type_code nvarchar(32) NOT NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_report_created_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_report_case FOREIGN KEY (case_sk) REFERENCES core.case_record(case_sk),
  CONSTRAINT FK_report_source_type FOREIGN KEY (source_type_code) REFERENCES ref.report_source_type_ref(source_type_code)
);
GO

IF OBJECT_ID(N'ops.report_entity', N'U') IS NULL
CREATE TABLE ops.report_entity (
  report_entity_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  report_sk bigint NOT NULL,
  entity_sk bigint NOT NULL,
  CONSTRAINT FK_report_entity_report FOREIGN KEY (report_sk) REFERENCES ops.report(report_sk),
  CONSTRAINT FK_report_entity_entity FOREIGN KEY (entity_sk) REFERENCES core.entity(entity_sk),
  CONSTRAINT UQ_report_entity UNIQUE (report_sk, entity_sk)
);
GO

IF OBJECT_ID(N'ops.attachment', N'U') IS NULL
CREATE TABLE ops.attachment (
  attachment_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  attachment_nk uniqueidentifier NOT NULL CONSTRAINT DF_attachment_attachment_nk DEFAULT NEWSEQUENTIALID(),
  legacy_attachment_id nvarchar(64) NOT NULL UNIQUE,
  parent_type_code nvarchar(32) NOT NULL,
  case_sk bigint NULL,
  entity_sk bigint NULL,
  report_sk bigint NULL,
  file_type_code nvarchar(32) NOT NULL,
  storage_path nvarchar(max) NOT NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_attachment_created_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_attachment_parent_type FOREIGN KEY (parent_type_code) REFERENCES ref.parent_type_ref(parent_type_code),
  CONSTRAINT FK_attachment_case FOREIGN KEY (case_sk) REFERENCES core.case_record(case_sk),
  CONSTRAINT FK_attachment_entity FOREIGN KEY (entity_sk) REFERENCES core.entity(entity_sk),
  CONSTRAINT FK_attachment_report FOREIGN KEY (report_sk) REFERENCES ops.report(report_sk),
  CONSTRAINT FK_attachment_file_type FOREIGN KEY (file_type_code) REFERENCES ref.attachment_file_type_ref(file_type_code)
);
GO

IF OBJECT_ID(N'ops.ingestion_batch', N'U') IS NULL
CREATE TABLE ops.ingestion_batch (
  ingestion_batch_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  ingestion_batch_nk uniqueidentifier NOT NULL CONSTRAINT DF_ingestion_batch_nk DEFAULT NEWSEQUENTIALID(),
  source_system nvarchar(100) NOT NULL,
  source_object nvarchar(100) NOT NULL,
  started_at datetime2(3) NOT NULL,
  completed_at datetime2(3) NULL,
  status_code nvarchar(32) NOT NULL,
  rows_read bigint NOT NULL CONSTRAINT DF_ingestion_batch_rows_read DEFAULT (0),
  rows_written bigint NOT NULL CONSTRAINT DF_ingestion_batch_rows_written DEFAULT (0),
  metadata_json nvarchar(max) NULL
);
GO

IF OBJECT_ID(N'audit.audit_event', N'U') IS NULL
CREATE TABLE audit.audit_event (
  audit_event_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  audit_event_nk uniqueidentifier NOT NULL CONSTRAINT DF_audit_event_nk DEFAULT NEWSEQUENTIALID(),
  legacy_audit_id nvarchar(64) NOT NULL UNIQUE,
  actor_user_sk bigint NULL,
  actor_legacy_user_id nvarchar(64) NULL,
  action_type nvarchar(100) NOT NULL,
  object_type nvarchar(100) NOT NULL,
  object_legacy_id nvarchar(100) NOT NULL,
  metadata_json nvarchar(max) NULL,
  occurred_at datetime2(3) NOT NULL,
  CONSTRAINT FK_audit_event_actor FOREIGN KEY (actor_user_sk) REFERENCES auth.user_profile(user_sk)
);
GO

IF OBJECT_ID(N'control.etl_watermark', N'U') IS NULL
CREATE TABLE control.etl_watermark (
  etl_watermark_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  pipeline_name nvarchar(100) NOT NULL,
  source_name nvarchar(100) NOT NULL,
  watermark_value nvarchar(200) NOT NULL,
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_etl_watermark_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_etl_watermark UNIQUE (pipeline_name, source_name)
);
GO

IF OBJECT_ID(N'control.schema_version', N'U') IS NULL
CREATE TABLE control.schema_version (
  schema_version_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  version_number nvarchar(32) NOT NULL,
  applied_at datetime2(3) NOT NULL CONSTRAINT DF_schema_version_applied_at DEFAULT SYSUTCDATETIME(),
  applied_by nvarchar(200) NULL,
  notes nvarchar(400) NULL
);
GO

IF OBJECT_ID(N'control.data_quality_reject', N'U') IS NULL
CREATE TABLE control.data_quality_reject (
  data_quality_reject_sk bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  pipeline_name nvarchar(100) NOT NULL,
  source_name nvarchar(100) NOT NULL,
  rejected_at datetime2(3) NOT NULL CONSTRAINT DF_data_quality_reject_rejected_at DEFAULT SYSUTCDATETIME(),
  reason_code nvarchar(100) NOT NULL,
  raw_payload nvarchar(max) NOT NULL
);
GO
