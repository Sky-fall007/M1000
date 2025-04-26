const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const { parse } = require("json2csv");
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

let db = JSON.parse(fs.readFileSync("links.json"));

// Usuário admin
const adminUser = {
  username: "admin",
  password: "bola.ratom1"
};

// ROTA: Página de login
app.get("/admin", (req, res) => {
  res.sendFile(__dirname + "/public/login.html");
});

// ROTA: Validação do login
app.post("/admin", (req, res) => {
  const { username, password } = req.body;
  if (username === adminUser.username && password === adminUser.password) {
    res.sendFile(__dirname + "/public/index.html");
  } else {
    res.send("Login inválido.");
  }
});

// ROTA: Geração de link
app.post("/generate", (req, res) => {
  const { originalUrl } = req.body;
  const shortCode = Math.random().toString(36).substring(2, 8);
  db[shortCode] = { originalUrl, clicks: [] };
  fs.writeFileSync("links.json", JSON.stringify(db, null, 2));
  res.json({ shortUrl: "https://skyfall-j7qj.onrender.com/" + shortCode });
});

// ROTA: Redirecionamento com consentimento
app.get("/:code", (req, res) => {
  const code = req.params.code;
  const link = db[code];

  if (!link) return res.status(404).send("Link não encontrado");
  res.sendFile(__dirname + "/public/consent.html");
});

// ROTA: Rastreamento
app.post("/track/:code", async (req, res) => {
  const code = req.params.code;
  const link = db[code];
  if (!link) return res.status(404).json({ error: "Link inválido" });

  const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
const ip = rawIp.split(",")[0].trim();
const userAgent = req.headers["user-agent"];

let location = {};
try {
  const response = await fetch(`https://api.ipgeolocation.io/ipgeo?apiKey=422fb77d32314d55a001a39e4be22745&ip=${ip}`);
  location = await response.json();
} catch {
  location = { city: "desconhecida", state_prov: "", country_code2: "" };
}

link.clicks.push({
  timestamp: new Date(),
  ip,
  userAgent,
  city: location.city || "desconhecida",
  region: location.state_prov || "",
  country: location.country_code2 || "",
  browser: userAgent
});

console.log(`✅ Clique registrado para: ${code}`);
console.log({
  ip,
  userAgent,
  city: location.city,
  region: location.state_prov,
  country: location.country_code2
});

  fs.writeFileSync("links.json", JSON.stringify(db, null, 2));
  res.json({ redirectTo: link.originalUrl });
});

// ROTA: Visualizar JSON
app.get("/dados", (req, res) => {
  res.json(db); // corrigido aqui
});

// ROTA: Exportar para CSV
app.get("/export", (req, res) => {
  const allClicks = [];

  for (const code in db) {
    if (db[code].clicks) {
      db[code].clicks.forEach(click => {
        allClicks.push({
          code,
          originalUrl: db[code].originalUrl,
          ip: click.ip,
          city: click.city,
          region: click.region,
          country: click.country,
          browser: click.browser,
          timestamp: click.timestamp
        });
      });
    }
  }

  const csv = parse(allClicks);
  const filePath = "rastreamentos.csv";
  fs.writeFileSync(filePath, csv);
  res.download(filePath);
});

app.listen(PORT, () => {
  console.log(`Sky Fall rodando na porta ${PORT}`);
  console.log(`Acesse via browser: https://skyfall-j7qj.onrender.com`);
});

