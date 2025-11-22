# MyST Document Listing Plugin

This plugin provides a flexible `listing` directive for [MyST Markdown](https://mystmd.org/) projects. It allows you to display lists or grids of documents (such as blog posts, news, or updates) by reading markdown files from directories or matching glob patterns. The plugin supports sorting, custom grid layouts, thumbnail images, and more.

This feature was inspired by Quarto's [Document Listings](https://quarto.org/docs/websites/website-listings.html).

## Installation

1. Place `listing.mjs` in your project root or a suitable location.
1. Register the plugin in your `myst.yml`:
1. (optional) Copy `myst-plugin-driver.mjs` to your project root or a suitable location so that you can run the plugin after `myst build`.

```yaml
project:
  plugins:
    - type: javascript
      path: listing.mjs
```

### Dependencies

`listing.mjs` dependencies:

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

`myst-plugin-driver.mjs` requires all of the above, plus:

 - `commander` is used to parse command-line options.
    ```bash
    npm install commander
    ```

## Usage

Add the `listing` directive to your markdown files using the triple-colon syntax. You can use it in three main modes: summary (default), table, and grid.

### Basic Example (Summary Table)

Summarize markdown files within `motd/`.

```
:::{listing}
:contents: motd
:max-items: 5
:type: summary
:::
```

### Table Example

Display document attributes in a simple table. You can use comma-separated values and glob patterns for the `:contents:` option:

```
:::{listing}
:contents: apple.md,orange.md,banana.md
:type: table
:max-items: 5
:::
```

You can customize which columns to display using the `:tableColumns:` option:

```
:::{listing}
:contents: apple.md,orange.md,banana.md
:type: table
:table-columns: date, title, description
:::
```

### Grid Example

Display all blog post `index.md` files in a grid.

```
:::{listing}
:contents: blog/*/index.md
:type: grid
:image-width: 120px
:image-height: 120px
:grid-columns: 1
:grid-include-body: true
:grid-card-header: Blog: {date} {title}
:::
```

### JSON Output

Output document metadata as JSON (useful for APIs or custom processing). The `:sort:` option controls the order of items in the output array:

```
:::{listing}
:contents: blog/*/index.md
:type: json
:max-items: 10
:sort: date desc
:::
```

### RSS Feed

Generate an RSS feed from documents (typically used with the command-line driver):

```
./myst-plugin-driver.mjs --file blog.md --directive listing --type rss --rssBaseUrl https://example.com --rssChannelTitle "My Blog"
```

The body content of the listing directive (if present) will be used as the channel description in the RSS feed.

## Directive Options

| Option              | Type     | Description                                                                                       |
|---------------------|----------|---------------------------------------------------------------------------------------------------|
| contents            | String   | Comma-separated list of directories, files, or glob patterns to include.                          |
| sort                | String   | Comma-separated fields to sort by (e.g., `date desc, title`).                                     |
| maxItems            | Number   | Maximum number of items to display. Alias: `max-items`.                                           |
| type                | String   | Display type: `summary` (default), `table`, `grid`, `json`, or `rss`.                             |
| tableColumns        | String   | Comma-separated list of columns to display in table (e.g., `date, title, description`). Default: `date, title, author`. Alias: `table-columns`. |
| grid-columns        | String   | Comma-separated grid column sizes (e.g., `1,1,2,3` or `1` for full width).                        |
| imageWidth          | String   | Width for thumbnail images (e.g., `120px`, `50%`). Alias: `image-width`.                         |
| imageHeight         | String   | Height for thumbnail images (e.g., `120px`, `50%`). Alias: `image-height`.                       |
| imagePlaceholder    | String   | Default image to use if a document has no thumbnail. Alias: `image-placeholder`.                 |
| gridIncludeBody     | Boolean  | If true, includes the document body in grid cards beneath the description. Alias: `grid-include-body`. |
| gridCardHeader      | String   | Template for the grid card header. Supports `{title}` and `{date}`. Default: `{title}`. Alias: `grid-card-header`. |
| rssBaseUrl          | String   | Base URL to prefix to links in RSS output. Aliases: `rss-base-url`, `baseUrl`, `base-url` (for backwards compatibility). |
| rssChannelTitle     | String   | Title for the RSS channel. Alias: `rss-channel-title`.                                            |

## Directive Body

The listing directive accepts optional body content (parsed as MyST markdown) that serves as descriptive text:
- **For visual outputs** (grid, table, summary): The body content is rendered before the listing
- **For RSS output**: The body content becomes the channel `<description>` element (rendered as HTML in a CDATA section)

This allows you to maintain descriptive text in one place that works for both web and RSS outputs.

**Example:**

```
:::{listing}
:contents: motd
:type: grid

 - Report problems - support@example.edu
 - Read our docs   - https://example.com/docs
:::
```

## Frontmatter Fields

The following frontmatter fields will be read by the plugin:

- `title`: The document title.
- `author`: A string or a list of objects with `name` (and optionally `orcid`).
- `date`: The document date.
- `description`: A short summary or description.
- `thumbnail`: Path to a thumbnail image (relative to the document).


## Command-line Plugin Driver

The `myst-plugin-driver.mjs` script allows you to simulate and debug MyST plugin directives directly from the command line. This is useful for testing and inspecting the output of the `listing` directive (or any other directive) without running a full MyST build.

### Primary Use Case

To generate an RSS feed from a blog index using the `listing` directive:

```
./myst-plugin-driver.mjs --file blog.md --directive listing --type rss --rssBaseUrl https://example.com --rssChannelTitle "My Blog"
```

- `--file` (or `-f`): Path to the markdown file containing the directive.
- `--directive` (or `-d`): The directive to simulate (default: `listing`).
- `--type`: The type of listing output (e.g., `rss`, `table`, `grid`, etc.).
- `--rssBaseUrl`: The base URL to prefix to links in RSS output (can also use `--baseUrl` for backwards compatibility).
- `--rssChannelTitle`: The title for the RSS channel.

### Debugging Other Listing Types or Directives

You can use `myst-plugin-driver.mjs` to debug other listing types or any directive supported by your plugin. For example:

```
./myst-plugin-driver.mjs --file blog.md --directive listing --type table
./myst-plugin-driver.mjs --file blog.md --directive listing --type grid
./myst-plugin-driver.mjs --file blog.md --directive mycustom --someOption value
```

You can also pass additional options supported by your directive using `--option value` pairs.

### Example

```
./myst-plugin-driver.mjs --file blog.md --directive listing --type grid --maxItems 5 --sort "date desc"
```

This will output the AST or result for the specified directive and options, making it easy to debug and inspect plugin behavior.

## Notes

- The plugin supports glob patterns for flexible content selection.
- If a directory is specified in `:contents:`, all `.md` files in that directory are included.
- Sorting supports fields like `date`, `title`, and `author`.
- The grid layout is highly customizable with column sizes and header templates.
- Author fields in frontmatter can be a string or a list of objects.

## License

MIT
