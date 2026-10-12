# Principle

* Single HTML files provides all functions
- Each subdirectory represents an independent feature
- Use `test_lib.js` to write tests. No third-party library is needed. Just focus on the functional unit test.

# Data storage

- Stores all the data to localStorage. Since the same domain might be shared to different pages by path, one prefix should be added to each key.
    - Use the word `mentor` and sub directory name to define prefix like `mentor_[sub_dir]`
    - Use the prefix to define variable `STORAGE_PREFIX_KEY=mentor_[sub_dir]`
    - When accessing localStorage, the prefix should be added to each key.

