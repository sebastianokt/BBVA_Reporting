export const setActiveModule = (name, state) => {
  state.activeModule = name;

  document.querySelectorAll(".module").forEach((module) => {
    module.classList.toggle("active", module.id === `mod-${name}`);
  });

  document.querySelectorAll(".module-tabs .btn").forEach((button) => {
    const isActive = button.dataset.module === name;
    button.classList.toggle("btn-primary", isActive);
    button.classList.toggle("btn-light", !isActive);
  });
};

export const setActiveTeam = (team, state, onChange) => {
  state.activeTeam = team;

  document.querySelectorAll("[data-team]").forEach((link) => {
    link.classList.toggle("active", link.dataset.team === team);
  });

  onChange?.();
};
