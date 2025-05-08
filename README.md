# MyST Document Listing Plugin

This plugin provides a flexible `document-listing` directive for [MyST Markdown](https://mystmd.org/) projects. It allows you to display lists or grids of documents (such as blog posts, news, or updates) by reading markdown files from directories or matching glob patterns. The plugin supports sorting, custom grid layouts, thumbnail images, and more.

This feature was inspired by Quarto's [Document Listings](https://quarto.org/docs/websites/website-listings.html).

## Installation

1. Place `listing.mjs` in your project root or a suitable location.
2. Register the plugin in your `myst.yml`:

```yaml
project:
  plugins:
    - type: javascript
      path: listing.mjs
```

### Dependencies

 - `myst-parser` is used to parse the contents of MyST markdown files.
    ```bash
    npm install myst-parser
    ```
 - `js-yaml` is used for parsing MyST frontmatter
    ```bash
    npm install js-yaml
    ```
 - `glob` is used to match file patterns
    ```bash
    npm install glob
    ```

## Usage

Add the `document-listing` directive to your markdown files using the triple-colon syntax. You can use it in three main modes: summary (default), table, and grid.

### Basic Example (Summary Table)

Summarize markdown files within `motd/`.

```
:::{document-listing}
:contents: motd
:max-items: 5
:type: summary
:::
```

### Table Example

```
:::{document-listing}
:contents: apple.md,orange.md,banana.md
:type: table
:max-items: 5
:::
```

### Grid Example

Display all blog post `index.md` files in a grid.

```
:::{document-listing}
:contents: blog/*/index.md
:type: grid
:image-width: 120px
:image-height: 120px
:grid-columns: 1
:grid-include-body: true
:grid-card-header: Blog: {date} {title}
:::
```

### Using Multiple Directories or Patterns

You can use comma-separated values and glob patterns for the `:contents:` option:

```
:::{document-listing}
:contents: motd, motd-blog/*/index.md, blog/**/*.md
:max-items: 10
:type: grid
:::
```

## Directive Options

| Option              | Type     | Description                                                                                       |
|---------------------|----------|---------------------------------------------------------------------------------------------------|
| contents            | String   | Comma-separated list of directories, files, or glob patterns to include.                          |
| sort                | String   | Comma-separated fields to sort by (e.g., `date desc, title`).                                     |
| maxItems            | Number   | Maximum number of items to display. Alias: `max-items`.                                           |
| type                | String   | Display type: `summary` (default), `table`, or `grid`.                                            |
| grid-columns        | String   | Comma-separated grid column sizes (e.g., `1,1,2,3` or `1` for full width).                        |
| imageWidth          | String   | Width for thumbnail images (e.g., `120px`, `50%`). Alias: `image-width`.                         |
| imageHeight         | String   | Height for thumbnail images (e.g., `120px`, `50%`). Alias: `image-height`.                       |
| imagePlaceholder    | String   | Default image to use if a document has no thumbnail. Alias: `image-placeholder`.                 |
| gridIncludeBody     | Boolean  | If true, includes the document body in grid cards beneath the description. Alias: `grid-include-body`. |
| gridCardHeader      | String   | Template for the grid card header. Supports `{title}` and `{date}`. Default: `{title}`. Alias: `grid-card-header`. |

## Frontmatter Fields

The following frontmatter fields will be read by the plugin:

- `title`: The document title.
- `author`: A string or a list of objects with `name` (and optionally `orcid`).
- `date`: The document date.
- `description`: A short summary or description.
- `thumbnail`: Path to a thumbnail image (relative to the document).

## Examples


## Notes

- The plugin supports glob patterns for flexible content selection.
- If a directory is specified in `:contents:`, all `.md` files in that directory are included.
- Sorting supports fields like `date`, `title`, and `author`.
- The grid layout is highly customizable with column sizes and header templates.
- Author fields in frontmatter can be a string or a list of objects.

## License

MIT
