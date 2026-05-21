// Shim for backward compatibility. Alias data is now persisted via the KV database layer.
export function writeAliasForTool(tool, aliases) {
  // Data is already saved via setRouterAliasAll in the route
}
