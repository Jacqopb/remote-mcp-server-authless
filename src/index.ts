import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createCanvas } from "canvas";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Authless Calculator",
		version: "1.0.0",
	});

	async init() {
		// Simple addition tool
		this.server.tool(
			"add",
			"Adds two numbers together and returns the result.",
			{
				a: z.number().describe("The first number to add."),
				b: z.number().describe("The second number to add."),
			},
			async ({ a, b }) => ({
				content: [{ type: "text", text: String(a + b) }],
			})
		);

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			"Performs a calculation (add, subtract, multiply, divide) on two numbers.",
			{
				operation: z
					.enum(["add", "subtract", "multiply", "divide"])
					.describe("The operation to perform: add, subtract, multiply, or divide."),
				a: z.number().describe("The first number for the operation."),
				b: z.number().describe("The second number for the operation."),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			}
		);

		// Random base64 image tool
		this.server.tool(
			"randomBase64Image",
			"Returns a randomly generated 128x128 JPEG image as a base64-encoded string.",
			{},
			async () => {
				const size = 128;
				const canvas = createCanvas(size, size);
				const ctx = canvas.getContext("2d");
				const imageData = ctx.createImageData(size, size);
				for (let i = 0; i < imageData.data.length; i += 4) {
					imageData.data[i] = Math.floor(Math.random() * 256);     // R
					imageData.data[i + 1] = Math.floor(Math.random() * 256); // G
					imageData.data[i + 2] = Math.floor(Math.random() * 256); // B
					imageData.data[i + 3] = 255;                            // A
				}
				ctx.putImageData(imageData, 0, 0);
				const base64 = canvas.toDataURL("image/jpeg").split(",")[1];
				return {
					content: [
						{
							type: "image",
							data: base64,
							mimeType: "image/jpeg",
						},
					],
				};
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			// @ts-ignore
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			// @ts-ignore
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
