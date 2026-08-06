const CATEGORY_PATTERNS = {
  tests: [
    /(^|\/)(__tests__|tests?|specs?)(\/|$)/i,
    /\.(test|spec)\.[cm]?[jt]sx?$/i
  ],
  docs: [
    /(^|\/)(docs?|documentation)(\/|$)/i,
    /(^|\/)(readme|changelog|contributing|code_of_conduct|security)(\.|$)/i,
    /\.(md|mdx|rst)$/i
  ],
  workflows: [
    /^\.github\/workflows\//i,
    /(^|\/)(dockerfile|compose\.ya?ml)$/i
  ],
  dependencies: [
    /(^|\/)(package(-lock)?|pnpm-lock|yarn\.lock|bun\.lockb|requirements|poetry\.lock|cargo\.lock|go\.sum)(\.|$)/i
  ],
  migrations: [
    /(^|\/)(migrations?|schema)(\/|$)/i,
    /\.(sql)$/i
  ],
  security: [
    /(^|\/)(auth|authentication|authorization|security|permissions?|crypto|sessions?|tokens?|secrets?)(\/|\.|$)/i
  ],
  config: [
    /(^|\/)(config|settings?)(\/|\.|$)/i,
    /\.(ya?ml|toml|ini|env|properties)$/i
  ],
  generated: [
    /(^|\/)(dist|build|coverage|vendor|generated)(\/|$)/i,
    /\.min\.(js|css)$/i
  ]
};

const SOURCE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.rb', '.go', '.rs',
  '.java', '.kt', '.swift', '.php', '.cs', '.c', '.cc', '.cpp', '.h', '.hpp',
  '.vue', '.svelte'
]);

function extensionOf(filename) {
  const lastSlash = filename.lastIndexOf('/');
  const lastDot = filename.lastIndexOf('.');
  return lastDot > lastSlash ? filename.slice(lastDot).toLowerCase() : '';
}

export function classifyFile(filename) {
  const categories = [];

  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(filename))) {
      categories.push(category);
    }
  }

  if (SOURCE_EXTENSIONS.has(extensionOf(filename)) && !categories.includes('tests')) {
    categories.push('source');
  }

  if (categories.length === 0) {
    categories.push('other');
  }

  return [...new Set(categories)];
}

export function groupFiles(files) {
  const groups = {};

  for (const file of files) {
    for (const category of classifyFile(file.filename)) {
      groups[category] ??= [];
      groups[category].push(file.filename);
    }
  }

  return groups;
}
