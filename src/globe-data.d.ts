// The world-atlas TopoJSON is imported for its data, not its (enormous) literal
// type — declare it loosely so tsc doesn't try to infer the whole structure.
declare module "world-atlas/countries-110m.json" {
  const topology: import("topojson-specification").Topology;
  export default topology;
}
