import { defineConfig, InputTransformerFn } from "orval";
import path from "path";
import fs from "fs";
import yaml from "js-yaml";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, "..", "..");
const openapiSpecPath = path.resolve(__dirname, "openapi.yaml");
const apiClientReactSrc = path.resolve(root, "lib", "api-client-react", "src");
const apiZodSrc = path.resolve(root, "lib", "api-zod", "src");

// Load and parse the YAML spec directly into memory
const fileContent = fs.readFileSync(openapiSpecPath, "utf8");
const parsedSpec = yaml.load(fileContent) as any;

const titleTransformer: InputTransformerFn = (config) => {
  config.info ??= {};
  config.info.title = "Api";
  return config;
};

export default defineConfig({
  "api-client-react": {
    input: {
      target: parsedSpec,
      override: {
        transformer: titleTransformer,
      },
    },
    output: {
      workspace: apiClientReactSrc,
      target: "generated",
      client: "react-query",
      mode: "split",
      baseUrl: "/api",
      clean: true,
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: path.resolve(apiClientReactSrc, "custom-fetch.ts"),
          name: "customFetch",
        },
      },
    },
  },
  zod: {
    input: {
      target: parsedSpec,
      override: {
        transformer: titleTransformer,
      },
    },
    output: {
      workspace: apiZodSrc,
      client: "zod",
      target: "generated",
      mode: "split",
      clean: true,
      override: {
        zod: {
          coerce: {
            query: ["boolean", "number", "string"],
            param: ["boolean", "number", "string"],
            body: ["bigint", "date"],
            response: ["bigint", "date"],
          },
        },
        useDates: true,
        useBigInt: true,
      },
    },
    hooks: {
      afterAllFilesWrite: (files) => {
        const fileList = Array.isArray(files) ? files : [files];
        for (const file of fileList) {
          if (typeof file === "string" && file.endsWith(".ts")) {
            if (fs.existsSync(file)) {
              let content = fs.readFileSync(file, "utf8");
              if (content.includes("zod.int()")) {
                content = content.replace(/zod\.int\(\)/g, "zod.number().int()");
                fs.writeFileSync(file, content, "utf8");
              }
            }
          }
        }
      },
    },
  },
});