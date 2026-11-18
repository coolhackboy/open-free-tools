/** YAML <-> JSON. Imported with await import() from devTools so the parser loads on first use. */
import YAML from "yaml";

export function yamlToJson(text: string, indent = 2) {
  const docs = YAML.parseAllDocuments(text);
  const list = Array.isArray(docs) ? docs : [docs];
  const errors = list.flatMap((doc) => doc.errors);
  if (errors.length) throw new Error(errors[0].message);
  const values = list.map((doc) => doc.toJS({ maxAliasCount: 100 }));
  return JSON.stringify(values.length === 1 ? values[0] : values, null, indent);
}

export function jsonToYaml(text: string, indent = 2) {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "This is not valid JSON.");
  }
  return YAML.stringify(value, { indent, lineWidth: 0 });
}
