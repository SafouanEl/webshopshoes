"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const serverless_http_1 = __importDefault(require("serverless-http"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.set("view engine", "ejs");
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.static(path_1.default.join(__dirname, "public")));
app.set("views", path_1.default.join(__dirname, "views"));
app.set("port", (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3000);
function getAllProducts(dirPath) {
    let producten = [];
    const items = fs_1.default.readdirSync(dirPath);
    for (const item of items) {
        const fullPath = path_1.default.join(dirPath, item);
        const stat = fs_1.default.statSync(fullPath);
        if (stat.isDirectory()) {
            producten = producten.concat(getAllProducts(fullPath));
        }
        else if (fullPath.endsWith(".json")) {
            try {
                const raw = fs_1.default.readFileSync(fullPath, "utf-8");
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    producten = producten.concat(parsed);
                }
                else if (typeof parsed === "object" && parsed !== null) {
                    producten.push(parsed);
                }
            }
            catch (err) {
                console.error(`Fout bij het laden van ${fullPath}:`, err);
            }
        }
    }
    return producten;
}
function extractSubfilters(producten) {
    var _a, _b;
    const result = {};
    for (const product of producten) {
        const brand = (_a = product.brand) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
        const model = (_b = product.model) === null || _b === void 0 ? void 0 : _b.trim();
        if (!brand || !model)
            continue;
        if (!result[brand]) {
            result[brand] = new Set();
        }
        result[brand].add(model);
    }
    return result;
}
function createSlug(name) {
    return name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "")
        .trim();
}
// ================= ROUTES ==================
app.get("/", (req, res) => {
    const dataDir = path_1.default.join(__dirname, "data");
    const alleProducten = getAllProducts(dataDir);
    const shuffleArray = (arr) => arr.sort(() => Math.random() - 0.5);
    const featuredProducten = shuffleArray(alleProducten.filter((p) => p.featured && !p.hidden));
    const populaireProducten = alleProducten.filter((p) => p.popular && !p.hidden);
    res.render("index", {
        producten: featuredProducten,
        populaire: populaireProducten,
    });
});
app.get("/search", (req, res) => {
    var _a;
    const dataDir = path_1.default.join(__dirname, "data");
    const alleProducten = getAllProducts(dataDir);
    const query = ((_a = req.query.q) === null || _a === void 0 ? void 0 : _a.toString().toLowerCase().trim()) || "";
    let gevonden = alleProducten.filter((p) => {
        var _a, _b, _c;
        const name = ((_a = p.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
        const brand = ((_b = p.brand) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || "";
        const model = ((_c = p.model) === null || _c === void 0 ? void 0 : _c.toLowerCase()) || "";
        return (!p.hidden &&
            (name.includes(query) || brand.includes(query) || model.includes(query)));
    });
    const totalFiltered = gevonden.length;
    const page = parseInt(req.query.page) || 1;
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
    var _a;
    const query = ((_a = req.query.q) === null || _a === void 0 ? void 0 : _a.toString().toLowerCase().trim()) || "";
    const alleProducten = getAllProducts(path_1.default.join(__dirname, "data"));
    const resultaten = alleProducten
        .filter((p) => {
        var _a, _b, _c;
        const name = ((_a = p.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
        const brand = ((_b = p.brand) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || "";
        const model = ((_c = p.model) === null || _c === void 0 ? void 0 : _c.toLowerCase()) || "";
        return (!p.hidden &&
            (name.includes(query) || brand.includes(query) || model.includes(query)));
    })
        .slice(0, 6);
    res.json(resultaten);
});
app.get("/api/sneakers", (req, res) => {
    var _a, _b, _c, _d;
    const dataDir = path_1.default.join(__dirname, "data");
    const alleProducten = getAllProducts(dataDir);
    let sneakers = alleProducten.filter((p) => !p.hidden);
    const brandQuery = ((_a = req.query.brand) === null || _a === void 0 ? void 0 : _a.toString().toLowerCase()) ||
        ((_b = req.query.brands) === null || _b === void 0 ? void 0 : _b.toString().toLowerCase());
    const modelQuery = (_c = req.query.model) === null || _c === void 0 ? void 0 : _c.toString().toLowerCase();
    const genderQuery = (_d = req.query.gender) === null || _d === void 0 ? void 0 : _d.toString().toLowerCase();
    const genderMap = {
        vrouw: "dames",
        dames: "dames",
        heren: "heren",
        man: "heren",
        men: "heren",
    };
    const gender = genderQuery && genderMap[genderQuery];
    if (gender) {
        sneakers = sneakers.filter((p) => typeof p.gender === "string"
            ? p.gender.toLowerCase().includes(gender)
            : Array.isArray(p.gender)
                ? p.gender.map((g) => g.toLowerCase()).includes(gender)
                : false);
    }
    if (brandQuery) {
        const brands = brandQuery.split(",").map((b) => b.trim());
        sneakers = sneakers.filter((p) => typeof p.brand === "string" &&
            brands.some((b) => p.brand.toLowerCase().includes(b)));
    }
    if (modelQuery) {
        sneakers = sneakers.filter((p) => typeof p.model === "string" &&
            p.model.toLowerCase().includes(modelQuery));
    }
    const page = parseInt(req.query.page) || 1;
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
    var _a, _b, _c;
    const dataDir = path_1.default.join(__dirname, "data");
    const alleProducten = getAllProducts(dataDir);
    let filtered = alleProducten.filter((p) => !p.hidden);
    const brand = (_a = req.query.brand) === null || _a === void 0 ? void 0 : _a.toString().toLowerCase();
    const model = (_b = req.query.model) === null || _b === void 0 ? void 0 : _b.toString().toLowerCase();
    const genderMap = {
        vrouw: "dames",
        dames: "dames",
        heren: "heren",
        man: "heren",
        men: "heren",
    };
    const genderParam = (_c = req.query.gender) === null || _c === void 0 ? void 0 : _c.toString().toLowerCase();
    const gender = genderParam && genderMap[genderParam];
    if (gender) {
        filtered = filtered.filter((p) => typeof p.gender === "string"
            ? p.gender.toLowerCase().includes(gender)
            : Array.isArray(p.gender)
                ? p.gender.map((g) => g.toLowerCase()).includes(gender)
                : false);
    }
    if (brand) {
        filtered = filtered.filter((p) => typeof p.brand === "string" && p.brand.toLowerCase().includes(brand));
    }
    if (model) {
        filtered = filtered.filter((p) => typeof p.model === "string" && p.model.toLowerCase().includes(model));
    }
    const totalFiltered = filtered.length;
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);
    const totalPages = Math.ceil(totalFiltered / limit);
    const filters = extractSubfilters(alleProducten);
    const selectedBrand = brand || null;
    const selectedModel = model || null;
    let genderLabel = "sneakers";
    if (selectedModel) {
        genderLabel = `${selectedModel}`;
    }
    else if (selectedBrand) {
        genderLabel = `alle ${selectedBrand} schoenen`;
    }
    else if (gender === "heren") {
        genderLabel = "mannen schoenen";
    }
    else if (gender === "dames") {
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
    const dataDir = path_1.default.join(__dirname, "data");
    const alleProducten = getAllProducts(dataDir);
    const id = req.params.id;
    const product = alleProducten.find((p) => p.id === id);
    if (!product) {
        return res.status(404).send("Product niet gevonden");
    }
    const variants = alleProducten.filter((p) => p.model === product.model && p.id !== product.id);
    let related = alleProducten.filter((p) => p.brand === product.brand &&
        p.model !== product.model &&
        p.id !== product.id);
    related = related.sort(() => Math.random() - 0.5);
    related = related.slice(0, 8);
    res.render("product-detail", {
        product,
        variants,
        related,
    });
});
app.get("/about", (req, res) => {
    res.render("about");
});
app.get("/contact", (req, res) => {
    res.render("contact");
});
// ============== LOCAL vs VERCEL ==============
const PORT = process.env.PORT || 3000;
// ✅ Alleen lokaal starten met .listen
if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
// ✅ Export voor Vercel serverless
exports.handler = (0, serverless_http_1.default)(app);
