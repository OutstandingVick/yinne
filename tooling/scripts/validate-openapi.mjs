import fs from "node:fs";
import process from "node:process";
import { URL } from "node:url";
const path = new URL("../../openapi/yinne-v1.json", import.meta.url);
const document = JSON.parse(fs.readFileSync(path, "utf8"));
const fail = (message) => {
  throw new Error(`OpenAPI validation failed: ${message}`);
};
if (document.openapi !== "3.1.0") fail("openapi must be 3.1.0");
if (!document.info?.title || !document.info?.version) fail("info is incomplete");
if (!document.paths || !Object.keys(document.paths).length) fail("paths are missing");
const operations = [];
for (const [route, item] of Object.entries(document.paths)) {
  if (!route.startsWith("/v1/")) fail(`unversioned path ${route}`);
  for (const method of ["get", "post", "patch", "delete"])
    if (item[method]) {
      const operation = item[method];
      operations.push(operation.operationId);
      if (!operation.operationId || !operation.responses)
        fail(`${method.toUpperCase()} ${route} is incomplete`);
    }
}
if (new Set(operations).size !== operations.length) fail("operationId values must be unique");
for (const ref of JSON.stringify(document).matchAll(/"\$ref":"([^"]+)"/g)) {
  if (!ref[1].startsWith("#/")) continue;
  let value = document;
  for (const segment of ref[1].slice(2).split("/"))
    value = value?.[segment.replaceAll("~1", "/").replaceAll("~0", "~")];
  if (value === undefined) fail(`unresolved reference ${ref[1]}`);
}
process.stdout.write(`OpenAPI 3.1 contract valid: ${operations.length} operations.\n`);
