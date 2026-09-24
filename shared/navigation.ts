export function isNavItemActive(itemPath: string, location: string) {
  return itemPath === "/" ? location === "/" : location === itemPath || location.startsWith(`${itemPath}/`);
}
