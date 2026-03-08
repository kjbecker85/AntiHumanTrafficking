IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'etl')
BEGIN
  EXEC(N'CREATE SCHEMA etl');
END
GO

IF OBJECT_ID(N'etl.load_run', N'U') IS NULL
CREATE TABLE etl.load_run (
  load_run_sk bigint IDENTITY NOT NULL,
  pipeline_name varchar(100) NOT NULL,
  started_at_utc datetime2(3) NOT NULL,
  completed_at_utc datetime2(3) NULL,
  load_status varchar(32) NOT NULL,
  message_text varchar(4000) NULL
);
GO

IF OBJECT_ID(N'etl.load_watermark', N'U') IS NULL
CREATE TABLE etl.load_watermark (
  pipeline_name varchar(100) NOT NULL,
  source_name varchar(100) NOT NULL,
  watermark_value datetime2(3) NOT NULL,
  updated_at_utc datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'etl.load_reject', N'U') IS NULL
CREATE TABLE etl.load_reject (
  reject_sk bigint IDENTITY NOT NULL,
  pipeline_name varchar(100) NOT NULL,
  source_name varchar(100) NOT NULL,
  reason_code varchar(100) NOT NULL,
  payload_text varchar(max) NOT NULL,
  rejected_at_utc datetime2(3) NOT NULL
);
GO
