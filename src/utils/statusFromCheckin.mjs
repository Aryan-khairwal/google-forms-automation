export function statusProjectsFromCheckin(projects) {
  return projects.map(({ name, tasks, planned, billable, ebhEquivalent }) => {
    const billableHours = billable ?? planned;
    return {
      name,
      tasks,
      spent: planned,
      billed: ebhEquivalent ? "" : billableHours,
      equivalent: ebhEquivalent ? billableHours : ""
    };
  });
}
