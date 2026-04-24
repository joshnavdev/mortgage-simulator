#!/bin/bash
# sessionStart hook: inject Serena-first routing into agent context at conversation start.
# sessionStart fires once per new chat and supports additional_context injection.
cat <<'EOF'
{
    "additional_context": "SERENA CODE INTELLIGENCE: Before using Grep/Read/SemanticSearch for code, check if Serena can do it better:\n- FIND code: find_symbol (by name), get_symbols_overview (file structure), search_for_pattern (regex)\n- UNDERSTAND code: find_symbol with include_info (types/docs), find_symbol with depth:1 (class members)\n- TRACE code: find_referencing_symbols (who calls/uses this symbol)\n- EDIT code: replace_symbol_body, insert_after_symbol, rename_symbol (LSP rename across codebase)\n- READ code: find_symbol with include_body (read ONE function, not the whole file)\nOnly use Grep for string literals/logs/non-code. Only use Read for configs/JSON/markdown.\nNEVER use Grep to find functions/classes or Read to understand file structure when Serena is available."
}
EOF
