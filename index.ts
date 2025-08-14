import express, { Express } from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { Product } from "./interface";

dotenv.config();

const app: Express = express();

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));

app.set("port", process.env.PORT ?? 3000);

function getAllProducts(dirPath: string): Product[] {
  let producten: Product[] = [];
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      producten = producten.concat(getAllProducts(fullPath));
    } else if (fullPath.endsWith(".json")) {
      try {
        const raw = fs.readFileSync(fullPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          producten = producten.concat(parsed as Product[]);
        } else if (typeof parsed === "object" && parsed !== null) {
          producten.push(parsed as Product);
        }
      } catch (err) {
        console.error(`Fout bij het laden van ${fullPath}:`, err);
      }
    }
  }
  return producten;
}

function extractSubfilters(producten: Product[]): Record<string, Set<string>> {
  const result: Record<string, Set<string>> = {};
  for (const product of producten) {
    const brand = product.brand?.trim().toLowerCase();
    const model = product.model?.trim();
    if (!brand || !model) continue;
    if (!result[brand]) {
      result[brand] = new Set();
    }
    result[brand].add(model);
  }
  return result;
}
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-") // spaties → koppeltekens
    .replace(/[^a-z0-9\-]/g, "") // speciale tekens weg
    .trim();
}

app.get("/", (req, res) => {
  const dataDir = path.join(__dirname, "data");
  const alleProducten = getAllProducts(dataDir);

  const shuffleArray = <T>(arr: T[]): T[] =>
    arr.sort(() => Math.random() - 0.5);

  const featuredProducten = shuffleArray(
    alleProducten.filter((p) => p.featured && !p.hidden)
  );

  const populaireProducten = alleProducten.filter(
    (p) => p.popular && !p.hidden
  );

  res.render("index", {
    producten: featuredProducten,
    populaire: populaireProducten,
  });
});

app.get("/search", (req, res) => {
  const dataDir = path.join(__dirname, "data");
  const alleProducten = getAllProducts(dataDir);
  const query = req.query.q?.toString().toLowerCase().trim() || "";

  let gevonden = alleProducten.filter((p) => {
    const name = p.name?.toLowerCase() || "";
    const brand = p.brand?.toLowerCase() || "";
    const model = p.model?.toLowerCase() || "";
    return (
      !p.hidden &&
      (name.includes(query) || brand.includes(query) || model.includes(query))
    );
  });

  const totalFiltered = gevonden.length;
  const page = parseInt(req.query.page as string) || 1;
  const limit = 12;
  const offset = (page - 1) * limit;
  const paginated = gevonden.slice(offset, offset + limit);
  const totalPages = Math.ceil(totalFiltered / limit);

  res.render("shop", {
    producten: paginated,
    filters: extractSubfilters(alleProducten),
    totalFiltered,
    totalPages,
    currentPage: page,
    gender: null,
    genderLabel: `Zoekresultaten voor "${query}"`,
    selectedBrand: null,
    selectedModel: null,
  });
});

app.get("/api/search-suggest", (req, res) => {
  const query = req.query.q?.toString().toLowerCase().trim() || "";
  const alleProducten = getAllProducts(path.join(__dirname, "data"));

  const resultaten = alleProducten
    .filter((p) => {
      const name = p.name?.toLowerCase() || "";
      const brand = p.brand?.toLowerCase() || "";
      const model = p.model?.toLowerCase() || "";
      return (
        !p.hidden &&
        (name.includes(query) || brand.includes(query) || model.includes(query))
      );
    })
    .slice(0, 6); // max 6 suggesties

  res.json(resultaten);
});

app.get("/api/sneakers", (req, res) => {
  const dataDir = path.join(__dirname, "data");
  const alleProducten: Product[] = getAllProducts(dataDir);

  let sneakers = alleProducten.filter((p) => !p.hidden);

  const brandsQuery = req.query.brands?.toString().toLowerCase();
  const modelQuery = req.query.model?.toString().toLowerCase();
  const genderQuery = req.query.gender?.toString().toLowerCase();

  const genderMap: Record<string, string> = {
    vrouw: "dames",
    dames: "dames",
    heren: "heren",
    man: "heren",
    men: "heren",
  };

  const gender = genderQuery && genderMap[genderQuery];

  if (gender) {
    sneakers = sneakers.filter((p) =>
      typeof p.gender === "string"
        ? p.gender.toLowerCase().includes(gender)
        : Array.isArray(p.gender)
        ? p.gender.map((g) => g.toLowerCase()).includes(gender)
        : false
    );
  }

  if (brandsQuery) {
    const brands = brandsQuery.split(",").map((b) => b.trim());
    sneakers = sneakers.filter(
      (p) =>
        typeof p.brand === "string" &&
        brands.some((b) => p.brand!.toLowerCase().includes(b))
    );
  }

  if (modelQuery) {
    sneakers = sneakers.filter(
      (p) =>
        typeof p.model === "string" &&
        p.model.toLowerCase().includes(modelQuery)
    );
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = 12;
  const offset = (page - 1) * limit;

  const paginated = sneakers.slice(offset, offset + limit);
  res.json({
    producten: paginated,
    totalFiltered: sneakers.length,
    totalPages: Math.ceil(sneakers.length / limit),
  });
});

app.get("/shop", (req, res) => {
  const dataDir = path.join(__dirname, "data");
  const alleProducten: Product[] = getAllProducts(dataDir);

  let filtered = alleProducten.filter((p) => !p.hidden);
  const brand = req.query.brand?.toString().toLowerCase();
  const model = req.query.model?.toString().toLowerCase();

  const genderMap: Record<string, string> = {
    vrouw: "dames",
    dames: "dames",
    heren: "heren",
    man: "heren",
    men: "heren",
  };

  const genderParam = req.query.gender?.toString().toLowerCase();
  const gender = genderParam && genderMap[genderParam];

  if (gender) {
    filtered = filtered.filter((p) =>
      typeof p.gender === "string"
        ? p.gender.toLowerCase().includes(gender)
        : Array.isArray(p.gender)
        ? p.gender.map((g) => g.toLowerCase()).includes(gender)
        : false
    );
  }

  if (brand) {
    filtered = filtered.filter(
      (p) =>
        typeof p.brand === "string" && p.brand.toLowerCase().includes(brand)
    );
  }

  if (model) {
    filtered = filtered.filter(
      (p) =>
        typeof p.model === "string" && p.model.toLowerCase().includes(model)
    );
  }

  const totalFiltered = filtered.length;
  const page = parseInt(req.query.page as string) || 1;
  const limit = 12;
  const offset = (page - 1) * limit;
  const paginated = filtered.slice(offset, offset + limit);
  const totalPages = Math.ceil(totalFiltered / limit);

  const filters = extractSubfilters(alleProducten); // 🔁 let op, ALLE producten
  const selectedBrand = brand || null;
  const selectedModel = model || null;

  // ✅ Titel dynamisch op basis van filters
  let genderLabel = "sneakers";
  if (selectedModel) {
    genderLabel = `${selectedModel}`;
  } else if (selectedBrand) {
    genderLabel = `alle ${selectedBrand} schoenen`;
  } else if (gender === "heren") {
    genderLabel = "mannen schoenen";
  } else if (gender === "dames") {
    genderLabel = "vrouwen schoenen";
  }

  res.render("shop", {
    producten: paginated,
    filters,
    totalFiltered,
    totalPages,
    currentPage: page,
    gender: gender || null,
    genderLabel,
    selectedBrand,
    selectedModel,
  });
});

app.get("/product/:id", (req, res) => {
  const dataDir = path.join(__dirname, "data");
  const alleProducten = getAllProducts(dataDir);
  const id = req.params.id;

  const product = alleProducten.find((p) => p.id === id);
  if (!product) {
    return res.status(404).send("Product niet gevonden");
  }

  const variants = alleProducten.filter(
    (p) => p.model === product.model && p.id !== product.id
  );

  // 🔍 Related: zelfde merk, ander model en niet het huidige product
  let related = alleProducten.filter(
    (p) =>
      p.brand === product.brand &&
      p.model !== product.model &&
      p.id !== product.id
  );

  // 🔀 Shuffle array (Fisher-Yates)
  related = related.sort(() => Math.random() - 0.5);

  // ✂️ Beperk tot max. 8 producten
  related = related.slice(0, 8);

  res.render("product-detail", {
    product,
    variants,
    related, // 👈 Stuur mee naar je EJS
  });
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/contact", (req, res) => {
  res.render("contact");
});

// app.listen(app.get("port"), () => {
//   console.log("Server started on http://localhost:" + app.get("port"));
// });
export default app;
