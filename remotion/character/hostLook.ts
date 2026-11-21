import { z } from "zod";

/**
 * A stylised human host (the "it's me" avatar). Every feature is a plain option so a persona can be
 * tuned to resemble its presenter without any face data: pick hair, skin, glasses, beard and outfit.
 */
export const HostLookZ = z.object({
  skin: z.string().default("#C68642"),
  hair: z.enum(["short", "quiff", "buzz", "curly", "side", "bun", "long", "none"]).default("short"),
  hairColor: z.string().default("#1B1B1B"),
  facialHair: z.enum(["none", "stubble", "beard", "moustache", "goatee"]).default("none"),
  glasses: z.enum(["none", "round", "square", "sunglasses"]).default("none"),
  glassesColor: z.string().default("#1E2A44"),
  eyeColor: z.string().default("#3B2A1A"),
  outfit: z.enum(["hoodie", "tee", "shirt"]).default("hoodie"),
  outfitColor: z.string().default("#2F6FED"),
  /** Hoodie strings / tee print / shirt buttons. */
  outfitAccent: z.string().default("#FFFFFF"),
  accessory: z.enum(["none", "headphones", "cap"]).default("none"),
  accessoryColor: z.string().default("#1E2A44"),
  /** Wrist watch on the raised/pointing hand. */
  watch: z.boolean().default(false),
  /** Thin gold chain at the collar. */
  chain: z.boolean().default(false),
});
export type HostLook = z.infer<typeof HostLookZ>;

export const DEFAULT_HOST_LOOK: HostLook = HostLookZ.parse({});

/** Preset looks shown on the HostLooks sheet; a persona copies one and tweaks it. */
export const HOST_PRESETS: Record<string, Partial<HostLook>> = {
  "K · from your photos": { skin: "#B5794A", hair: "quiff", hairColor: "#161616", facialHair: "beard", glasses: "none", eyeColor: "#3A2415", outfit: "shirt", outfitColor: "#5B3FB5", outfitAccent: "#FFFFFF", watch: true, chain: true },
  "K2 · with sunglasses": { skin: "#B5794A", hair: "quiff", hairColor: "#161616", facialHair: "beard", glasses: "sunglasses", eyeColor: "#3A2415", outfit: "shirt", outfitColor: "#5B3FB5", outfitAccent: "#FFFFFF", watch: true, chain: true },
  "A · short hair, hoodie": { hair: "short", outfit: "hoodie" },
  "B · short hair, glasses, beard": { hair: "short", glasses: "round", facialHair: "beard", outfit: "tee", outfitColor: "#1E2A44", outfitAccent: "#22D3EE" },
  "C · side part, square glasses, shirt": { hair: "side", glasses: "square", facialHair: "stubble", outfit: "shirt", outfitColor: "#F3F4F6" },
  "D · curly, headphones": { hair: "curly", accessory: "headphones", outfit: "hoodie", outfitColor: "#7B2CBF" },
  "E · buzz cut, goatee, cap": { hair: "buzz", facialHair: "goatee", accessory: "cap", accessoryColor: "#DC2626", outfit: "tee", outfitColor: "#111827" },
  "F · bun, round glasses": { hair: "bun", glasses: "round", outfit: "shirt", outfitColor: "#2FA36B", skin: "#8D5524" },
  "G · long hair, tee": { hair: "long", outfit: "tee", outfitColor: "#F59E0B", skin: "#E0AC69" },
  "H · short hair, moustache": { hair: "short", facialHair: "moustache", hairColor: "#4A2C17", outfit: "hoodie", outfitColor: "#0EA5E9", skin: "#F1C27D" },
};
