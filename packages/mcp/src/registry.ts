import type { z } from "zod";
import type { ToolOutput } from "./output";

export interface RegisteredTool {
  description: string;
  inputSchema: z.ZodObject<z.ZodRawShape>;
  run: (input: unknown) => Promise<ToolOutput>;
}

export class ToolRegistry {
  readonly tools = new Map<string, RegisteredTool>();

  add<S extends z.ZodRawShape>(
    name: string,
    description: string,
    schema: z.ZodObject<S>,
    handler: (input: z.output<z.ZodObject<S>>) => Promise<ToolOutput>,
  ) {
    this.tools.set(name, {
      description,
      inputSchema: schema,
      run: (input) => handler(schema.parse(input)),
    });
  }

  names() {
    return [...this.tools.keys()];
  }

  async call(name: string, input: unknown) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not registered: ${name}`);
    return tool.run(input);
  }
}
