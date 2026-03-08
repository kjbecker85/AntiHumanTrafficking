MERGE ref.user_role_ref AS target
USING (
  VALUES
    (N'analyst', N'Analyst', N'Link analysis and investigative review.'),
    (N'operator', N'Operator', N'Field reporting and mission operations.'),
    (N'supervisor', N'Supervisor', N'Protected access and supervisory oversight.')
) AS source (role_code, role_name, role_description)
ON target.role_code = source.role_code
WHEN NOT MATCHED THEN
  INSERT (role_code, role_name, role_description)
  VALUES (source.role_code, source.role_name, source.role_description);
GO

MERGE ref.case_status_ref AS target
USING (
  VALUES
    (N'open', N'Open'),
    (N'monitoring', N'Monitoring'),
    (N'closed', N'Closed')
) AS source (status_code, status_name)
ON target.status_code = source.status_code
WHEN NOT MATCHED THEN
  INSERT (status_code, status_name)
  VALUES (source.status_code, source.status_name);
GO

MERGE ref.case_priority_ref AS target
USING (
  VALUES
    (N'low', N'Low'),
    (N'medium', N'Medium'),
    (N'high', N'High')
) AS source (priority_code, priority_name)
ON target.priority_code = source.priority_code
WHEN NOT MATCHED THEN
  INSERT (priority_code, priority_name)
  VALUES (source.priority_code, source.priority_name);
GO

MERGE ref.entity_type_ref AS target
USING (
  VALUES
    (N'person', N'Person'),
    (N'suspect', N'Suspect'),
    (N'unknown_person', N'Unknown Person'),
    (N'victim', N'Victim'),
    (N'associate', N'Associate'),
    (N'organization', N'Organization'),
    (N'phone', N'Phone'),
    (N'email', N'Email'),
    (N'vehicle', N'Vehicle'),
    (N'license_plate', N'License Plate'),
    (N'location', N'Location'),
    (N'account', N'Account'),
    (N'document', N'Document')
) AS source (entity_type_code, entity_type_name)
ON target.entity_type_code = source.entity_type_code
WHEN NOT MATCHED THEN
  INSERT (entity_type_code, entity_type_name)
  VALUES (source.entity_type_code, source.entity_type_name);
GO

MERGE ref.relationship_type_ref AS target
USING (
  VALUES
    (N'contact', N'Contact'),
    (N'co_location', N'Co-Location'),
    (N'financial', N'Financial'),
    (N'communication', N'Communication'),
    (N'association', N'Association')
) AS source (relationship_type_code, relationship_type_name)
ON target.relationship_type_code = source.relationship_type_code
WHEN NOT MATCHED THEN
  INSERT (relationship_type_code, relationship_type_name)
  VALUES (source.relationship_type_code, source.relationship_type_name);
GO

MERGE ref.relationship_strength_ref AS target
USING (
  VALUES
    (N'low', N'Low'),
    (N'medium', N'Medium'),
    (N'high', N'High')
) AS source (strength_code, strength_name)
ON target.strength_code = source.strength_code
WHEN NOT MATCHED THEN
  INSERT (strength_code, strength_name)
  VALUES (source.strength_code, source.strength_name);
GO

MERGE ref.report_source_type_ref AS target
USING (
  VALUES
    (N'open_source', N'Open Source'),
    (N'partner_submission', N'Partner Submission'),
    (N'field_observation', N'Field Observation'),
    (N'internal_note', N'Internal Note')
) AS source (source_type_code, source_type_name)
ON target.source_type_code = source.source_type_code
WHEN NOT MATCHED THEN
  INSERT (source_type_code, source_type_name)
  VALUES (source.source_type_code, source.source_type_name);
GO

MERGE ref.attachment_file_type_ref AS target
USING (
  VALUES
    (N'image', N'Image'),
    (N'pdf', N'PDF'),
    (N'spreadsheet', N'Spreadsheet'),
    (N'note', N'Note')
) AS source (file_type_code, file_type_name)
ON target.file_type_code = source.file_type_code
WHEN NOT MATCHED THEN
  INSERT (file_type_code, file_type_name)
  VALUES (source.file_type_code, source.file_type_name);
GO

MERGE ref.parent_type_ref AS target
USING (
  VALUES
    (N'case', N'Case'),
    (N'entity', N'Entity'),
    (N'report', N'Report')
) AS source (parent_type_code, parent_type_name)
ON target.parent_type_code = source.parent_type_code
WHEN NOT MATCHED THEN
  INSERT (parent_type_code, parent_type_name)
  VALUES (source.parent_type_code, source.parent_type_name);
GO

INSERT INTO control.schema_version (version_number, applied_by, notes)
SELECT N'002', N'migration', N'Reference seed data loaded.'
WHERE NOT EXISTS (
  SELECT 1
  FROM control.schema_version
  WHERE version_number = N'002'
);
GO
