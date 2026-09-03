<!-- graph-rules-start -->
## 🧠 Mandatory Rule: Knowledge Graphs First (Graphify & Code-Review-Graph)

**ALWAYS use `graphify` and `code-review-graph` before making any code fixes, debugging issues, or modifying existing features.** The knowledge graph is fast, token-efficient, and provides structural context (callers, callees, affected flows, community boundaries) that blind text searching or broad file inspection misses.

### 1. Before Any Fix or Code Change
- **Architecture & Relationship Inspection**:
  - Run `graphify query "<question or symbol>"` (or use `query_graph_tool` / `semantic_search_nodes_tool`) to locate relevant symbols, call hierarchies, and cross-module dependencies.
  - Run `graphify path "<Source>" "<Target>"` when tracing data/call flows between components.
  - Run `graphify explain "<Node>"` for high-level semantic context.
  - Review [graphify-out/GRAPH_REPORT.md](./graphify-out/GRAPH_REPORT.md) and [graphify-out/graph.json](./graphify-out/graph.json) for god nodes, hubs, and community clusters.
- **Impact Radius & Blast Radius**:
  - Use `get_impact_radius_tool` and `get_affected_flows_tool` to understand which downstream components or UI workflows are affected.
  - Use `query_graph_tool` with `callers_of`, `callees_of`, `imports_of`, and `tests_for` to locate dependent test cases and callers.

### 2. Verify in the Exact Source
- Use graph outputs to narrow scope, then view and verify the exact implementation lines in the source before applying fixes.
- If the graph and source disagree, the source is always authoritative.

### 3. Review & Post-Fix Synchronization
- **Code Review**: Use `detect_changes_tool` + `get_review_context_tool` to review changes and perform risk-scored analysis.
- **Update Graph**: After modifying code files, run `graphify update .` to keep the persistent knowledge graph in sync.

### Key Tools Quick Reference

| Tool / Command | Use When |
| --- | --- |
| `graphify query "<query>"` | Finding related components, functions, or architectural connections |
| `graphify path "<A>" "<B>"` | Tracing execution paths or dependencies between two modules |
| `graphify explain "<node>"` | Getting context and relationships for a specific component/function |
| `graphify update .` | Re-indexing AST and syncing the knowledge graph after code edits |
| `detect_changes_tool` | Reviewing code changes with risk-scored analysis |
| `get_review_context_tool` | Token-efficient source snippet review |
| `get_impact_radius_tool` | Understanding the blast radius before modifying shared logic |
| `get_affected_flows_tool` | Identifying affected execution paths across extension/UI flows |
| `query_graph_tool` | Tracing callers, callees, imports, tests, and dependencies |
| `semantic_search_nodes_tool` | Locating functions, classes, or symbols by name or semantic intent |
<!-- graph-rules-end -->
