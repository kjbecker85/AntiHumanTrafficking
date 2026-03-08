IF NOT EXISTS (SELECT 1 FROM auth.user_profile WHERE legacy_user_id = N'analyst-1')
BEGIN
  INSERT INTO auth.user_profile (
    legacy_user_id,
    display_name,
    email,
    password_hash,
    default_role_code,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    N'analyst-1',
    N'Demo Analyst',
    N'analyst@demo.local',
    N'a109e36947ad56de1dca1cc49f0ef8ac9ad9a7b1aa0df41fb3c4cb73c1ff01ea',
    N'analyst',
    1,
    '2026-02-01T10:00:00.000',
    '2026-02-01T10:00:00.000'
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM auth.user_profile WHERE legacy_user_id = N'operator-1')
BEGIN
  INSERT INTO auth.user_profile (
    legacy_user_id,
    display_name,
    email,
    password_hash,
    default_role_code,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    N'operator-1',
    N'Demo Operator',
    N'operator@demo.local',
    N'a109e36947ad56de1dca1cc49f0ef8ac9ad9a7b1aa0df41fb3c4cb73c1ff01ea',
    N'operator',
    1,
    '2026-02-01T10:05:00.000',
    '2026-02-01T10:05:00.000'
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM auth.user_profile WHERE legacy_user_id = N'supervisor-1')
BEGIN
  INSERT INTO auth.user_profile (
    legacy_user_id,
    display_name,
    email,
    password_hash,
    default_role_code,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    N'supervisor-1',
    N'Demo Supervisor',
    N'supervisor@demo.local',
    N'a109e36947ad56de1dca1cc49f0ef8ac9ad9a7b1aa0df41fb3c4cb73c1ff01ea',
    N'supervisor',
    1,
    '2026-02-01T10:10:00.000',
    '2026-02-01T10:10:00.000'
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM auth.user_profile WHERE legacy_user_id = N'command-1')
BEGIN
  INSERT INTO auth.user_profile (
    legacy_user_id,
    display_name,
    email,
    password_hash,
    default_role_code,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    N'command-1',
    N'Command Lead',
    N'command@demo.local',
    N'a109e36947ad56de1dca1cc49f0ef8ac9ad9a7b1aa0df41fb3c4cb73c1ff01ea',
    N'supervisor',
    1,
    '2026-02-01T10:15:00.000',
    '2026-02-01T10:15:00.000'
  );
END;
GO

INSERT INTO auth.user_role_assignment (user_sk, role_code, assigned_at)
SELECT u.user_sk, role_map.role_code, role_map.assigned_at
FROM (
  VALUES
    (N'analyst-1', N'analyst', '2026-02-01T10:00:00.000'),
    (N'operator-1', N'operator', '2026-02-01T10:05:00.000'),
    (N'supervisor-1', N'supervisor', '2026-02-01T10:10:00.000'),
    (N'command-1', N'analyst', '2026-02-01T10:15:00.000'),
    (N'command-1', N'operator', '2026-02-01T10:15:00.000'),
    (N'command-1', N'supervisor', '2026-02-01T10:15:00.000')
) AS role_map (legacy_user_id, role_code, assigned_at)
INNER JOIN auth.user_profile AS u
  ON u.legacy_user_id = role_map.legacy_user_id
WHERE NOT EXISTS (
  SELECT 1
  FROM auth.user_role_assignment AS existing
  WHERE existing.user_sk = u.user_sk
    AND existing.role_code = role_map.role_code
);
GO

INSERT INTO auth.login_attempt (
  user_sk,
  email,
  is_successful,
  failure_reason,
  ip_address,
  user_agent,
  attempted_at
)
SELECT
  u.user_sk,
  login_attempt.email,
  login_attempt.is_successful,
  login_attempt.failure_reason,
  login_attempt.ip_address,
  login_attempt.user_agent,
  login_attempt.attempted_at
FROM (
  VALUES
    (N'analyst-1', N'analyst@demo.local', 1, NULL, N'10.20.1.10', N'DemoBrowser/1.0', CAST('2026-03-01T08:00:00.000' AS datetime2(3))),
    (N'operator-1', N'operator@demo.local', 1, NULL, N'10.20.1.11', N'DemoBrowser/1.0', CAST('2026-03-01T08:05:00.000' AS datetime2(3))),
    (N'supervisor-1', N'supervisor@demo.local', 0, N'invalid_password', N'10.20.1.12', N'DemoBrowser/1.0', CAST('2026-03-01T08:10:00.000' AS datetime2(3))),
    (N'supervisor-1', N'supervisor@demo.local', 1, NULL, N'10.20.1.12', N'DemoBrowser/1.0', CAST('2026-03-01T08:12:00.000' AS datetime2(3)))
) AS login_attempt (legacy_user_id, email, is_successful, failure_reason, ip_address, user_agent, attempted_at)
LEFT JOIN auth.user_profile AS u
  ON u.legacy_user_id = login_attempt.legacy_user_id
WHERE NOT EXISTS (
  SELECT 1
  FROM auth.login_attempt AS existing
  WHERE existing.email = login_attempt.email
    AND existing.attempted_at = login_attempt.attempted_at
);
GO

IF NOT EXISTS (SELECT 1 FROM core.case_record WHERE legacy_case_id = N'case-atl-001')
BEGIN
  INSERT INTO core.case_record (
    legacy_case_id,
    case_name,
    status_code,
    jurisdiction,
    priority_code,
    owner_user_sk,
    owner_legacy_user_id,
    review_date,
    created_at,
    updated_at
  )
  SELECT
    N'case-atl-001',
    N'Metro Corridor Coordination - Denver',
    N'open',
    N'Denver Metro',
    N'high',
    u.user_sk,
    N'analyst-1',
    '2026-03-15',
    '2026-02-15T09:00:00.000',
    '2026-03-04T18:30:00.000'
  FROM auth.user_profile AS u
  WHERE u.legacy_user_id = N'analyst-1';
END;
GO

IF NOT EXISTS (SELECT 1 FROM core.case_record WHERE legacy_case_id = N'case-dfw-002')
BEGIN
  INSERT INTO core.case_record (
    legacy_case_id,
    case_name,
    status_code,
    jurisdiction,
    priority_code,
    owner_user_sk,
    owner_legacy_user_id,
    review_date,
    created_at,
    updated_at
  )
  SELECT
    N'case-dfw-002',
    N'Hospitality Cluster Signals',
    N'monitoring',
    N'DFW Region',
    N'medium',
    u.user_sk,
    N'supervisor-1',
    '2026-03-20',
    '2026-02-18T11:00:00.000',
    '2026-03-02T16:45:00.000'
  FROM auth.user_profile AS u
  WHERE u.legacy_user_id = N'supervisor-1';
END;
GO

INSERT INTO core.case_tag (case_sk, tag_text)
SELECT c.case_sk, tag_map.tag_text
FROM (
  VALUES
    (N'case-atl-001', N'denver'),
    (N'case-atl-001', N'transport'),
    (N'case-atl-001', N'multi-jurisdiction'),
    (N'case-dfw-002', N'hospitality'),
    (N'case-dfw-002', N'pattern-of-life')
) AS tag_map (legacy_case_id, tag_text)
INNER JOIN core.case_record AS c
  ON c.legacy_case_id = tag_map.legacy_case_id
WHERE NOT EXISTS (
  SELECT 1
  FROM core.case_tag AS existing
  WHERE existing.case_sk = c.case_sk
    AND existing.tag_text = tag_map.tag_text
);
GO

IF NOT EXISTS (SELECT 1 FROM core.location WHERE display_name = N'Colfax Corridor Motel')
BEGIN
  INSERT INTO core.location (
    display_name,
    address,
    latitude,
    longitude,
    created_at,
    updated_at
  )
  VALUES (
    N'Colfax Corridor Motel',
    N'1391 N Speer Blvd, Denver, CO 80204',
    39.7391,
    -104.9742,
    '2026-02-10T14:00:00.000',
    '2026-03-03T09:15:00.000'
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM core.location WHERE display_name = N'Union Station Transit Hub')
BEGIN
  INSERT INTO core.location (
    display_name,
    address,
    latitude,
    longitude,
    created_at,
    updated_at
  )
  VALUES (
    N'Union Station Transit Hub',
    N'1700 Wewatta St, Denver, CO 80202',
    39.7514,
    -104.9991,
    '2026-02-10T14:10:00.000',
    '2026-03-03T09:20:00.000'
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM core.location WHERE display_name = N'Northside Clinic Denver')
BEGIN
  INSERT INTO core.location (
    display_name,
    address,
    latitude,
    longitude,
    created_at,
    updated_at
  )
  VALUES (
    N'Northside Clinic Denver',
    N'3500 York St, Denver, CO 80205',
    39.7597,
    -104.9639,
    '2026-02-10T14:20:00.000',
    '2026-03-03T09:25:00.000'
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM core.location WHERE display_name = N'RiNo Warehouse Unit 5')
BEGIN
  INSERT INTO core.location (
    display_name,
    address,
    latitude,
    longitude,
    created_at,
    updated_at
  )
  VALUES (
    N'RiNo Warehouse Unit 5',
    N'3500 Brighton Blvd, Denver, CO 80216',
    39.7429,
    -104.9567,
    '2026-02-10T14:30:00.000',
    '2026-03-03T09:30:00.000'
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM core.location WHERE display_name = N'DFW Budget Inn')
BEGIN
  INSERT INTO core.location (
    display_name,
    address,
    latitude,
    longitude,
    created_at,
    updated_at
  )
  VALUES (
    N'DFW Budget Inn',
    N'2150 W Northwest Hwy, Dallas, TX 75220',
    32.8612,
    -96.9027,
    '2026-02-12T09:00:00.000',
    '2026-03-01T12:00:00.000'
  );
END;
GO

INSERT INTO core.entity (
  legacy_entity_id,
  entity_type_code,
  display_name,
  confidence,
  protected_flag,
  unique_identity,
  unique_identifier_type,
  event_datetime,
  description_text,
  image_url,
  created_at,
  updated_at
)
SELECT
  source_entity.legacy_entity_id,
  source_entity.entity_type_code,
  source_entity.display_name,
  source_entity.confidence,
  source_entity.protected_flag,
  source_entity.unique_identity,
  source_entity.unique_identifier_type,
  source_entity.event_datetime,
  source_entity.description_text,
  source_entity.image_url,
  source_entity.created_at,
  source_entity.updated_at
FROM (
  VALUES
    (N'e1', N'person', N'Jordan Hale', CAST(0.91 AS decimal(9,6)), 0, N'JH-CO-1988', N'field_alias', CAST('2026-02-22T21:10:00.000' AS datetime2(3)), N'Frequent traveler linked to transit and motel observations.', NULL, CAST('2026-02-20T12:00:00.000' AS datetime2(3)), CAST('2026-03-03T09:00:00.000' AS datetime2(3))),
    (N'e2', N'suspect', N'Avery Cole', CAST(0.84 AS decimal(9,6)), 0, N'AC-OBS-17', N'analyst_note', CAST('2026-02-24T00:35:00.000' AS datetime2(3)), N'Night-shift activity cluster with communication spikes.', NULL, CAST('2026-02-20T12:05:00.000' AS datetime2(3)), CAST('2026-03-03T09:05:00.000' AS datetime2(3))),
    (N'e3', N'victim', N'Protected Individual A', CAST(0.96 AS decimal(9,6)), 1, N'PI-A', N'protected_casework', CAST('2026-02-25T14:20:00.000' AS datetime2(3)), N'Services-linked protected individual.', NULL, CAST('2026-02-20T12:10:00.000' AS datetime2(3)), CAST('2026-03-03T09:10:00.000' AS datetime2(3))),
    (N'e4', N'phone', N'+1-303-555-0101', CAST(0.93 AS decimal(9,6)), 0, N'+13035550101', N'msisdn', CAST('2026-02-22T22:00:00.000' AS datetime2(3)), N'High-volume messaging handset.', NULL, CAST('2026-02-20T12:15:00.000' AS datetime2(3)), CAST('2026-03-03T09:15:00.000' AS datetime2(3))),
    (N'e6', N'vehicle', N'Gray SUV CO-24K9', CAST(0.79 AS decimal(9,6)), 0, N'VIN-DEMO-00024K9', N'vin', CAST('2026-02-23T18:45:00.000' AS datetime2(3)), N'Plate sightings near motel and transit hub.', NULL, CAST('2026-02-20T12:20:00.000' AS datetime2(3)), CAST('2026-03-03T09:20:00.000' AS datetime2(3))),
    (N'e8', N'location', N'Colfax Corridor Motel', CAST(0.82 AS decimal(9,6)), 0, N'SITE-CCM', N'site_code', CAST('2026-02-21T16:00:00.000' AS datetime2(3)), N'Repeat co-location site.', NULL, CAST('2026-02-20T12:25:00.000' AS datetime2(3)), CAST('2026-03-03T09:25:00.000' AS datetime2(3))),
    (N'e10', N'organization', N'Front Range Transit LLC', CAST(0.75 AS decimal(9,6)), 0, N'ORG-FRT', N'org_code', CAST('2026-02-26T11:30:00.000' AS datetime2(3)), N'Logistics shell company indicator.', NULL, CAST('2026-02-20T12:30:00.000' AS datetime2(3)), CAST('2026-03-03T09:30:00.000' AS datetime2(3))),
    (N'e11', N'account', N'Payment Handle #4382', CAST(0.77 AS decimal(9,6)), 0, N'PAY-4382', N'wallet_handle', CAST('2026-02-27T09:40:00.000' AS datetime2(3)), N'Recurring transfers tied to messaging device.', NULL, CAST('2026-02-20T12:35:00.000' AS datetime2(3)), CAST('2026-03-03T09:35:00.000' AS datetime2(3))),
    (N'e18', N'location', N'Northside Clinic Denver', CAST(0.88 AS decimal(9,6)), 1, N'CLINIC-NC12', N'facility_code', CAST('2026-02-28T13:00:00.000' AS datetime2(3)), N'Protected services location.', NULL, CAST('2026-02-20T12:40:00.000' AS datetime2(3)), CAST('2026-03-03T09:40:00.000' AS datetime2(3))),
    (N'e23', N'location', N'RiNo Warehouse Unit 5', CAST(0.62 AS decimal(9,6)), 0, N'RINO-U5', N'site_code', CAST('2026-03-01T17:10:00.000' AS datetime2(3)), N'Supply staging location.', NULL, CAST('2026-02-20T12:45:00.000' AS datetime2(3)), CAST('2026-03-03T09:45:00.000' AS datetime2(3))),
    (N'e101', N'organization', N'DFW Hospitality Group', CAST(0.73 AS decimal(9,6)), 0, N'DFW-HG', N'org_code', CAST('2026-03-01T10:30:00.000' AS datetime2(3)), N'Organization linked to hospitality cluster.', NULL, CAST('2026-02-25T10:30:00.000' AS datetime2(3)), CAST('2026-03-02T15:20:00.000' AS datetime2(3))),
    (N'e102', N'location', N'DFW Budget Inn', CAST(0.81 AS decimal(9,6)), 0, N'DFW-BI', N'site_code', CAST('2026-03-01T11:00:00.000' AS datetime2(3)), N'Budget lodging tied to repeated observations.', NULL, CAST('2026-02-25T10:40:00.000' AS datetime2(3)), CAST('2026-03-02T15:25:00.000' AS datetime2(3))),
    (N'e103', N'phone', N'+1-469-555-0141', CAST(0.85 AS decimal(9,6)), 0, N'+14695550141', N'msisdn', CAST('2026-03-01T11:15:00.000' AS datetime2(3)), N'Phone active around DFW hospitality cluster.', NULL, CAST('2026-02-25T10:50:00.000' AS datetime2(3)), CAST('2026-03-02T15:30:00.000' AS datetime2(3)))
) AS source_entity (
  legacy_entity_id,
  entity_type_code,
  display_name,
  confidence,
  protected_flag,
  unique_identity,
  unique_identifier_type,
  event_datetime,
  description_text,
  image_url,
  created_at,
  updated_at
)
WHERE NOT EXISTS (
  SELECT 1
  FROM core.entity AS existing
  WHERE existing.legacy_entity_id = source_entity.legacy_entity_id
);
GO

INSERT INTO core.entity_case (entity_sk, case_sk, is_primary, linked_at)
SELECT
  e.entity_sk,
  c.case_sk,
  1,
  entity_case_map.linked_at
FROM (
  VALUES
    (N'e1', N'case-atl-001', CAST('2026-02-20T12:00:00.000' AS datetime2(3))),
    (N'e2', N'case-atl-001', CAST('2026-02-20T12:05:00.000' AS datetime2(3))),
    (N'e3', N'case-atl-001', CAST('2026-02-20T12:10:00.000' AS datetime2(3))),
    (N'e4', N'case-atl-001', CAST('2026-02-20T12:15:00.000' AS datetime2(3))),
    (N'e6', N'case-atl-001', CAST('2026-02-20T12:20:00.000' AS datetime2(3))),
    (N'e8', N'case-atl-001', CAST('2026-02-20T12:25:00.000' AS datetime2(3))),
    (N'e10', N'case-atl-001', CAST('2026-02-20T12:30:00.000' AS datetime2(3))),
    (N'e11', N'case-atl-001', CAST('2026-02-20T12:35:00.000' AS datetime2(3))),
    (N'e18', N'case-atl-001', CAST('2026-02-20T12:40:00.000' AS datetime2(3))),
    (N'e23', N'case-atl-001', CAST('2026-02-20T12:45:00.000' AS datetime2(3))),
    (N'e101', N'case-dfw-002', CAST('2026-02-25T10:30:00.000' AS datetime2(3))),
    (N'e102', N'case-dfw-002', CAST('2026-02-25T10:40:00.000' AS datetime2(3))),
    (N'e103', N'case-dfw-002', CAST('2026-02-25T10:50:00.000' AS datetime2(3)))
) AS entity_case_map (legacy_entity_id, legacy_case_id, linked_at)
INNER JOIN core.entity AS e
  ON e.legacy_entity_id = entity_case_map.legacy_entity_id
INNER JOIN core.case_record AS c
  ON c.legacy_case_id = entity_case_map.legacy_case_id
WHERE NOT EXISTS (
  SELECT 1
  FROM core.entity_case AS existing
  WHERE existing.entity_sk = e.entity_sk
    AND existing.case_sk = c.case_sk
);
GO

INSERT INTO core.entity_alias (entity_sk, alias_text)
SELECT e.entity_sk, alias_map.alias_text
FROM (
  VALUES
    (N'e1', N'JH'),
    (N'e2', N'AC'),
    (N'e3', N'PI-A'),
    (N'e6', N'SUV-24K9'),
    (N'e101', N'DFW-HG')
) AS alias_map (legacy_entity_id, alias_text)
INNER JOIN core.entity AS e
  ON e.legacy_entity_id = alias_map.legacy_entity_id
WHERE NOT EXISTS (
  SELECT 1
  FROM core.entity_alias AS existing
  WHERE existing.entity_sk = e.entity_sk
    AND existing.alias_text = alias_map.alias_text
);
GO

INSERT INTO core.entity_descriptor (entity_sk, descriptor_text)
SELECT e.entity_sk, descriptor_map.descriptor_text
FROM (
  VALUES
    (N'e1', N'frequent traveler'),
    (N'e2', N'night-shift activity'),
    (N'e3', N'support workflow'),
    (N'e4', N'high volume messaging'),
    (N'e6', N'plate sightings'),
    (N'e18', N'protected services'),
    (N'e102', N'hospitality repeat site')
) AS descriptor_map (legacy_entity_id, descriptor_text)
INNER JOIN core.entity AS e
  ON e.legacy_entity_id = descriptor_map.legacy_entity_id
WHERE NOT EXISTS (
  SELECT 1
  FROM core.entity_descriptor AS existing
  WHERE existing.entity_sk = e.entity_sk
    AND existing.descriptor_text = descriptor_map.descriptor_text
);
GO

INSERT INTO core.entity_attribute (entity_sk, attribute_name, attribute_value)
SELECT e.entity_sk, attribute_map.attribute_name, attribute_map.attribute_value
FROM (
  VALUES
    (N'e1', N'travel_pattern', N'denver_transit_corridor'),
    (N'e2', N'watch_status', N'priority_review'),
    (N'e4', N'device_type', N'mobile'),
    (N'e6', N'color', N'gray'),
    (N'e11', N'payment_pattern', N'recurring_small_transfers'),
    (N'e101', N'business_type', N'hospitality'),
    (N'e103', N'carrier', N'demo_mobile')
 ) AS attribute_map (legacy_entity_id, attribute_name, attribute_value)
INNER JOIN core.entity AS e
  ON e.legacy_entity_id = attribute_map.legacy_entity_id
WHERE NOT EXISTS (
  SELECT 1
  FROM core.entity_attribute AS existing
  WHERE existing.entity_sk = e.entity_sk
    AND existing.attribute_name = attribute_map.attribute_name
    AND existing.attribute_value = attribute_map.attribute_value
);
GO

INSERT INTO core.entity_sensitive (entity_sk, redaction_reason, sensitive_json)
SELECT
  e.entity_sk,
  N'Protected victim-support record',
  N'{"servicesContact":"restricted","supportNotes":"sensitive"}'
FROM core.entity AS e
WHERE e.legacy_entity_id = N'e3'
  AND NOT EXISTS (
    SELECT 1
    FROM core.entity_sensitive AS existing
    WHERE existing.entity_sk = e.entity_sk
  );
GO

INSERT INTO core.entity_location (entity_sk, location_sk, is_primary, linked_at)
SELECT
  e.entity_sk,
  l.location_sk,
  entity_location_map.is_primary,
  entity_location_map.linked_at
FROM (
  VALUES
    (N'e1', N'Union Station Transit Hub', 1, CAST('2026-02-22T21:15:00.000' AS datetime2(3))),
    (N'e2', N'Colfax Corridor Motel', 1, CAST('2026-02-24T00:40:00.000' AS datetime2(3))),
    (N'e3', N'Northside Clinic Denver', 1, CAST('2026-02-25T14:30:00.000' AS datetime2(3))),
    (N'e6', N'Colfax Corridor Motel', 1, CAST('2026-02-23T18:50:00.000' AS datetime2(3))),
    (N'e18', N'Northside Clinic Denver', 1, CAST('2026-02-28T13:10:00.000' AS datetime2(3))),
    (N'e23', N'RiNo Warehouse Unit 5', 1, CAST('2026-03-01T17:20:00.000' AS datetime2(3))),
    (N'e101', N'DFW Budget Inn', 1, CAST('2026-03-01T10:35:00.000' AS datetime2(3))),
    (N'e102', N'DFW Budget Inn', 1, CAST('2026-03-01T11:05:00.000' AS datetime2(3)))
) AS entity_location_map (legacy_entity_id, location_display_name, is_primary, linked_at)
INNER JOIN core.entity AS e
  ON e.legacy_entity_id = entity_location_map.legacy_entity_id
INNER JOIN core.location AS l
  ON l.display_name = entity_location_map.location_display_name
WHERE NOT EXISTS (
  SELECT 1
  FROM core.entity_location AS existing
  WHERE existing.entity_sk = e.entity_sk
    AND existing.location_sk = l.location_sk
);
GO

INSERT INTO core.relationship (
  legacy_relationship_id,
  case_sk,
  from_entity_sk,
  to_entity_sk,
  relationship_type_code,
  strength_code,
  confidence,
  source_count,
  label,
  created_at,
  updated_at
)
SELECT
  relationship_map.legacy_relationship_id,
  c.case_sk,
  from_entity.entity_sk,
  to_entity.entity_sk,
  relationship_map.relationship_type_code,
  relationship_map.strength_code,
  relationship_map.confidence,
  relationship_map.source_count,
  relationship_map.label,
  relationship_map.created_at,
  relationship_map.updated_at
FROM (
  VALUES
    (N'r1', N'case-atl-001', N'e1', N'e4', N'communication', N'high', CAST(0.91 AS decimal(9,6)), 8, N'Phone coordination', CAST('2026-02-22T22:05:00.000' AS datetime2(3)), CAST('2026-03-03T10:00:00.000' AS datetime2(3))),
    (N'r2', N'case-atl-001', N'e2', N'e8', N'co_location', N'medium', CAST(0.75 AS decimal(9,6)), 4, N'Motel presence', CAST('2026-02-24T01:00:00.000' AS datetime2(3)), CAST('2026-03-03T10:05:00.000' AS datetime2(3))),
    (N'r3', N'case-atl-001', N'e4', N'e11', N'financial', N'medium', CAST(0.69 AS decimal(9,6)), 3, N'Payment handoff', CAST('2026-02-27T10:00:00.000' AS datetime2(3)), CAST('2026-03-03T10:10:00.000' AS datetime2(3))),
    (N'r4', N'case-atl-001', N'e3', N'e18', N'association', N'high', CAST(0.92 AS decimal(9,6)), 6, N'Service contact', CAST('2026-02-28T13:20:00.000' AS datetime2(3)), CAST('2026-03-03T10:15:00.000' AS datetime2(3))),
    (N'r5', N'case-atl-001', N'e23', N'e10', N'association', N'medium', CAST(0.57 AS decimal(9,6)), 2, N'Staging linkage', CAST('2026-03-01T17:30:00.000' AS datetime2(3)), CAST('2026-03-03T10:20:00.000' AS datetime2(3))),
    (N'r6', N'case-dfw-002', N'e101', N'e103', N'communication', N'medium', CAST(0.73 AS decimal(9,6)), 3, N'Hospitality contact pattern', CAST('2026-03-01T11:20:00.000' AS datetime2(3)), CAST('2026-03-02T15:40:00.000' AS datetime2(3)))
) AS relationship_map (
  legacy_relationship_id,
  legacy_case_id,
  from_legacy_entity_id,
  to_legacy_entity_id,
  relationship_type_code,
  strength_code,
  confidence,
  source_count,
  label,
  created_at,
  updated_at
)
INNER JOIN core.case_record AS c
  ON c.legacy_case_id = relationship_map.legacy_case_id
INNER JOIN core.entity AS from_entity
  ON from_entity.legacy_entity_id = relationship_map.from_legacy_entity_id
INNER JOIN core.entity AS to_entity
  ON to_entity.legacy_entity_id = relationship_map.to_legacy_entity_id
WHERE NOT EXISTS (
  SELECT 1
  FROM core.relationship AS existing
  WHERE existing.legacy_relationship_id = relationship_map.legacy_relationship_id
);
GO

INSERT INTO ops.report (
  legacy_report_id,
  case_sk,
  time_observed,
  location_text,
  narrative,
  source_type_code,
  created_at
)
SELECT
  report_map.legacy_report_id,
  c.case_sk,
  report_map.time_observed,
  report_map.location_text,
  report_map.narrative,
  report_map.source_type_code,
  report_map.created_at
FROM (
  VALUES
    (N'rep-001', N'case-atl-001', CAST('2026-03-01T14:00:00.000' AS datetime2(3)), N'Colfax Corridor Motel', N'Synthetic report 1: observed Jordan Hale and handset e4 near the motel.', N'field_observation', CAST('2026-03-01T14:05:00.000' AS datetime2(3))),
    (N'rep-002', N'case-atl-001', CAST('2026-03-02T14:15:00.000' AS datetime2(3)), N'Union Station Transit Hub', N'Synthetic report 2: travel-node activity around Jordan Hale and gray SUV.', N'open_source', CAST('2026-03-02T14:20:00.000' AS datetime2(3))),
    (N'rep-003', N'case-atl-001', CAST('2026-03-03T14:30:00.000' AS datetime2(3)), N'Northside Clinic Denver', N'Synthetic report 3: protected services contact involving protected individual A.', N'partner_submission', CAST('2026-03-03T14:35:00.000' AS datetime2(3))),
    (N'rep-004', N'case-atl-001', CAST('2026-03-04T14:45:00.000' AS datetime2(3)), N'RiNo Warehouse Unit 5', N'Synthetic report 4: warehouse staging indicators linked to Front Range Transit LLC.', N'internal_note', CAST('2026-03-04T14:50:00.000' AS datetime2(3))),
    (N'rep-005', N'case-dfw-002', CAST('2026-03-05T15:00:00.000' AS datetime2(3)), N'DFW Budget Inn', N'Synthetic report 5: hospitality cluster observation around DFW Hospitality Group and DFW phone.', N'field_observation', CAST('2026-03-05T15:05:00.000' AS datetime2(3)))
) AS report_map (
  legacy_report_id,
  legacy_case_id,
  time_observed,
  location_text,
  narrative,
  source_type_code,
  created_at
)
INNER JOIN core.case_record AS c
  ON c.legacy_case_id = report_map.legacy_case_id
WHERE NOT EXISTS (
  SELECT 1
  FROM ops.report AS existing
  WHERE existing.legacy_report_id = report_map.legacy_report_id
);
GO

INSERT INTO ops.report_entity (report_sk, entity_sk)
SELECT
  r.report_sk,
  e.entity_sk
FROM (
  VALUES
    (N'rep-001', N'e1'),
    (N'rep-001', N'e4'),
    (N'rep-002', N'e1'),
    (N'rep-002', N'e6'),
    (N'rep-003', N'e3'),
    (N'rep-003', N'e18'),
    (N'rep-004', N'e23'),
    (N'rep-004', N'e10'),
    (N'rep-005', N'e101'),
    (N'rep-005', N'e103')
) AS report_entity_map (legacy_report_id, legacy_entity_id)
INNER JOIN ops.report AS r
  ON r.legacy_report_id = report_entity_map.legacy_report_id
INNER JOIN core.entity AS e
  ON e.legacy_entity_id = report_entity_map.legacy_entity_id
WHERE NOT EXISTS (
  SELECT 1
  FROM ops.report_entity AS existing
  WHERE existing.report_sk = r.report_sk
    AND existing.entity_sk = e.entity_sk
);
GO

INSERT INTO ops.attachment (
  legacy_attachment_id,
  parent_type_code,
  case_sk,
  entity_sk,
  report_sk,
  file_type_code,
  storage_path,
  created_at
)
SELECT
  attachment_map.legacy_attachment_id,
  attachment_map.parent_type_code,
  c.case_sk,
  e.entity_sk,
  r.report_sk,
  attachment_map.file_type_code,
  attachment_map.storage_path,
  attachment_map.created_at
FROM (
  VALUES
    (N'att-001', N'report', N'case-atl-001', NULL, N'rep-001', N'image', N'/blob/mock/att-001', CAST('2026-03-01T14:10:00.000' AS datetime2(3))),
    (N'att-002', N'entity', N'case-atl-001', N'e12', NULL, N'pdf', N'/blob/mock/att-002', CAST('2026-03-02T09:00:00.000' AS datetime2(3))),
    (N'att-003', N'report', N'case-atl-001', NULL, N'rep-004', N'spreadsheet', N'/blob/mock/att-003', CAST('2026-03-04T15:00:00.000' AS datetime2(3))),
    (N'att-004', N'report', N'case-dfw-002', NULL, N'rep-005', N'note', N'/blob/mock/att-004', CAST('2026-03-05T15:10:00.000' AS datetime2(3)))
) AS attachment_map (
  legacy_attachment_id,
  parent_type_code,
  legacy_case_id,
  legacy_entity_id,
  legacy_report_id,
  file_type_code,
  storage_path,
  created_at
)
LEFT JOIN core.case_record AS c
  ON c.legacy_case_id = attachment_map.legacy_case_id
LEFT JOIN core.entity AS e
  ON e.legacy_entity_id = attachment_map.legacy_entity_id
LEFT JOIN ops.report AS r
  ON r.legacy_report_id = attachment_map.legacy_report_id
WHERE NOT EXISTS (
  SELECT 1
  FROM ops.attachment AS existing
  WHERE existing.legacy_attachment_id = attachment_map.legacy_attachment_id
);
GO

INSERT INTO audit.audit_event (
  legacy_audit_id,
  actor_user_sk,
  actor_legacy_user_id,
  action_type,
  object_type,
  object_legacy_id,
  metadata_json,
  occurred_at
)
SELECT
  audit_map.legacy_audit_id,
  u.user_sk,
  audit_map.actor_legacy_user_id,
  audit_map.action_type,
  audit_map.object_type,
  audit_map.object_legacy_id,
  audit_map.metadata_json,
  audit_map.occurred_at
FROM (
  VALUES
    (N'audit-001', N'analyst-1', N'view', N'case', N'case-atl-001', N'{"synthetic":true,"source":"dev-seed"}', CAST('2026-03-01T16:00:00.000' AS datetime2(3))),
    (N'audit-002', N'supervisor-1', N'filter', N'entity', N'e3', N'{"synthetic":true,"source":"dev-seed"}', CAST('2026-03-01T16:05:00.000' AS datetime2(3))),
    (N'audit-003', N'analyst-1', N'edit_relationship', N'relationship', N'r3', N'{"synthetic":true,"source":"dev-seed"}', CAST('2026-03-02T10:10:00.000' AS datetime2(3))),
    (N'audit-004', N'command-1', N'export_briefing', N'briefing', N'briefing-001', N'{"synthetic":true,"source":"dev-seed"}', CAST('2026-03-02T10:15:00.000' AS datetime2(3))),
    (N'audit-005', N'operator-1', N'view', N'report', N'rep-005', N'{"synthetic":true,"source":"dev-seed"}', CAST('2026-03-05T15:20:00.000' AS datetime2(3)))
) AS audit_map (
  legacy_audit_id,
  actor_legacy_user_id,
  action_type,
  object_type,
  object_legacy_id,
  metadata_json,
  occurred_at
)
LEFT JOIN auth.user_profile AS u
  ON u.legacy_user_id = audit_map.actor_legacy_user_id
WHERE NOT EXISTS (
  SELECT 1
  FROM audit.audit_event AS existing
  WHERE existing.legacy_audit_id = audit_map.legacy_audit_id
);
GO
