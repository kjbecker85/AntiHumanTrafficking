IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'sec')
BEGIN
  EXEC(N'CREATE SCHEMA sec');
END
GO

IF EXISTS (
  SELECT 1
  FROM sys.security_policies
  WHERE name = N'CaseAccessSecurityPolicy'
)
BEGIN
  DROP SECURITY POLICY sec.CaseAccessSecurityPolicy;
END
GO

CREATE OR ALTER FUNCTION sec.fn_case_access_filter (@jurisdiction_name varchar(120))
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN
  SELECT 1 AS fn_case_access_filter_result
  WHERE
    IS_MEMBER('fabric-supervisors') = 1
    OR IS_MEMBER('fabric-analysts') = 1
    OR IS_MEMBER('fabric-operators') = 1;
GO

CREATE OR ALTER FUNCTION sec.fn_protected_entity_filter (@protected_flag bit)
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN
  SELECT 1 AS fn_protected_entity_filter_result
  WHERE
    @protected_flag = 0
    OR IS_MEMBER('fabric-supervisors') = 1;
GO

CREATE SECURITY POLICY sec.CaseAccessSecurityPolicy
  ADD FILTER PREDICATE sec.fn_case_access_filter(jurisdiction) ON dim.dim_case,
  ADD FILTER PREDICATE sec.fn_protected_entity_filter(protected_flag) ON dim.dim_entity
WITH (STATE = ON);
GO
