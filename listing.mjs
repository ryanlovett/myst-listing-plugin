// myst JavaScript plugin: listing.mjs
// Reads and displays markdown files.
import fs from 'fs';
import path from 'path';
import { mystParse } from 'myst-parser';
import yaml from 'js-yaml';
import * as glob from 'glob';

function safeText(value) {
  return typeof value === 'string' ? value : '';
}

function extractAuthors(authorField) {
  if (typeof authorField === 'string') {
    return authorField;
  } else if (Array.isArray(authorField) && authorField.length > 0) {
    // Return a comma-separated list of names if present
    return authorField.map(a => a.name || JSON.stringify(a)).join(', ');
  }
  return '';
}

function assembleSummaryAST(fileData, imageWidth, imageHeight) {
  // Build AST nodes for summary output (default)
  const tableRows = fileData.map(({ title, author, date, description, thumbnail, filename }) => {
    const cells = [];

    // Left column: date and author
    const leftCell = {
      type: 'tableCell',
      class: 'listing-summary-cell-left',
      children: []
    };
    if (date) {
      leftCell.children.push({
        type: 'paragraph',
        class: 'listing-summary-date',
        children: [{ type: 'text', value: safeText(date) }]
      });
    }
    if (author) {
      leftCell.children.push({
        type: 'paragraph',
        class: 'listing-summary-author',
        children: [{ type: 'text', value: safeText(author) }]
      });
    }
    cells.push(leftCell);

    // Middle column: title (linked) and description
    const middleCell = {
      type: 'tableCell',
      class: 'listing-summary-cell-middle',
      children: []
    };
    if (title) {
      middleCell.children.push({
        type: 'heading',
        depth: 3,
        children: [
          {
            type: 'link',
            class: 'listing-summary-title',
            url: `${filename.replace(/\.md$/, '')}`,
            children: [{ type: 'text', value: safeText(title) }]
          }
        ]
      });
    }
    if (description) {
      middleCell.children.push({
        type: 'paragraph',
        class: 'listing-summary-description',
        children: [{ type: 'text', value: safeText(description) }]
      });
    }
    cells.push(middleCell);

    // Right column: thumbnail
    const rightCell = {
      type: 'tableCell',
      class: 'listing-summary-cell-right',
      children: []
    };
    if (thumbnail && typeof thumbnail === 'object' && thumbnail.type === 'image') {
      if (imageWidth) thumbnail.width = imageWidth;
      if (imageHeight) thumbnail.height = imageHeight;
      rightCell.children.push(thumbnail);
    } else if (typeof thumbnail === 'string' && thumbnail) {
      rightCell.children.push({
        type: 'image',
        url: thumbnail,
        class: 'listing-summary-thumbnail',
        alt: safeText(title),
        ...(imageWidth ? { width: imageWidth } : {}),
        ...(imageHeight ? { height: imageHeight } : {})
      });
    }
    cells.push(rightCell);

    return {
      type: 'tableRow',
      children: cells
    };
  });

  return [{
    type: 'table',
    children: tableRows
  }];
}

function assembleTableAST(fileData) {
  // Build AST nodes for table output
  const headerRow = {
    type: 'tableRow',
    children: [
      { type: 'tableCell', class: 'listing-table-cell-left', children: [{ type: 'paragraph', class: 'listing-table-date-header', children: [{ type: 'text', value: 'Date' }] }] },
      { type: 'tableCell', class: 'listing-table-cell-middle', children: [{ type: 'paragraph', class: 'listing-table-title-header', children: [{ type: 'text', value: 'Title' }] }] },
      { type: 'tableCell', class: 'listing-table-cell-right', children: [{ type: 'paragraph', class: 'listing-table-author-header', children: [{ type: 'text', value: 'Author' }] }] }
    ]
  };

  const tableRows = fileData.map(({ title, author, date, filename }) => {
    return {
      type: 'tableRow',
      children: [
        { type: 'tableCell', children: [{ type: 'paragraph', class: 'listing-table-date', children: [{ type: 'text', value: date || '' }] }] },
        {
          type: 'tableCell',
          children: [
            {
              type: 'paragraph',
              class: 'listing-table-title',
              children: [
                {
                  type: 'link',
                  url: `${filename.replace(/\.md$/, '')}`,
                  children: [{ type: 'text', value: title || '' }]
                }
              ]
            }
          ]
        },
        { type: 'tableCell', children: [{ type: 'paragraph', class: 'listing-table-author', children: [{ type: 'text', value: author || '' }] }] }
      ]
    };
  });

  return [{
    type: 'table',
    children: [headerRow, ...tableRows]
  }];
}

function renderGridCardHeader(template, title, date, url) {
  // Replace {title} and {date} in the template
  const text = template.replace('{title}', title || '').replace('{date}', date || '');
  return {
    type: 'header',
    class: 'listing-grid-header',
    children: [
      {
        type: 'link',
        url,
        children: [{ type: 'text', value: text }]
      }
    ]
  };
}

function assembleGridAST(fileData, gridColumns = [1, 1, 2, 3], imageWidth, imageHeight, gridIncludeBody, gridCardHeaderTemplate) {
  // Build AST nodes for grid output
  const columns = Array.isArray(gridColumns) ? gridColumns.map(Number) : String(gridColumns).split(' ').map(Number);

  // Build AST nodes for grid output
  const grid = {
    type: 'grid',
    columns: columns,
    children: fileData.map(({ title, author, description, thumbnail, filename, bodyNodes, date }) => {
      const url = `${filename.replace(/\.md$/, '')}`;
      const cardChildren = [
        renderGridCardHeader(gridCardHeaderTemplate, title, date, url)
      ];

      if (thumbnail) {
        cardChildren.push({
          type: 'image',
          class: 'listing-grid-thumbnail',
          url: thumbnail,
          alt: title || '',
          ...(imageWidth ? { width: imageWidth } : {}),
          ...(imageHeight ? { height: imageHeight } : {})
        });
      }

      if (description) {
        cardChildren.push({
          type: 'paragraph',
          class: 'listing-grid-description',
          children: [{ type: 'text', value: description }]
        });
      }

      // Add body content if gridIncludeBody is true
      if (gridIncludeBody && Array.isArray(bodyNodes)) {
        cardChildren.push(...bodyNodes);
      }

      // Card footer: author
      cardChildren.push({
        type: 'footer',
        children: [{
          type: 'paragraph',
          class: 'listing-grid-author',
          children: [{ type: 'text', value: author || '' }]
        }]
      });

      return {
        type: 'card',
        class: 'listing-grid-card',
        children: cardChildren
      };
    })
  };

  return [grid];
}

function assembleRSSXML(fileData, baseUrl) {
  // Helper to render bodyNodes as HTML
  const renderNode = (node) => {
    if (node.type === 'paragraph') {
      const text = (node.children || []).map(renderNode).join('');
      return `<p>${text}</p>`;
    } else if (node.type === 'text') {
      return node.value || '';
    } else if (node.type === 'heading') {
      const text = (node.children || []).map(renderNode).join('');
      return `<h${node.depth || 1}>${text}</h${node.depth || 1}>`;
    } else if (node.type === 'list') {
      const tag = node.ordered ? 'ol' : 'ul';
      const items = (node.children || []).map(renderNode).join('');
      return `<${tag}>${items}</${tag}>`;
    } else if (node.type === 'listItem') {
      const text = (node.children || []).map(renderNode).join('');
      return `<li>${text}</li>`;
    } else if (node.type === 'link') {
      const text = (node.children || []).map(renderNode).join('');
      return `<a href="${node.url}">${text}</a>`;
    } else if (node.type === 'image') {
      return `<img src="${node.url}" alt="${node.alt || ''}" />`;
    }
    if (Array.isArray(node.children)) {
      return node.children.map(renderNode).join('');
    }
    return '';
  };

  const escape = (str) => String(str || '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

  // Get channel title and description from the first file's frontmatter if available
  let channelTitle = 'RSS Feed';
  let channelDescription = '';
  if (fileData.length > 0) {
    if (fileData[0].title) channelTitle = fileData[0].title;
    if (fileData[0].description) channelDescription = fileData[0].description;
  }

  const itemsXml = fileData.map(({ title, authors, date, description, filename, bodyNodes }) => {
    // Ensure link is absolute using baseUrl
    let link = '';
    if (baseUrl) {
      const base = baseUrl.replace(/\/$/, '');
      const rel = filename.replace(/\.md$/, '');
      link = `${base}/${rel}`;
    } else {
      link = filename.replace(/\.md$/, '');
    }
    const authorStr = Array.isArray(authors) ? authors.map(a => a.name).filter(Boolean).join(', ') : '';
    let bodyHtml = '';
    if (Array.isArray(bodyNodes)) {
      bodyHtml = bodyNodes.map(renderNode).join('');
    }
    return [
      '    <item>',
      `      <title>${escape(title)}</title>`,
      `      <link>${escape(link)}</link>`,
      date ? `      <pubDate>${escape(new Date(date).toUTCString())}</pubDate>` : '',
      authorStr ? `      <author>${escape(authorStr)}</author>` : '',
      description ? `      <description>${escape(description)}</description>` : '',
      bodyHtml ? `      <content:encoded><![CDATA[${bodyHtml}]]></content:encoded>` : '',
      '    </item>'
    ].filter(Boolean).join('\n');
  }).join('\n');

  const rssXml = [
    '<?xml version="1.0" encoding="UTF-8" ?>',
    '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
    '  <channel>',
    `    <title>${escape(channelTitle)}</title>`,
    `    <link>${escape(baseUrl || '')}</link>`,
    `    <description>${escape(channelDescription)}</description>`,
    itemsXml,
    '  </channel>',
    '</rss>'
  ].join('\n');

  return rssXml;
}

function resolveThumbnailPath(filePath, thumbnailRelPath, listingPageDir) {
  const docDir = path.dirname(filePath);
  const absThumb = path.resolve(docDir, thumbnailRelPath);
  const projectRoot = process.cwd();
  let relThumb = path.relative(projectRoot, absThumb);
  // Normalize to use forward slashes for web
  relThumb = relThumb.split(path.sep).join('/');
  return '/' + relThumb;
}

function resolveContentFiles(contentsList) {
  // Resolve the contents list to absolute paths
  // and expand directories to include all .md files
  let files = [];
  for (const pattern of contentsList) {
    const absPattern = path.resolve(process.cwd(), pattern);
    if (fs.existsSync(absPattern) && fs.statSync(absPattern).isDirectory()) {
      // If it's a directory, expand to all .md files in that directory
      const dirGlob = path.join(pattern, '*.md');
      const matches = glob.sync(dirGlob, { cwd: process.cwd(), absolute: false });
      files.push(...matches);
    } else {
      // Otherwise, treat as a glob pattern or file
      const matches = glob.sync(pattern, { cwd: process.cwd(), absolute: false });
      files.push(...matches);
    }
  }
  // Remove duplicates
  return [...new Set(files)];
}

const assemblyFunctions = {
  summary: assembleSummaryAST,
  table: assembleTableAST,
  grid: assembleGridAST,
  rss: assembleRSSXML
};

const listingDirective = {
  name: 'listing',
  doc: 'A directive to include a document listing.',
  alias: ['document-listing'],
  arg: {},
  options: {
    contents: {
      type: String,
      doc: 'Comma-deparated paths to directories or files to include in the listing.',
      alias: ['files']
    },
    sort: {
      type: String,
      doc: 'Comma-deparated fields to sort by (e.g., date desc, title).'
    },
    maxItems: {
      type: Number,
      doc: 'Maximum number of items to display.',
      alias: ['max-items']
    },
    type: {
      type: String,
      doc: 'Type of assembly function to use (e.g., "summary").'
    },
    baseUrl: {
      type: String,
      doc: 'Base URL to prefix to links in RSS output.',
      alias: ['base-url']
    },
    'grid-columns': {
      type: String,
      doc: 'Comma-separated grid layout columns (e.g., "1, 1, 2, 3").'
    },
    imageWidth: {
      type: String,
      doc: 'Thumbnail image width (e.g., "120px" or "50%")',
      alias: ['image-width']
    },
    imageHeight: {
      type: String,
      doc: 'Thumbnail image height (e.g., "120px" or "50%"). Default: 120px',
      alias: ['image-height']
    },
    imagePlaceholder: {
      type: String,
      doc: 'Default image to use if an item has no thumbnail.',
      alias: ['image-placeholder']
    },
    gridIncludeBody: {
      type: Boolean,
      doc: 'Include the document body in grid cards beneath the description.',
      alias: ['grid-include-body']
    },
    gridCardHeader: {
      type: String,
      doc: 'Template for the grid card header. Supports {title} and {date}. Default: {title}',
      alias: ['grid-card-header']
    }
  },
  run(data) {
    const options = data.options || {};
    const contentsOption = options.contents;
    if (!contentsOption) {
        return [{
          type: 'paragraph',
          children: [{ type: 'text', value: 'No directory specified.' }]
        }];
    }
    const contentsList = contentsOption.split(',').map(s => s.trim()).filter(Boolean);
    let files = resolveContentFiles(contentsList);
    const sortOption = options.sort || 'date desc, title';
    const gridColumns = options['grid-columns'] || '1 1 2 3';
    // Accept comma-delimited string for sort
    const sortFields = sortOption.split(',').map(s => s.trim()).filter(Boolean);
    const maxItems = options.maxItems || Infinity;
    const type = options.type || 'summary';
    const baseUrl = options.baseUrl || options['base-url'] || '';
    // Accept comma-delimited string for gridColumns
    const gridCols = gridColumns.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
    const imageWidth = options.imageWidth || options['image-width'] || '';
    const imageHeight = options.imageHeight || options['image-height'] || '120px';
    const imagePlaceholder = options.imagePlaceholder || options['image-placeholder'] || '';
    const gridIncludeBody = options.gridIncludeBody || options['grid-include-body'] || false;
    const gridCardHeaderTemplate = options.gridCardHeader || options['grid-card-header'] || '{title}';

    // files is now a list of relative paths; resolve to absolute for reading
    const listingPageDir = path.dirname(data.file?.path || process.cwd());
    const fileData = files
      .map(filename => {
        const filePath = path.resolve(process.cwd(), filename);
        // Skip if not a file
        try {
          if (!fs.statSync(filePath).isFile()) return null;
        } catch (e) {
          return null;
        }
        let title = filename;
        let author = '';
        let date = '';
        let description = '';
        let thumbnail = '';
        let frontmatter = {};
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const mdast = mystParse(fileContent);
        const children = mdast.children || [];
        let bodyNodes = [];
        if (children.length > 0 && children[0].type === 'code' && children[0].lang === 'yaml') {
          try {
            frontmatter = yaml.load(children[0].value) || {};
            if (frontmatter.title) title = frontmatter.title;
            if (frontmatter.author) {
              author = extractAuthors(frontmatter.author);
            }
            if (frontmatter.date) date = frontmatter.date;
            if (frontmatter.description) description = frontmatter.description;
            if (frontmatter.thumbnail) {
              thumbnail = resolveThumbnailPath(filePath, frontmatter.thumbnail, listingPageDir);
            }
          } catch (e) {}
          bodyNodes = children.slice(1);
        } else {
          bodyNodes = children;
        }
        // If no thumbnail and imagePlaceholder is set, use it
        if (!thumbnail && imagePlaceholder) {
          thumbnail = resolveThumbnailPath(filePath, imagePlaceholder, listingPageDir);
        }
        // Defensive heading node creation
        if (typeof title !== 'string') {
          title = title ? String(title) : '';
        }
        // Defensive author
        if (typeof author !== 'string') {
          author = author ? String(author) : '';
        }
        // Defensive date
        if (typeof date !== 'string') {
          date = date ? String(date) : '';
        }
        // Defensive thumbnail
        if (typeof thumbnail !== 'string') {
          thumbnail = thumbnail ? String(thumbnail) : '';
        }
        // Defensive bodyNodes
        if (!Array.isArray(bodyNodes)) {
          bodyNodes = [];
        }
        return { filename, title, author, date, description, bodyNodes, thumbnail };
      })
      .filter(Boolean);

    // Parse sort options (now a list)
    fileData.sort((a, b) => {
      for (const fieldRaw of sortFields) {
        let [field, order] = fieldRaw.split(/\s+/);
        order = order ? order.toLowerCase() : 'asc';
        let aValue = a[field] || '';
        let bValue = b[field] || '';
        // For date fields, compare as dates if possible
        if (field === 'date') {
          aValue = aValue ? new Date(aValue) : new Date(0);
          bValue = bValue ? new Date(bValue) : new Date(0);
        } else {
          aValue = typeof aValue === 'string' ? aValue.toLowerCase() : '';
          bValue = typeof aValue === 'string' ? bValue.toLowerCase() : '';
        }
        if (aValue < bValue) return order === 'desc' ? 1 : -1;
        if (aValue > bValue) return order === 'desc' ? -1 : 1;
        // If equal, continue to next sort field
      }
      return 0;
    });

    // Limit items based on maxItems
    const limitedFileData = fileData.slice(0, maxItems);

    // Select the appropriate assembly function
    const assemblyFunction = assemblyFunctions[type] || assembleSummaryAST;

    // Select the appropriate assembly function and call with correct arguments
    let result;
    if (type === 'rss') {
      result = assemblyFunction(limitedFileData, options.baseUrl);
    } else if (type === 'grid') {
      result = assemblyFunction(limitedFileData, gridCols, imageWidth, imageHeight, gridIncludeBody, gridCardHeaderTemplate);
    } else if (type === 'summary') {
      result = assemblyFunction(limitedFileData, imageWidth, imageHeight);
    } else {
      result = assemblyFunction(limitedFileData);
    }

    return result;
  }
};

export const plugin = {
  name: 'listing',
  directives: [listingDirective]
};
export default plugin;
