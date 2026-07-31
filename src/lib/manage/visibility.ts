type VisibilityRow = {
  organization_id?: unknown;
  visible_in_crm?: unknown;
};

export function hiddenOrganizationIds(rows: VisibilityRow[]) {
  return new Set(
    rows
      .filter((row) => row.visible_in_crm === false)
      .map((row) =>
        typeof row.organization_id === "string" ? row.organization_id : "",
      )
      .filter(Boolean),
  );
}

