Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === "/") {
      const file = Bun.file("./receipt.html");
      return new Response(file, {
        headers: { "Content-Type": "text/html" },
      });
    }
    
    if (url.pathname === "/app.ts") {
      const result = await Bun.build({
        entrypoints: ["./app.ts"],
        target: "browser",
        format: "esm",
      });
      
      if (result.success) {
        const output = result.outputs[0];
        return new Response(await output.text(), {
          headers: { "Content-Type": "application/javascript" },
        });
      } else {
        return new Response("Build failed", { status: 500 });
      }
    }
    
    if (url.pathname === "/styles.css") {
      const file = Bun.file("./styles.css");
      return new Response(file, {
        headers: { "Content-Type": "text/css" },
      });
    }
    
    return new Response("Not found", { status: 404 });
  },
  development: {
    hmr: true,
  }
});

console.log("Receipt printer app running on http://localhost:3000");