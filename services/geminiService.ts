
import { GoogleGenAI, Type } from "@google/genai";
import { ThumbnailRequest, ThumbnailDesign, ThumbnailImage } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateStrategy(req: ThumbnailRequest): Promise<ThumbnailDesign> {
    const textPart = {
      text: `
        ROLE: Professional YouTube Thumbnail Design AI (High-CTR specialist).
        OBJECTIVE: Design a viral, click-optimized concept for ${req.ratio} aspect ratio.
        
        CONTEXT:
        Title: "${req.title}"
        Niche: "${req.niche}"
        Emotion: "${req.emotion}"
        Subject: "${req.subjectDescription || 'Not specified'}"

        CORE RULES:
        1. Emotionally intense focal point.
        2. Simple (1-2 focal points max).
        3. Bold typography (3-6 words MAX, capital letters).
        4. High contrast colors.
        5. Respect the ${req.ratio} aspect ratio in layout instructions.

        IMPORTANT: I am providing ${req.subjectImages.length} reference image(s). Use them to understand the look and feel of the subject(s).

        Return a JSON object:
        {
          "concept": { "idea": "one clear visual idea", "hook": "emotional hook explanation" },
          "mainText": "3-6 WORDS MAX, ALL CAPS",
          "visualElements": { 
            "expression": "shocked face / excited / etc", 
            "objects": ["primary object", "accent object"], 
            "directionalElements": ["red arrow", "yellow circle"], 
            "backgroundStyle": "gradient / blurred office / etc" 
          },
          "colorPalette": { "primary": "CSS color", "accent": "CSS color", "text": "CSS color", "background": "CSS color" },
          "layoutInstructions": { 
            "textPlacement": "left/right/center", 
            "subjectPlacement": "opposite to text", 
            "arrowDirections": ["towards text", "towards face"], 
            "negativeSpace": "area to keep clear" 
          }
        }
      `
    };

    const parts: any[] = [textPart];
    req.subjectImages.forEach(img => {
      parts.push({
        inlineData: {
          data: img.data.split(',')[1],
          mimeType: img.mimeType
        }
      });
    });

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            concept: {
              type: Type.OBJECT,
              properties: {
                idea: { type: Type.STRING },
                hook: { type: Type.STRING }
              }
            },
            mainText: { type: Type.STRING },
            visualElements: {
              type: Type.OBJECT,
              properties: {
                expression: { type: Type.STRING },
                objects: { type: Type.ARRAY, items: { type: Type.STRING } },
                directionalElements: { type: Type.ARRAY, items: { type: Type.STRING } },
                backgroundStyle: { type: Type.STRING }
              }
            },
            colorPalette: {
              type: Type.OBJECT,
              properties: {
                primary: { type: Type.STRING },
                accent: { type: Type.STRING },
                text: { type: Type.STRING },
                background: { type: Type.STRING }
              }
            },
            layoutInstructions: {
              type: Type.OBJECT,
              properties: {
                textPlacement: { type: Type.STRING },
                subjectPlacement: { type: Type.STRING },
                arrowDirections: { type: Type.ARRAY, items: { type: Type.STRING } },
                negativeSpace: { type: Type.STRING }
              }
            }
          },
          required: ["concept", "mainText", "visualElements", "colorPalette", "layoutInstructions"]
        }
      }
    });

    return JSON.parse(response.text.trim());
  }

  async generateThumbnailImage(strategy: ThumbnailDesign, ratio: string, subjectImages: ThumbnailImage[]): Promise<string> {
    try {
      const objects = Array.isArray(strategy.visualElements?.objects) ? strategy.visualElements.objects : [];
      const directionalElements = Array.isArray(strategy.visualElements?.directionalElements) ? strategy.visualElements.directionalElements : [];
      
      const promptText = `
        Viral ${ratio} YouTube/Social Media Thumbnail. High CTR style.
        Subject: ${strategy.visualElements?.expression || 'person'}.
        Focus: ${strategy.concept?.idea || 'intense scene'}.
        Props: ${objects.join(", ") || 'none'}.
        Text: Giant 3D bold text saying "${strategy.mainText || ''}" placed at ${strategy.layoutInstructions?.textPlacement || 'center'}.
        Aesthetics: Extremely high contrast, vibrant ${strategy.colorPalette?.primary || 'red'} and ${strategy.colorPalette?.accent || 'yellow'} colors. 
        Glow effects, thick outlines, directional ${directionalElements.join(", ") || 'arrows'}.
        Background: ${strategy.visualElements?.backgroundStyle || 'vibrant gradient'}.
        Masterpiece, 4k, hyper-detailed, MrBeast aesthetic.
        Use the provided reference image(s) to accurately represent the person or subject.
      `;

      const parts: any[] = [{ text: promptText }];
      subjectImages.forEach(img => {
        parts.push({
          inlineData: {
            data: img.data.split(',')[1],
            mimeType: img.mimeType
          }
        });
      });

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: ratio as any
          }
        }
      });

      if (!response.candidates?.[0]?.content?.parts) {
        throw new Error("Empty image response. This usually indicates safety filter intervention.");
      }

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      throw new Error("No image data returned from rendering engine.");
    } catch (error: any) {
      if (error.message?.includes("SAFETY")) {
        throw new Error("Safety Block: The content or subject image triggered safety filters. Try a different concept.");
      }
      throw error;
    }
  }
}
