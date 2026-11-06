import registry from "./toolRegistry.json" with { type: "json" };
export interface ToolItem {
  id: string;
  title: string;
  description: string;
  category: string;
  keywords: string;
  defaultOperation: string;
  storage: string;
  status?: string;
}
export const toolsList: ToolItem[] = registry;
export const toolIds = toolsList.map((t) => t.id);
export const toolCategories = [...new Set(toolsList.map((t) => t.category))];
