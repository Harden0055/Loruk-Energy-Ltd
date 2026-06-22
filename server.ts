import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON and URL-encoded bodies
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Initialize Gemini API
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route: Extract receipt info using Gemini
  app.post("/api/gemini/extract", async (req, res) => {
    try {
      const { text, inlineData } = req.body;

      let parts: any[] = [];
      
      const prompt = `
      You are an assistant for a fuel management system. 
      Extract the relevant information from the provided receipt text or image.
      The output should indicate the type of record: "fleet_expense", "delivery", "payment", or "station_report".
      Also extract any available field values corresponding to:
      
      For fleet_expense:
      - carRegistration (string, the registration number of the vehicle, should be something like "KCF 119R", "KDW 028Y")
      - station ("Loruk - Ndalu", "Loruk - Junction", "Gel - Bungoma" or "Gel - Kapenguria")
      - amount (number)
      - distance (number in km)
      - date (YYYY-MM-DD string)

      For payment or delivery:
      - customerId (string, infer or extract)
      - amount / totalAmount (number)
      - date (YYYY-MM-DD string)
      - productType ("Diesel" or "Super" for deliveries)
      - litres (number for deliveries)

      For station_report:
      - station ("Loruk - Ndalu", "Loruk - Junction", "Gel - Bungoma" or "Gel - Kapenguria", attempt to infer if present, e.g. from context)
      - date (YYYY-MM-DD string)
      - attendantName (string)
      - pumpReadings (array of objects: fuelType: 'Diesel'|'Super', salesStart, salesStop, salesAmount, litresStart, litresStop, litresVolume)
      - otherSalesDetails (string - a short summary of gas/burner sales)
      - otherSalesAmount (number - total of gases/burners/etc)
      - totalSales (number)
      - mpesaAmount (number)
      - expenses (array of objects: description, amount)
      - totalExpenses (number)
      - cashAtHand (number)
      - depositedAmount (number)
      - fuelBalanceDiesel (number)
      - fuelBalanceSuper (number)

      If you cannot determine a field with certainty, leave it null or missing.
      Return the output as a JSON object matching the defined schema.
      `;

      parts.push({ text: prompt });

      if (text) {
        parts.push({ text });
      }

      if (inlineData) {
         parts.push({ inlineData });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recordType: {
                type: Type.STRING,
                description: "The type of record detected: 'fleet_expense', 'delivery', 'payment', or 'station_report'",
              },
              extractedFields: {
                type: Type.OBJECT,
                properties: {
                  carRegistration: { type: Type.STRING },
                  station: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  distance: { type: Type.NUMBER },
                  date: { type: Type.STRING },
                  customerId: { type: Type.STRING },
                  productType: { type: Type.STRING },
                  litres: { type: Type.NUMBER },
                  attendantName: { type: Type.STRING },
                  otherSalesDetails: { type: Type.STRING },
                  otherSalesAmount: { type: Type.NUMBER },
                  totalSales: { type: Type.NUMBER },
                  mpesaAmount: { type: Type.NUMBER },
                  totalExpenses: { type: Type.NUMBER },
                  cashAtHand: { type: Type.NUMBER },
                  depositedAmount: { type: Type.NUMBER },
                  fuelBalanceDiesel: { type: Type.NUMBER },
                  fuelBalanceSuper: { type: Type.NUMBER },
                  pumpReadings: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            fuelType: { type: Type.STRING },
                            salesStart: { type: Type.NUMBER },
                            salesStop: { type: Type.NUMBER },
                            salesAmount: { type: Type.NUMBER },
                            litresStart: { type: Type.NUMBER },
                            litresStop: { type: Type.NUMBER },
                            litresVolume: { type: Type.NUMBER }
                        }
                    }
                  },
                  expenses: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            description: { type: Type.STRING },
                            amount: { type: Type.NUMBER }
                        }
                    }
                  }
                }
              }
            },
            required: ["recordType", "extractedFields"]
          }
        }
      });

      const jsonStr = response.text?.trim() || "{}";
      const result = JSON.parse(jsonStr);

      res.json(result);
    } catch (error) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Failed to process text/image." });
    }
  });

  // API Route: Generic chat assistant
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, context } = req.body;
      
      const prompt = `
      You are an AI assistant for a fuel management system (Loruk Energy Ltd).
      Answer the user's question clearly and concisely.
      
      User's context data (if provided):
      ${context || "No specific context provided."}
      
      Question: ${message}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("Gemini API Chat Error:", error);
      res.status(500).json({ error: "Failed to communicate with AI Assistant." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
