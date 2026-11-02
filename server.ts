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
        model: "gemini-3.8-flash",
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

  // API Route: Extract structured Daily Station Report from paper shift sheet photo or scan
  app.post("/api/gemini/extract-daily-report", async (req, res) => {
    try {
      const { text, inlineData } = req.body;
      if (!text && !inlineData) {
        return res.status(400).json({ error: "No text or image data provided" });
      }

      const prompt = `
You are an expert fuel station auditor for Loruk Energy Ltd.
Extract all data from this station daily paper report scan or image into the exact JSON format.
There are two stations: "ndalu" (Loruk Ndalu Filling Station) and "junction" (Loruk Junction Filling Station).

Report Structure:
1. Station: identify if this is "ndalu" or "junction" based on heading or letterhead. Default to "ndalu" if ambiguous.
2. Report Date: format as YYYY-MM-DD.
3. Attendant Name: person who prepared or signed the report.
4. White-oil nozzle readings (exactly two nozzles: Diesel/AGO and Super/PMS):
   - salesStart, salesStop (money meter readings)
   - litresStart, litresStop (volume meter readings)
   - ratePerLitre (price per litre)
   - manualSubtract (any manual cash/deduction subtracted, 0 if none)
5. Other sales (LPG cylinders, burners, grills):
   - item name (e.g. 13kg refill, 6kg refill, burner, grill), quantity, unitPrice, reportedAmount
6. Purchases (LPG, burners, and grills purchases ONLY - do not mix fuel):
   - item, quantity, unit, unitCost, totalCost, supplier, invoiceRef, paymentStatus ("paid" or "debt"), amountPaid, amountOutstanding
7. Reported Total Sales: the total sales figure written on the paper report
8. Invoices / Debts:
   - customerOrDescription, type ("debt" for credit given, "paid_invoice" for settled customer invoices), amount, reference
9. Expenses:
   - category (e.g. Lunch, Generator Fuel, Rent, Wi-Fi, Electricity, etc.), description, amount
10. Where the money is:
    - mpesaAmount, cashAtHand
11. Closing fuel balance in litres:
    - pmsLitres (Super), agoLitres (Diesel)
12. Confidence Notes:
    - list any fields that were blurry, faint, smeared, or ambiguous so human staff can verify them.

Do NOT invent numbers. If a field is missing, unreadable, or illegible, set it to 0 or empty string and add an entry to confidenceNotes describing what was unclear.
`;

      const parts: any[] = [{ text: prompt }];
      if (text) parts.push({ text: `Additional Staff Notes: ${text}` });
      if (inlineData) parts.push({ inlineData });

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              stationId: { type: Type.STRING, description: "'ndalu' or 'junction'" },
              reportDate: { type: Type.STRING, description: "YYYY-MM-DD" },
              attendantName: { type: Type.STRING },
              nozzles: {
                type: Type.OBJECT,
                properties: {
                  diesel: {
                    type: Type.OBJECT,
                    properties: {
                      salesStart: { type: Type.NUMBER },
                      salesStop: { type: Type.NUMBER },
                      litresStart: { type: Type.NUMBER },
                      litresStop: { type: Type.NUMBER },
                      ratePerLitre: { type: Type.NUMBER },
                      manualSubtract: { type: Type.NUMBER }
                    }
                  },
                  super: {
                    type: Type.OBJECT,
                    properties: {
                      salesStart: { type: Type.NUMBER },
                      salesStop: { type: Type.NUMBER },
                      litresStart: { type: Type.NUMBER },
                      litresStop: { type: Type.NUMBER },
                      ratePerLitre: { type: Type.NUMBER },
                      manualSubtract: { type: Type.NUMBER }
                    }
                  }
                }
              },
              otherSales: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    item: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unitPrice: { type: Type.NUMBER },
                    reportedAmount: { type: Type.NUMBER }
                  }
                }
              },
              purchases: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    item: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unit: { type: Type.STRING },
                    unitCost: { type: Type.NUMBER },
                    totalCost: { type: Type.NUMBER },
                    supplier: { type: Type.STRING },
                    invoiceRef: { type: Type.STRING },
                    paymentStatus: { type: Type.STRING },
                    amountPaid: { type: Type.NUMBER },
                    amountOutstanding: { type: Type.NUMBER }
                  }
                }
              },
              reportedTotalSales: { type: Type.NUMBER },
              invoices: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    customerOrDescription: { type: Type.STRING },
                    type: { type: Type.STRING, description: "'debt' or 'paid_invoice'" },
                    amount: { type: Type.NUMBER },
                    reference: { type: Type.STRING }
                  }
                }
              },
              expenses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    description: { type: Type.STRING },
                    amount: { type: Type.NUMBER }
                  }
                }
              },
              moneyLocation: {
                type: Type.OBJECT,
                properties: {
                  mpesaAmount: { type: Type.NUMBER },
                  cashAtHand: { type: Type.NUMBER }
                }
              },
              closingFuelBalance: {
                type: Type.OBJECT,
                properties: {
                  pmsLitres: { type: Type.NUMBER },
                  agoLitres: { type: Type.NUMBER }
                }
              },
              confidenceNotes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    field: { type: Type.STRING },
                    issue: { type: Type.STRING }
                  }
                }
              }
            },
            required: ["stationId", "reportDate", "nozzles", "reportedTotalSales"]
          }
        }
      });

      const jsonStr = response.text?.trim() || "{}";
      const result = JSON.parse(jsonStr);
      res.json(result);
    } catch (error) {
      console.error("Gemini Daily Report Extraction Error:", error);
      res.status(500).json({ error: "Failed to extract daily report from image/text." });
    }
  });

  // API Route: Super AI Assistant with Live Data Reading & Write Execution
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, context, conversationHistory } = req.body;
      
      const systemInstruction = `
You are the Super AI Operations & Logistics Engine for Loruk Energy Ltd.
You are equipped with full authority to pull real-time database state, analyze records, summarize debts/balances/fueling, and prepare or execute operational write actions.

Business Context & Rules:
1. Operational Products: Only Diesel, Super (Premium), Engine Oil, Brake Fluid, and Greasing are used in the main app. Station report items (LPG gas, Burners, Grills) are handled separately in Fuel Suite.
2. Default Fueling Product: Default to Diesel unless another product is specified.
3. Currency: Kenyan Shillings (KES / Ksh). Format money clearly with thousands separators (e.g., Ksh 1,250,000.00).
4. Capabilities:
   - READ & PULL DATA: Answer questions using the live context data provided. When the user asks "can you pull data for me?" or asks about balances/fleet/deliveries, pull the exact figures from context and provide a structured, crisp executive overview (Debts & Balances, Fleet Spend by Truck & Product, Recent Deliveries, and Stations).
   - WRITE & EXECUTE: If the user commands or requests to log, add, record, register, create, or execute any action (e.g. "log 50L diesel for KDE 179Y at Loruk - Ndalu", "record payment of 250,000 for Sopowo", "register new truck KDL 019S", "create delivery of 10,000L diesel to Sopowo at 210 KES/L", "update fuel rate to 219.50"), output an actionable "action" object in your response.

OUTPUT SPECIFICATION:
You MUST respond with a valid JSON object matching:
{
  "text": "Your markdown-formatted text response to the user with thorough explanation, tables, or summary.",
  "action": null | {
    "actionType": "log_fleet_expense" | "record_delivery" | "record_payment" | "add_truck" | "add_customer" | "update_fuel_rate",
    "title": "Short descriptive title of the execution",
    "description": "Readable summary of what is being recorded/executed",
    "params": { ... }
  }
}

Action Params specifications:
- log_fleet_expense: { "carRegistration": string, "amount": number, "litres"?: number, "rate"?: number, "station": string, "product": "Diesel" | "Premium" | "Engine Oil" | "Brake Fluid" | "Greasing", "date"?: string }
- record_delivery: { "customerName": string, "productType": string, "litres": number, "rate"?: number, "totalAmount": number, "date"?: string }
- record_payment: { "customerName": string, "amount": number, "date"?: string }
- add_truck: { "registration": string, "status": "active" }
- add_customer: { "name": string, "creditLimit"?: number, "phone"?: string }
- update_fuel_rate: { "station": string, "product": string, "rate": number }
`;

      const contents: any[] = [];
      if (conversationHistory && Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory.slice(-6)) {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          });
        }
      }

      const userPrompt = `
LIVE DATABASE STATE:
${context || "No context provided."}

USER INSTRUCTION:
${message}
`;

      contents.push({
        role: 'user',
        parts: [{ text: userPrompt }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json"
        }
      });

      let parsed: any;
      try {
        parsed = JSON.parse(response.text || '{}');
        if (!parsed.text && parsed.summary) {
          parsed.text = parsed.summary;
        }
      } catch {
        parsed = { text: response.text || 'Processed request.' };
      }

      res.json(parsed);
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
