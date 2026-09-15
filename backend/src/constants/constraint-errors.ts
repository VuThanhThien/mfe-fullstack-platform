export const constraintErrors: Record<string, string> = Object.freeze({
  UQ_user_username: 'error.unique.username',
  UQ_user_email: 'error.unique.email',
  UQ_scope_name: 'scope.unique.name',
  UQ_mfe_config_remote_expose: 'mfe-config.unique.remote_expose',
  UQ_mfe_config_route_name: 'mfe-config.unique.route_name',
});
