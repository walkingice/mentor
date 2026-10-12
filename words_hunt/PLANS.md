# Words Hunt implementation plan

## Goal and project constraints

Build a printable word-search worksheet generator for teachers. Put the feature in
one HTML file in this directory. Keep its CSS and JavaScript in that file, and use
the repository's `../test_lib.js` for functional unit tests. Do not add third-party
dependencies. Follow this directory's `AGENTS.md` and the parent `../AGENTS.md`.

## User interface and state

1. Add numeric row and column inputs at the top. Each defaults to 7 and accepts
   integers from 7 through 20 independently. Rectangular grids are supported.
2. Add a multiline puzzle input; each line is one candidate word or phrase.
3. Add a filler-text input, a Generate button, a visible error area, and an output
   section. The output contains the final puzzle list and a centered grid with
   equal-sized cells.
4. Store only the raw user inputs: rows, columns, puzzle text, and filler text.
   Define `STORAGE_PREFIX_KEY = 'mentor_words_hunt'` and prefix every
   `localStorage` key with it. Restore inputs on load. Do not persist the grid.
5. Regeneration replaces the previous output. A failed generation clears any
   stale output and shows a useful error message.

## Normalization

1. Process puzzle text line by line so line boundaries remain meaningful.
2. Remove punctuation, symbols, all whitespace (including spaces and tabs),
   and emoji from each line and from filler text. Convert ASCII letters and
   digits to their fullwidth forms. Preserve other letters and numbers.
3. Discard empty normalized puzzle lines. Deduplicate the remaining normalized
   lines, keeping their first occurrence and order. Show an error if none remain.
4. Remove from normalized filler text every character that appears in any
   normalized puzzle. If no filler characters remain, use `。` when filling
   empty cells. This fallback bypasses normalization and filtering.
5. Treat each retained visible character as one grid cell. Normalize text to
   NFC, then segment grapheme clusters with `Intl.Segmenter` so a combining
   mark does not occupy a separate cell. Use the same segments for length
   checks, placement, filler selection, and grid rendering.

## Placement and validation

1. Validate that both dimensions are integers in the allowed range. Reject any
   puzzle longer than both the row count and the column count. Do not reject
   based only on the sum of puzzle lengths: matching letters may share cells.
2. Generate candidate placements in four directions: left to right, right to
   left, top to bottom, and bottom to top. Do not use diagonal directions.
3. A candidate is valid only if its complete word stays within the grid and
   every occupied cell is empty or already contains the same character.
4. Randomize candidate order and try alternate placements when a candidate
   conflicts. Use bounded search or retries so generation cannot hang. If no
   complete placement is found within the chosen limit, report failure and do
   not show a partial worksheet. Keep the search limit in one named constant.
5. After placing every puzzle, fill each empty cell by randomly choosing from
   the filtered filler characters (or the `。` fallback).
6. Retain the normalized, deduplicated puzzle list in input order for display.
   The list must remain visible in the printed worksheet.

## Rendering and printing

1. Render exactly `rows × columns` grid cells, with equal cell width and height.
   Center the grid and keep the puzzle list legible for rectangular sizes.
2. Use `@media print` to hide the form, button, errors, and other non-output
   content. Print only the puzzle list and grid on one A4 page. Size the grid
   against both page width and height, including the space used by the list.
3. Avoid printing a blank page before the first successful generation.

## Functional tests and acceptance

Use `../test_lib.js` to cover pure normalization and placement functions:

- Punctuation, whitespace, tabs, and emoji are removed; ASCII letters and
  digits become fullwidth.
- A character with a combining mark occupies one cell.
- Empty lines and normalized duplicates are removed in first-seen order.
- Filler characters used in puzzles are removed; empty filler uses `。`.
- A 7 × 10 grid works, while dimensions outside 7–20 fail validation.
- A word longer than both axes fails; valid overlaps share only equal cells.
- All four allowed directions work; diagonal and conflicting overlaps do not.
- An impossible or exhausted placement reports failure without partial output.
- The completed grid has the requested dimensions and no empty cells.

Manually check that inputs restore after reload and only input values are
stored. Generate and print at 7 × 7, 7 × 10, and 20 × 20; verify that each A4
preview contains only the output, including its puzzle list, on one page.
