const http = require("node:http");
const crypto = require("node:crypto");

const labName = process.env.LAB_NAME || "TrainHack Lab";
const labSlug = process.env.LAB_SLUG || "training";
const flag = process.env.LAB_FLAG || `TH{${labSlug.replace(/-/g, "_")}_owned}`;
const token = crypto.createHash("sha256").update(`${labSlug}:${flag}`).digest("hex").slice(0, 12);

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  if (url.pathname === "/status") {
    res.end(`service=online\nlab=${labSlug}\nmode=container\nnotes=/robots.txt\n`);
    return;
  }

  if (url.pathname === "/robots.txt") {
    res.end("User-agent: *\nDisallow: /debug\nAllow: /status\n");
    return;
  }

  if (url.pathname === "/debug/config") {
    res.end(
      [
        `lab=${labSlug}`,
        "debug=true",
        `proof_path=/proof?token=${token}`,
        "operator_note=debug endpoints should never be internet reachable",
      ].join("\n"),
    );
    return;
  }

  if (url.pathname === "/proof") {
    if (url.searchParams.get("token") !== token) {
      res.statusCode = 403;
      res.end("missing or invalid proof token\n");
      return;
    }
    res.end(`${flag}\n`);
    return;
  }

  res.end(
    [
      `${labName}`,
      "",
      "This is a real Docker-backed TrainHack target.",
      "Enumerate exposed paths and submit the proof flag.",
      "Try /status and keep following the trail.",
    ].join("\n"),
  );
});

server.listen(80, "0.0.0.0");
