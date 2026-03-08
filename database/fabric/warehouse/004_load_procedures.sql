DROP PROCEDURE IF EXISTS etl.usp_seed_date_dimension;
GO

CREATE PROCEDURE etl.usp_seed_date_dimension
  @StartDate date,
  @EndDate date
AS
BEGIN
  SET NOCOUNT ON;

  IF @StartDate IS NULL OR @EndDate IS NULL OR @StartDate > @EndDate
  BEGIN
    RETURN;
  END;

  DECLARE @CurrentDate date = @StartDate;

  WHILE @CurrentDate <= @EndDate
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM dim.dim_date
      WHERE date_sk = CONVERT(int, CONVERT(char(8), @CurrentDate, 112))
    )
    BEGIN
      INSERT INTO dim.dim_date (
        date_sk,
        calendar_date,
        day_of_week_name,
        month_name,
        month_number,
        quarter_number,
        calendar_year,
        is_weekend
      )
      VALUES (
        CONVERT(int, CONVERT(char(8), @CurrentDate, 112)),
        @CurrentDate,
        DATENAME(weekday, @CurrentDate),
        DATENAME(month, @CurrentDate),
        DATEPART(month, @CurrentDate),
        DATEPART(quarter, @CurrentDate),
        DATEPART(year, @CurrentDate),
        CASE WHEN DATENAME(weekday, @CurrentDate) IN ('Saturday', 'Sunday') THEN 1 ELSE 0 END
      );
    END;

    SET @CurrentDate = DATEADD(day, 1, @CurrentDate);
  END;
END;
GO

DROP PROCEDURE IF EXISTS etl.usp_seed_time_dimension;
GO

CREATE PROCEDURE etl.usp_seed_time_dimension
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @MinuteOfDay int = 0;

  WHILE @MinuteOfDay < 1440
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM dim.dim_time
      WHERE time_sk = ((@MinuteOfDay / 60) * 100) + (@MinuteOfDay % 60)
    )
    BEGIN
      INSERT INTO dim.dim_time (
        time_sk,
        time_of_day,
        hour_number,
        minute_number
      )
      VALUES (
        ((@MinuteOfDay / 60) * 100) + (@MinuteOfDay % 60),
        TIMEFROMPARTS(@MinuteOfDay / 60, @MinuteOfDay % 60, 0, 0, 0),
        @MinuteOfDay / 60,
        @MinuteOfDay % 60
      );
    END;

    SET @MinuteOfDay += 1;
  END;
END;
GO

DROP PROCEDURE IF EXISTS etl.usp_load_reference_dimensions;
GO

CREATE PROCEDURE etl.usp_load_reference_dimensions
AS
BEGIN
  SET NOCOUNT ON;

  DELETE FROM dim.dim_role;
  INSERT INTO dim.dim_role (role_sk, role_nk, role_code, role_name)
  SELECT
    ROW_NUMBER() OVER (ORDER BY role_code),
    CONCAT('role:', role_code),
    role_code,
    role_name
  FROM [$(OperationalMirrorDatabaseName)].ref.user_role_ref;

  DELETE FROM dim.dim_entity_type;
  INSERT INTO dim.dim_entity_type (entity_type_sk, entity_type_nk, entity_type_code, entity_type_name)
  SELECT
    ROW_NUMBER() OVER (ORDER BY entity_type_code),
    CONCAT('entity_type:', entity_type_code),
    entity_type_code,
    entity_type_name
  FROM [$(OperationalMirrorDatabaseName)].ref.entity_type_ref;

  DELETE FROM dim.dim_relationship_type;
  INSERT INTO dim.dim_relationship_type (relationship_type_sk, relationship_type_nk, relationship_type_code, relationship_type_name)
  SELECT
    ROW_NUMBER() OVER (ORDER BY relationship_type_code),
    CONCAT('relationship_type:', relationship_type_code),
    relationship_type_code,
    relationship_type_name
  FROM [$(OperationalMirrorDatabaseName)].ref.relationship_type_ref;

  DELETE FROM dim.dim_source_type;
  INSERT INTO dim.dim_source_type (source_type_sk, source_type_nk, source_type_code, source_type_name)
  SELECT
    ROW_NUMBER() OVER (ORDER BY source_type_code),
    CONCAT('source_type:', source_type_code),
    source_type_code,
    source_type_name
  FROM [$(OperationalMirrorDatabaseName)].ref.report_source_type_ref;

  DELETE FROM dim.dim_status;
  INSERT INTO dim.dim_status (status_sk, status_nk, status_code, status_name, status_domain)
  SELECT
    ROW_NUMBER() OVER (ORDER BY status_code),
    CONCAT('case_status:', status_code),
    status_code,
    status_name,
    'case'
  FROM [$(OperationalMirrorDatabaseName)].ref.case_status_ref;
END;
GO

DROP PROCEDURE IF EXISTS etl.usp_load_conformed_dimensions;
GO

CREATE PROCEDURE etl.usp_load_conformed_dimensions
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @StartDate date;
  DECLARE @EndDate date;

  SELECT
    @StartDate = MIN(cast_value),
    @EndDate = MAX(cast_value)
  FROM (
    SELECT CAST(MIN(created_at) AS date) AS cast_value FROM [$(OperationalMirrorDatabaseName)].auth.user_profile
    UNION ALL
    SELECT CAST(MIN(review_date) AS date) FROM [$(OperationalMirrorDatabaseName)].core.case_record
    UNION ALL
    SELECT CAST(MIN(COALESCE(event_datetime, created_at)) AS date) FROM [$(OperationalMirrorDatabaseName)].core.entity
    UNION ALL
    SELECT CAST(MIN(time_observed) AS date) FROM [$(OperationalMirrorDatabaseName)].ops.report
    UNION ALL
    SELECT CAST(MIN(created_at) AS date) FROM [$(OperationalMirrorDatabaseName)].ops.attachment
    UNION ALL
    SELECT CAST(MIN(attempted_at) AS date) FROM [$(OperationalMirrorDatabaseName)].auth.login_attempt
    UNION ALL
    SELECT CAST(MIN(occurred_at) AS date) FROM [$(OperationalMirrorDatabaseName)].audit.audit_event
    UNION ALL
    SELECT CAST(MAX(created_at) AS date) FROM [$(OperationalMirrorDatabaseName)].auth.user_profile
    UNION ALL
    SELECT CAST(MAX(review_date) AS date) FROM [$(OperationalMirrorDatabaseName)].core.case_record
    UNION ALL
    SELECT CAST(MAX(COALESCE(event_datetime, created_at)) AS date) FROM [$(OperationalMirrorDatabaseName)].core.entity
    UNION ALL
    SELECT CAST(MAX(time_observed) AS date) FROM [$(OperationalMirrorDatabaseName)].ops.report
    UNION ALL
    SELECT CAST(MAX(created_at) AS date) FROM [$(OperationalMirrorDatabaseName)].ops.attachment
    UNION ALL
    SELECT CAST(MAX(attempted_at) AS date) FROM [$(OperationalMirrorDatabaseName)].auth.login_attempt
    UNION ALL
    SELECT CAST(MAX(occurred_at) AS date) FROM [$(OperationalMirrorDatabaseName)].audit.audit_event
  ) AS source_dates
  WHERE cast_value IS NOT NULL;

  IF @StartDate IS NULL
  BEGIN
    SET @StartDate = CAST(SYSUTCDATETIME() AS date);
    SET @EndDate = @StartDate;
  END;

  DECLARE @BufferedStartDate date = CAST(DATEADD(day, -30, @StartDate) AS date);
  DECLARE @BufferedEndDate date = CAST(DATEADD(day, 30, @EndDate) AS date);

  EXEC etl.usp_seed_date_dimension @StartDate = @BufferedStartDate, @EndDate = @BufferedEndDate;
  EXEC etl.usp_seed_time_dimension;

  DELETE FROM dim.dim_user;
  INSERT INTO dim.dim_user (
    user_nk,
    legacy_user_id,
    email,
    display_name,
    default_role_code,
    effective_start_utc,
    effective_end_utc,
    is_current
  )
  SELECT
    user_nk,
    legacy_user_id,
    email,
    display_name,
    default_role_code,
    COALESCE(updated_at, created_at),
    CAST('9999-12-31T23:59:59.997' AS datetime2(3)),
    1
  FROM [$(OperationalMirrorDatabaseName)].auth.user_profile;

  DELETE FROM dim.dim_jurisdiction;
  INSERT INTO dim.dim_jurisdiction (
    jurisdiction_nk,
    jurisdiction_name
  )
  SELECT DISTINCT
    LOWER(jurisdiction),
    jurisdiction
  FROM [$(OperationalMirrorDatabaseName)].core.case_record
  WHERE jurisdiction IS NOT NULL;

  DELETE FROM dim.dim_location;
  INSERT INTO dim.dim_location (
    location_nk,
    display_name,
    address,
    latitude,
    longitude,
    effective_start_utc,
    effective_end_utc,
    is_current
  )
  SELECT
    location_nk,
    display_name,
    address,
    latitude,
    longitude,
    COALESCE(updated_at, created_at),
    CAST('9999-12-31T23:59:59.997' AS datetime2(3)),
    1
  FROM [$(OperationalMirrorDatabaseName)].core.location;

  DELETE FROM dim.dim_case;
  INSERT INTO dim.dim_case (
    case_nk,
    legacy_case_id,
    case_name,
    jurisdiction,
    status_code,
    priority_code,
    owner_legacy_user_id,
    effective_start_utc,
    effective_end_utc,
    is_current
  )
  SELECT
    case_nk,
    legacy_case_id,
    case_name,
    jurisdiction,
    status_code,
    priority_code,
    owner_legacy_user_id,
    COALESCE(updated_at, created_at),
    CAST('9999-12-31T23:59:59.997' AS datetime2(3)),
    1
  FROM [$(OperationalMirrorDatabaseName)].core.case_record;

  DELETE FROM dim.dim_entity;
  INSERT INTO dim.dim_entity (
    entity_nk,
    legacy_entity_id,
    entity_type_code,
    display_name,
    protected_flag,
    confidence,
    unique_identity,
    unique_identifier_type,
    primary_location_nk,
    effective_start_utc,
    effective_end_utc,
    is_current
  )
  SELECT
    e.entity_nk,
    e.legacy_entity_id,
    e.entity_type_code,
    e.display_name,
    e.protected_flag,
    e.confidence,
    e.unique_identity,
    e.unique_identifier_type,
    primary_location.location_nk,
    COALESCE(e.updated_at, e.created_at),
    CAST('9999-12-31T23:59:59.997' AS datetime2(3)),
    1
  FROM [$(OperationalMirrorDatabaseName)].core.entity AS e
  OUTER APPLY (
    SELECT TOP 1 l.location_nk
    FROM [$(OperationalMirrorDatabaseName)].core.entity_location AS el
    INNER JOIN [$(OperationalMirrorDatabaseName)].core.location AS l
      ON l.location_sk = el.location_sk
    WHERE el.entity_sk = e.entity_sk
    ORDER BY el.is_primary DESC, el.linked_at DESC, el.entity_location_sk DESC
  ) AS primary_location;
END;
GO

DROP PROCEDURE IF EXISTS etl.usp_load_fact_tables;
GO

CREATE PROCEDURE etl.usp_load_fact_tables
AS
BEGIN
  SET NOCOUNT ON;

  DELETE FROM bridge.bridge_report_entity;
  INSERT INTO bridge.bridge_report_entity (
    report_nk,
    entity_nk,
    relationship_role
  )
  SELECT
    r.report_nk,
    e.entity_nk,
    'reported'
  FROM [$(OperationalMirrorDatabaseName)].ops.report_entity AS re
  INNER JOIN [$(OperationalMirrorDatabaseName)].ops.report AS r
    ON r.report_sk = re.report_sk
  INNER JOIN [$(OperationalMirrorDatabaseName)].core.entity AS e
    ON e.entity_sk = re.entity_sk;

  DELETE FROM fact.fact_auth_activity;
  INSERT INTO fact.fact_auth_activity (
    user_sk,
    role_sk,
    date_sk,
    time_sk,
    activity_type,
    success_flag,
    attempt_count
  )
  SELECT
    du.user_sk,
    dr.role_sk,
    CONVERT(int, CONVERT(char(8), la.attempted_at, 112)),
    DATEPART(hour, la.attempted_at) * 100 + DATEPART(minute, la.attempted_at),
    'login_attempt',
    la.is_successful,
    1
  FROM [$(OperationalMirrorDatabaseName)].auth.login_attempt AS la
  LEFT JOIN [$(OperationalMirrorDatabaseName)].auth.user_profile AS u
    ON u.user_sk = la.user_sk OR u.email = la.email
  LEFT JOIN dim.dim_user AS du
    ON du.legacy_user_id = u.legacy_user_id
    AND du.is_current = 1
  LEFT JOIN dim.dim_role AS dr
    ON dr.role_code = u.default_role_code;

  DELETE FROM fact.fact_report_event;
  INSERT INTO fact.fact_report_event (
    report_nk,
    legacy_report_id,
    case_sk,
    date_sk,
    time_sk,
    source_type_sk,
    jurisdiction_sk,
    report_count,
    related_entity_count
  )
  SELECT
    r.report_nk,
    r.legacy_report_id,
    dc.case_sk,
    CONVERT(int, CONVERT(char(8), r.time_observed, 112)),
    DATEPART(hour, r.time_observed) * 100 + DATEPART(minute, r.time_observed),
    dst.source_type_sk,
    dj.jurisdiction_sk,
    1,
    COALESCE(related_entities.related_entity_count, 0)
  FROM [$(OperationalMirrorDatabaseName)].ops.report AS r
  INNER JOIN [$(OperationalMirrorDatabaseName)].core.case_record AS c
    ON c.case_sk = r.case_sk
  INNER JOIN dim.dim_case AS dc
    ON dc.legacy_case_id = c.legacy_case_id
    AND dc.is_current = 1
  LEFT JOIN dim.dim_source_type AS dst
    ON dst.source_type_code = r.source_type_code
  LEFT JOIN dim.dim_jurisdiction AS dj
    ON dj.jurisdiction_name = c.jurisdiction
  OUTER APPLY (
    SELECT COUNT(*) AS related_entity_count
    FROM [$(OperationalMirrorDatabaseName)].ops.report_entity AS re
    WHERE re.report_sk = r.report_sk
  ) AS related_entities;

  DELETE FROM fact.fact_entity_case_membership;
  INSERT INTO fact.fact_entity_case_membership (
    case_sk,
    entity_sk,
    entity_type_sk,
    effective_date_sk,
    is_primary_case_link,
    membership_count
  )
  SELECT
    dc.case_sk,
    de.entity_sk,
    det.entity_type_sk,
    CONVERT(int, CONVERT(char(8), CAST(ec.linked_at AS date), 112)),
    ec.is_primary,
    1
  FROM [$(OperationalMirrorDatabaseName)].core.entity_case AS ec
  INNER JOIN [$(OperationalMirrorDatabaseName)].core.case_record AS c
    ON c.case_sk = ec.case_sk
  INNER JOIN [$(OperationalMirrorDatabaseName)].core.entity AS e
    ON e.entity_sk = ec.entity_sk
  INNER JOIN dim.dim_case AS dc
    ON dc.legacy_case_id = c.legacy_case_id
    AND dc.is_current = 1
  INNER JOIN dim.dim_entity AS de
    ON de.legacy_entity_id = e.legacy_entity_id
    AND de.is_current = 1
  LEFT JOIN dim.dim_entity_type AS det
    ON det.entity_type_code = e.entity_type_code;

  DELETE FROM fact.fact_relationship_event;
  INSERT INTO fact.fact_relationship_event (
    relationship_nk,
    legacy_relationship_id,
    case_sk,
    from_entity_sk,
    to_entity_sk,
    relationship_type_sk,
    date_sk,
    confidence,
    source_count,
    relationship_count
  )
  SELECT
    r.relationship_nk,
    r.legacy_relationship_id,
    dc.case_sk,
    de_from.entity_sk,
    de_to.entity_sk,
    drt.relationship_type_sk,
    CONVERT(int, CONVERT(char(8), CAST(COALESCE(r.updated_at, r.created_at) AS date), 112)),
    r.confidence,
    r.source_count,
    1
  FROM [$(OperationalMirrorDatabaseName)].core.relationship AS r
  INNER JOIN [$(OperationalMirrorDatabaseName)].core.case_record AS c
    ON c.case_sk = r.case_sk
  INNER JOIN [$(OperationalMirrorDatabaseName)].core.entity AS from_entity
    ON from_entity.entity_sk = r.from_entity_sk
  INNER JOIN [$(OperationalMirrorDatabaseName)].core.entity AS to_entity
    ON to_entity.entity_sk = r.to_entity_sk
  INNER JOIN dim.dim_case AS dc
    ON dc.legacy_case_id = c.legacy_case_id
    AND dc.is_current = 1
  INNER JOIN dim.dim_entity AS de_from
    ON de_from.legacy_entity_id = from_entity.legacy_entity_id
    AND de_from.is_current = 1
  INNER JOIN dim.dim_entity AS de_to
    ON de_to.legacy_entity_id = to_entity.legacy_entity_id
    AND de_to.is_current = 1
  LEFT JOIN dim.dim_relationship_type AS drt
    ON drt.relationship_type_code = r.relationship_type_code;

  DELETE FROM fact.fact_case_snapshot;
  INSERT INTO fact.fact_case_snapshot (
    case_sk,
    snapshot_date_sk,
    status_sk,
    jurisdiction_sk,
    entity_count,
    report_count,
    relationship_count,
    protected_entity_count
  )
  SELECT
    dc.case_sk,
    CONVERT(int, CONVERT(char(8), CAST(SYSUTCDATETIME() AS date), 112)),
    ds.status_sk,
    dj.jurisdiction_sk,
    COALESCE(entity_counts.entity_count, 0),
    COALESCE(report_counts.report_count, 0),
    COALESCE(relationship_counts.relationship_count, 0),
    COALESCE(protected_counts.protected_entity_count, 0)
  FROM [$(OperationalMirrorDatabaseName)].core.case_record AS c
  INNER JOIN dim.dim_case AS dc
    ON dc.legacy_case_id = c.legacy_case_id
    AND dc.is_current = 1
  LEFT JOIN dim.dim_status AS ds
    ON ds.status_code = c.status_code
    AND ds.status_domain = 'case'
  LEFT JOIN dim.dim_jurisdiction AS dj
    ON dj.jurisdiction_name = c.jurisdiction
  OUTER APPLY (
    SELECT COUNT(*) AS entity_count
    FROM [$(OperationalMirrorDatabaseName)].core.entity_case AS ec
    WHERE ec.case_sk = c.case_sk
  ) AS entity_counts
  OUTER APPLY (
    SELECT COUNT(*) AS report_count
    FROM [$(OperationalMirrorDatabaseName)].ops.report AS r
    WHERE r.case_sk = c.case_sk
  ) AS report_counts
  OUTER APPLY (
    SELECT COUNT(*) AS relationship_count
    FROM [$(OperationalMirrorDatabaseName)].core.relationship AS r
    WHERE r.case_sk = c.case_sk
  ) AS relationship_counts
  OUTER APPLY (
    SELECT COUNT(*) AS protected_entity_count
    FROM [$(OperationalMirrorDatabaseName)].core.entity_case AS ec
    INNER JOIN [$(OperationalMirrorDatabaseName)].core.entity AS e
      ON e.entity_sk = ec.entity_sk
    WHERE ec.case_sk = c.case_sk
      AND e.protected_flag = 1
  ) AS protected_counts;

  DELETE FROM fact.fact_attachment_event;
  INSERT INTO fact.fact_attachment_event (
    attachment_nk,
    legacy_attachment_id,
    case_sk,
    entity_sk,
    date_sk,
    attachment_count
  )
  SELECT
    a.attachment_nk,
    a.legacy_attachment_id,
    dc.case_sk,
    de.entity_sk,
    CONVERT(int, CONVERT(char(8), a.created_at, 112)),
    1
  FROM [$(OperationalMirrorDatabaseName)].ops.attachment AS a
  LEFT JOIN [$(OperationalMirrorDatabaseName)].core.case_record AS c
    ON c.case_sk = a.case_sk
  LEFT JOIN [$(OperationalMirrorDatabaseName)].core.entity AS e
    ON e.entity_sk = a.entity_sk
  LEFT JOIN dim.dim_case AS dc
    ON dc.legacy_case_id = c.legacy_case_id
    AND dc.is_current = 1
  LEFT JOIN dim.dim_entity AS de
    ON de.legacy_entity_id = e.legacy_entity_id
    AND de.is_current = 1;
END;
GO

DROP PROCEDURE IF EXISTS etl.usp_refresh_warehouse;
GO

CREATE PROCEDURE etl.usp_refresh_warehouse
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @LoadStartedAt datetime2(3) = SYSUTCDATETIME();

  INSERT INTO etl.load_run (
    pipeline_name,
    started_at_utc,
    load_status,
    message_text
  )
  VALUES (
    'warehouse_full_refresh',
    @LoadStartedAt,
    'running',
    'Fabric warehouse refresh started.'
  );

  BEGIN TRY
    EXEC etl.usp_load_reference_dimensions;
    EXEC etl.usp_load_conformed_dimensions;
    EXEC etl.usp_load_fact_tables;

    UPDATE etl.load_run
    SET
      completed_at_utc = SYSUTCDATETIME(),
      load_status = 'succeeded',
      message_text = 'Fabric warehouse refresh completed.'
    WHERE started_at_utc = @LoadStartedAt
      AND pipeline_name = 'warehouse_full_refresh';
  END TRY
  BEGIN CATCH
    UPDATE etl.load_run
    SET
      completed_at_utc = SYSUTCDATETIME(),
      load_status = 'failed',
      message_text = ERROR_MESSAGE()
    WHERE started_at_utc = @LoadStartedAt
      AND pipeline_name = 'warehouse_full_refresh';

    THROW;
  END CATCH;
END;
GO
