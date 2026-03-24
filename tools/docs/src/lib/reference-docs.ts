import { readdirSync, readFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

type ItemKind = 'executor' | 'generator';

type JsonSchema = {
  $id?: string;
  properties?: Record<string, JsonSchemaOption>;
  required?: string[];
};

type JsonSchemaOption = {
  type?: string | string[];
  oneOf?: JsonSchemaOption[];
  enum?: unknown[];
  alias?: string;
  aliases?: string[];
  description?: string;
  visible?: boolean;
  hidden?: boolean;
  default?: unknown;
  pattern?: string;
  ['x-deprecated']?: boolean | string;
  ['x-priority']?: 'important' | 'internal';
};

type GeneratorRegistryEntry = {
  hidden?: boolean;
  schema: string;
};

type ExecutorRegistryEntry =
  | string
  | {
      schema: string;
    };

type ReferenceOption = {
  aliases?: string[];
  defaultValue?: unknown;
  deprecated?: boolean | string;
  description?: string;
  enumValues?: unknown[];
  name: string;
  pattern?: string;
  required: boolean;
  schemaId?: string;
  typeLabel?: string;
};

type ReferenceItem = {
  kind: ItemKind;
  name: string;
  options: ReferenceOption[];
  schemaId?: string;
};

type OptionMarker = {
  filePath: string;
  kind: ItemKind;
  name: string;
  raw: string;
};

const EXECUTORS_REGISTRY_PATH = 'packages/nx-forge/executors.json';
const GENERATORS_REGISTRY_PATH = 'packages/nx-forge/generators.json';
const REFERENCE_DOCS_DIR = 'docs/reference';
const MARKER_PREFIX = 'nx-forge:options';
const OPTION_MARKER_REGEX =
  /<!--\s*nx-forge:options\s+(executor|generator)=([a-zA-Z0-9_-]+)\s*-->/g;
const OPTION_MARKER_COMMENT_REGEX = /<!--\s*nx-forge:options\b[\s\S]*?-->/g;
const OPTION_MARKER_EXACT_REGEX =
  /^<!--\s*nx-forge:options\s+(executor|generator)=([a-zA-Z0-9_-]+)\s*-->$/;

export function getReferenceMarkdownFilePaths(workspaceRoot: string): string[] {
  const referenceDocsDir = join(workspaceRoot, REFERENCE_DOCS_DIR);

  return readdirSync(referenceDocsDir)
    .filter((entry) => entry.endsWith('.md'))
    .sort()
    .map((entry) => join(referenceDocsDir, entry));
}

export function loadReferenceItems(workspaceRoot: string): ReferenceItem[] {
  return [
    ...loadRegistryItems(
      workspaceRoot,
      'executor',
      EXECUTORS_REGISTRY_PATH,
      'executors'
    ),
    ...loadRegistryItems(
      workspaceRoot,
      'generator',
      GENERATORS_REGISTRY_PATH,
      'generators'
    ),
  ];
}

export function validateReferenceDocs(workspaceRoot: string): void {
  const items = loadReferenceItems(workspaceRoot);
  const itemsByKey = createReferenceItemsMap(items);
  const markerKeys = new Set<string>();

  for (const filePath of getReferenceMarkdownFilePaths(workspaceRoot)) {
    const markdown = readFileSync(filePath, 'utf8');
    const markers = parseOptionMarkers(markdown, filePath);

    for (const marker of markers) {
      const itemKey = getItemKey(marker.kind, marker.name);

      if (!itemsByKey.has(itemKey)) {
        throw new Error(
          `Reference docs marker ${marker.raw} in ${toWorkspacePath(
            workspaceRoot,
            marker.filePath
          )} points to an unknown or filtered-out item.`
        );
      }

      markerKeys.add(itemKey);
    }
  }

  const missingMarkerItems = items.filter(
    (item) => !markerKeys.has(getItemKey(item.kind, item.name))
  );

  if (missingMarkerItems.length > 0) {
    throw new Error(
      `Missing reference docs markers for: ${missingMarkerItems
        .map((item) => `${item.kind}=${item.name}`)
        .join(', ')}`
    );
  }
}

export function injectReferenceOptions(
  markdown: string,
  filePath: string,
  workspaceRoot: string
): string {
  const itemsByKey = createReferenceItemsMap(loadReferenceItems(workspaceRoot));

  parseOptionMarkers(markdown, filePath);

  return markdown.replace(
    OPTION_MARKER_REGEX,
    (_fullMatch, kind: ItemKind, name: string) => {
      const item = itemsByKey.get(getItemKey(kind, name));

      if (!item) {
        throw new Error(
          `Reference docs marker ${kind}=${name} in ${toWorkspacePath(
            workspaceRoot,
            filePath
          )} points to an unknown or filtered-out item.`
        );
      }

      return renderOptionsMarkdown(item);
    }
  );
}

export function parseOptionMarkers(
  markdown: string,
  filePath = 'markdown'
): OptionMarker[] {
  const markers: OptionMarker[] = [];

  for (const match of markdown.matchAll(OPTION_MARKER_COMMENT_REGEX)) {
    const raw = match[0];
    const parsedMarker = raw.match(OPTION_MARKER_EXACT_REGEX);

    if (!parsedMarker) {
      throw new Error(
        `Malformed ${MARKER_PREFIX} marker in ${filePath}: ${raw}`
      );
    }

    markers.push({
      filePath,
      kind: parsedMarker[1] as ItemKind,
      name: parsedMarker[2],
      raw,
    });
  }

  return markers;
}

export function renderOptionsMarkdown(item: ReferenceItem): string {
  const header = [
    '| Option | Type | Description | Default |',
    '| --- | --- | --- | --- |',
  ];
  const rows = item.options.map((option) => renderOptionRow(option));

  return [...header, ...rows].join('\n');
}

function loadRegistryItems(
  workspaceRoot: string,
  kind: ItemKind,
  registryPath: string,
  collectionKey: 'executors' | 'generators'
): ReferenceItem[] {
  const absoluteRegistryPath = join(workspaceRoot, registryPath);
  const registry = JSON.parse(readFileSync(absoluteRegistryPath, 'utf8')) as {
    executors?: Record<string, ExecutorRegistryEntry>;
    generators?: Record<string, GeneratorRegistryEntry>;
  };
  const registryEntries = registry[collectionKey] ?? {};

  return Object.entries(registryEntries).flatMap(([name, rawEntry]) => {
    const entry = normalizeRegistryEntry(rawEntry);

    if (entry.hidden) {
      return [];
    }

    const absoluteSchemaPath = resolve(dirname(absoluteRegistryPath), entry.schema);
    const schema = JSON.parse(readFileSync(absoluteSchemaPath, 'utf8')) as JsonSchema;

    return [
      {
        kind,
        name,
        options: normalizeOptions(schema),
        schemaId: schema.$id,
      },
    ];
  });
}

function normalizeRegistryEntry(
  rawEntry: ExecutorRegistryEntry | GeneratorRegistryEntry
): GeneratorRegistryEntry {
  if (typeof rawEntry === 'string') {
    return { schema: rawEntry };
  }

  return rawEntry;
}

function normalizeOptions(schema: JsonSchema): ReferenceOption[] {
  const requiredOptions = new Set(schema.required ?? []);

  return Object.entries(schema.properties ?? {}).flatMap(([name, option]) => {
    if (
      option.hidden === true ||
      option.visible === false ||
      option['x-priority'] === 'internal'
    ) {
      return [];
    }

    return [
      {
        aliases: normalizeAliases(option),
        defaultValue: option.default,
        deprecated: option['x-deprecated'],
        description: option.description,
        enumValues: option.enum,
        name,
        pattern: option.pattern,
        required: requiredOptions.has(name),
        schemaId: schema.$id,
        typeLabel: renderTypeLabel(option),
      },
    ];
  });
}

function createReferenceItemsMap(items: ReferenceItem[]): Map<string, ReferenceItem> {
  return new Map(items.map((item) => [getItemKey(item.kind, item.name), item]));
}

function getItemKey(kind: ItemKind, name: string): string {
  return `${kind}:${name}`;
}

function renderOptionRow(option: ReferenceOption): string {
  return `| ${renderOptionCell(option)} | ${renderTypeCell(
    option
  )} | ${renderDescriptionCell(option)} | ${renderDefaultCell(
    option.defaultValue
  )} |`;
}

function renderOptionCell(option: ReferenceOption): string {
  const lines = [
    `<a id="${getOptionAnchorId(option)}"></a>\`--${option.name}\``,
    ...(option.aliases ? [renderAliasesInline(option.aliases)] : []),
  ];

  return escapeTableCell(lines.join('<br>'));
}

function renderTypeCell(option: ReferenceOption): string {
  const lines = [
    option.typeLabel ? `\`${option.typeLabel}\`` : '-',
    ...(option.required ? ['**[required]**'] : []),
  ];

  return escapeTableCell(lines.join(' '));
}

function renderDescriptionCell(option: ReferenceOption): string {
  const lines = [
    ...(option.description ? [formatDescription(option.description)] : []),
    ...(option.enumValues ? [renderEnumValues(option.enumValues)] : []),
    ...(option.pattern
      ? [`Pattern: \`${escapeInlineCode(option.pattern)}\``]
      : []),
    ...renderDeprecation(option.deprecated),
  ];

  return escapeTableCell(lines.join('<br>'));
}

function renderDefaultCell(defaultValue: unknown): string {
  return escapeTableCell(
    defaultValue !== undefined ? formatDefaultValue(defaultValue) : '-'
  );
}

function normalizeAliases(option: JsonSchemaOption): string[] | undefined {
  const aliases = [
    ...(option.alias ? [option.alias] : []),
    ...Array.from(option.aliases ?? []),
  ];
  const normalizedAliases = dedupe(aliases);

  return normalizedAliases.length > 0 ? normalizedAliases : undefined;
}

function getOptionAnchorId(option: ReferenceOption): string {
  const rawId = option.schemaId
    ? `${option.schemaId}-${option.name}`
    : `option-${option.name}`;

  const normalized = rawId.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return trimDashes(normalized);
}

function renderAliasesInline(aliases: string[]): string {
  return aliases
    .map((alias) => (alias.length === 1 ? `\`-${alias}\`` : `\`--${alias}\``))
    .join(', ');
}

function renderEnumValues(enumValues: unknown[]): string {
  return `Choices: ${enumValues
    .map((enumValue) => `\`${escapeInlineCode(JSON.stringify(enumValue))}\``)
    .join(', ')}`;
}

function renderDeprecation(deprecated: boolean | string | undefined): string[] {
  if (!deprecated) {
    return [];
  }

  if (typeof deprecated === 'string') {
    return [`Deprecated: ${formatDescription(deprecated)}`];
  }

  return ['Deprecated.'];
}

function renderTypeLabel(option: JsonSchemaOption): string | undefined {
  if (Array.isArray(option.oneOf) && option.oneOf.length > 0) {
    return dedupe(option.oneOf.map((entry) => renderTypeLabel(entry))).join(
      ' | '
    );
  }

  if (Array.isArray(option.type)) {
    return dedupe(option.type).join(' | ');
  }

  return option.type;
}

function formatDefaultValue(defaultValue: unknown): string {
  return `\`${escapeInlineCode(JSON.stringify(defaultValue))}\``;
}

function formatDescription(text: string): string {
  return text.replace(/(https?:\/\/[^\s)]+)/g, (url) => `<${url}>`);
}

function escapeInlineCode(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
}

function escapeTableCell(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');
}

function dedupe(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function trimDashes(value: string): string {
  let start = 0;
  let end = value.length;

  while (start < end && value[start] === '-') {
    start += 1;
  }

  while (end > start && value[end - 1] === '-') {
    end -= 1;
  }

  return value.slice(start, end);
}

function toWorkspacePath(workspaceRoot: string, filePath: string): string {
  return relative(workspaceRoot, filePath) || filePath;
}
