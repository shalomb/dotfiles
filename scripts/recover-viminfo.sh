#!/usr/bin/env bash
# Script to recover data from orphaned viminfo files

set -euo pipefail

OUTPUT_DIR="$HOME/.local/state/nvim/viminfo-recovery"
mkdir -p "$OUTPUT_DIR"

find ~/ -type d -name '~' 2>/dev/null | while read dir; do
    info="$dir/.local/state/nvim/nviminfo"
    [ ! -f "$info" ] && continue

    # Create a safe filename from the directory path
    safe_name=$(echo "$dir" | sed 's|^/home/unop/||' | tr '/' '_' | tr '~' 'TILDE')
    output_file="$OUTPUT_DIR/${safe_name}.txt"

    echo "=== Processing: $info ===" > "$output_file"
    echo "Source: $info" >> "$output_file"
    echo "Size: $(ls -lh "$info" | awk '{print $5}')" >> "$output_file"
    echo "Date: $(stat -c %y "$info" 2>/dev/null || stat -f %Sm "$info")" >> "$output_file"
    echo "" >> "$output_file"

    # Extract registers
    echo "--- REGISTERS ---" >> "$output_file"
    nvim --headless -c "rshada $info" \
         -c "lua
             local found = false
             -- Check numbered registers
             for i=0,9 do
                 local r = vim.fn.getreg(tostring(i))
                 if r ~= '' then
                     found = true
                     print('Register ' .. i .. ' (' .. #r .. ' chars):')
                     print(string.sub(r, 1, 200))
                     if #r > 200 then print('... (truncated)') end
                     print('')
                 end
             end
             -- Check named registers
             for c=string.byte('a'), string.byte('z') do
                 local r = vim.fn.getreg(string.char(c))
                 if r ~= '' then
                     found = true
                     print('Register ' .. string.char(c) .. ' (' .. #r .. ' chars):')
                     print(string.sub(r, 1, 200))
                     if #r > 200 then print('... (truncated)') end
                     print('')
                 end
             end
             if not found then print('No registers found') end
         " \
         -c "qa" 2>&1 | grep -v "^$" >> "$output_file" || echo "No registers" >> "$output_file"

    echo "" >> "$output_file"
    echo "--- MARKS ---" >> "$output_file"
    nvim --headless -c "rshada $info" \
         -c "lua
             local marks = {}
             for c=string.byte('a'), string.byte('z') do
                 local mark = vim.fn.getpos(\"'\" .. string.char(c))
                 if mark[1] > 0 then
                     table.insert(marks, string.char(c) .. ': ' .. mark[2] .. ':' .. mark[3] .. ' in buffer ' .. mark[1])
                 end
             end
             if #marks > 0 then
                 for _, m in ipairs(marks) do print(m) end
             else
                 print('No marks found')
             end
         " \
         -c "qa" 2>&1 | grep -v "^$" >> "$output_file" || echo "No marks" >> "$output_file"

    echo "" >> "$output_file"
    echo "--- COMMAND HISTORY (last 20) ---" >> "$output_file"
    nvim --headless -c "rshada $info" \
         -c "lua
             local hist = vim.fn.histget(':', -20)
             if hist and hist ~= '' then
                 local lines = {}
                 for i=-20, -1 do
                     local cmd = vim.fn.histget(':', i)
                     if cmd and cmd ~= '' then
                         table.insert(lines, tostring(i) .. ': ' .. cmd)
                     end
                 end
                 if #lines > 0 then
                     for _, l in ipairs(lines) do print(l) end
                 else
                     print('No command history')
                 end
             else
                 print('No command history')
             end
         " \
         -c "qa" 2>&1 | grep -v "^$" >> "$output_file" || echo "No command history" >> "$output_file"

    echo "" >> "$output_file"
    echo "--- SEARCH HISTORY (last 10) ---" >> "$output_file"
    nvim --headless -c "rshada $info" \
         -c "lua
             local lines = {}
             for i=-10, -1 do
                 local search = vim.fn.histget('/', i)
                 if search and search ~= '' then
                     table.insert(lines, tostring(i) .. ': ' .. search)
                 end
             end
             if #lines > 0 then
                 for _, l in ipairs(lines) do print(l) end
             else
                 print('No search history')
             end
         " \
         -c "qa" 2>&1 | grep -v "^$" >> "$output_file" || echo "No search history" >> "$output_file"

    echo "Recovered: $output_file"
done

echo ""
echo "=== Recovery complete ==="
echo "All recovered data saved to: $OUTPUT_DIR"
echo "Review the files and then you can merge useful data into your active viminfo"
