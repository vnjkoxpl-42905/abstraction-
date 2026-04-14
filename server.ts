import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import db from "./src/lib/db.ts";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "abstraction-secret-key";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Auth
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // In a real app, we'd check the password hash. For this demo, we'll allow it.
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });

  // Middleware to protect routes
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // Modules & Content
  app.get("/api/bootcamps", authenticate, (req, res) => {
    const bootcamps = db.prepare('SELECT * FROM bootcamps').all();
    res.json(bootcamps);
  });

  app.get("/api/bootcamps/:id/modules", authenticate, (req: any, res) => {
    const modules = db.prepare(`
      SELECT m.*, p.status, p.progress_percent, p.unlocked, p.last_position
      FROM modules m
      LEFT JOIN student_progress p ON m.id = p.module_id AND p.user_id = ?
      WHERE m.bootcamp_id = ?
      ORDER BY m.order_index ASC
    `).all(req.user.id, req.params.id);
    res.json(modules);
  });

  app.get("/api/modules/:id", authenticate, (req: any, res) => {
    const module = db.prepare(`
      SELECT m.*, p.last_position, p.status
      FROM modules m
      LEFT JOIN student_progress p ON m.id = p.module_id AND p.user_id = ?
      WHERE m.id = ?
    `).get(req.user.id, req.params.id) as any;
    const sections = db.prepare('SELECT * FROM lesson_sections WHERE module_id = ? ORDER BY order_index ASC').all(req.params.id);
    const quizzes = db.prepare('SELECT * FROM pop_quizzes WHERE module_id = ? ORDER BY order_index ASC').all(req.params.id);
    const lsatQuestions = db.prepare('SELECT * FROM lsat_questions WHERE module_id = ?').all(req.params.id);
    
    res.json({ ...(module || {}), sections, quizzes, lsatQuestions });
  });

  // Progress Tracking
  app.post("/api/progress/update", authenticate, (req: any, res) => {
    const { module_id, status, progress_percent, last_position } = req.body;
    const user_id = req.user.id;

    const existing = db.prepare('SELECT id FROM student_progress WHERE user_id = ? AND module_id = ?').get(user_id, module_id);
    
    if (existing) {
      db.prepare(`
        UPDATE student_progress 
        SET status = ?, progress_percent = ?, last_position = ?, 
            completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE user_id = ? AND module_id = ?
      `).run(status, progress_percent, last_position, status, user_id, module_id);
    } else {
      db.prepare(`
        INSERT INTO student_progress (id, user_id, module_id, status, progress_percent, last_position, unlocked, started_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `).run(`${user_id}_${module_id}`, user_id, module_id, status, progress_percent, last_position);
    }

    // Unlock next module if completed
    if (status === 'completed') {
      const currentModule = db.prepare('SELECT order_index, bootcamp_id FROM modules WHERE id = ?').get(module_id) as any;
      const nextModule = db.prepare('SELECT id FROM modules WHERE bootcamp_id = ? AND order_index = ?').get(currentModule.bootcamp_id, currentModule.order_index + 1) as any;
      
      if (nextModule) {
        db.prepare('UPDATE student_progress SET unlocked = 1 WHERE user_id = ? AND module_id = ?').run(user_id, nextModule.id);
      }
    }

    res.json({ success: true });
  });

  // AI Coach (Moved to frontend per guidelines)
  app.post("/api/coach/chat", authenticate, async (req, res) => {
    res.status(400).json({ error: "AI Coach has been moved to the frontend." });
  });

  // --- Vite Middleware ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
