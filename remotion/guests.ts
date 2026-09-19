/**
 * The guest cast: one small character per topic category. It shows up for the comedy beat after the
 * wow fact, says one line in its own voice, and Bolt reacts. Names and personalities per language
 * feed the writer prompt; the SVG lives in remotion/character/Guest.tsx.
 */
export type GuestKind = "cat" | "star" | "tooth" | "raindrop" | "sock" | "mango" | "fish" | "dino" | "gear" | "heart";

export type GuestSpec = {
  kind: GuestKind;
  name: Record<string, string>;
  /** One line for the writer: who this character is and its running joke. */
  personality: Record<string, string>;
};

export const GUESTS: Record<string, GuestSpec> = {
  animals: {
    kind: "cat",
    name: { en: "Mimi the cat", hi: "मिमी बिल्ली" },
    personality: { en: "a lazy cat who thinks every fact is about her and wants a nap", hi: "एक आलसी बिल्ली जो सोचती है हर बात उसी के बारे में है और उसे झपकी चाहिए" },
  },
  space: {
    kind: "star",
    name: { en: "Tara the star", hi: "तारा" },
    personality: { en: "a tiny star who brags about being the brightest, then gets shy", hi: "एक नन्हा तारा जो सबसे चमकीला होने की डींग मारता है, फिर शरमा जाता है" },
  },
  "human-body": {
    kind: "tooth",
    name: { en: "Dantu the tooth", hi: "दंतू दाँत" },
    personality: { en: "a wobbly tooth who is scared of sweets and very proud of being brushed", hi: "एक हिलता दाँत जो मिठाई से डरता है और ब्रश होने पर बहुत गर्व करता है" },
  },
  "weather-nature": {
    kind: "raindrop",
    name: { en: "Boondi the raindrop", hi: "बूंदी" },
    personality: { en: "a raindrop who is always in a hurry to fall and gets dizzy", hi: "एक बूंद जिसे हमेशा गिरने की जल्दी है और चक्कर आ जाते हैं" },
  },
  "everyday-things": {
    kind: "sock",
    name: { en: "Moza the sock", hi: "मोज़ा" },
    personality: { en: "a lonely sock forever looking for its pair", hi: "एक अकेला मोज़ा जो हमेशा अपना जोड़ा ढूँढता रहता है" },
  },
  food: {
    kind: "mango",
    name: { en: "Aam Ji the mango", hi: "आम जी" },
    personality: { en: "a mango who is sure he is the king of all fruits and wants a crown", hi: "एक आम जिसे पक्का यकीन है कि वही फलों का राजा है और उसे ताज चाहिए" },
  },
  ocean: {
    kind: "fish",
    name: { en: "Machhli the fish", hi: "मछली रानी" },
    personality: { en: "a fish who keeps asking if it is lunchtime yet", hi: "एक मछली जो बार-बार पूछती है कि खाने का समय हुआ क्या" },
  },
  dinosaurs: {
    kind: "dino",
    name: { en: "Dinu the dino", hi: "डीनू डायनासोर" },
    personality: { en: "a small dinosaur who thinks it is still very big and scary (it is not)", hi: "एक छोटा डायनासोर जो सोचता है कि वह अब भी बहुत बड़ा और डरावना है (है नहीं)" },
  },
  "how-things-work": {
    kind: "gear",
    name: { en: "Gopal the gear", hi: "गियर गोपाल" },
    personality: { en: "a gear who says 'click' when he understands and 'clunk' when he does not", hi: "एक गियर जो समझ आने पर 'क्लिक' और न आने पर 'क्लंक' बोलता है" },
  },
  "feelings-friendship": {
    kind: "heart",
    name: { en: "Dil the heart", hi: "दिल" },
    personality: { en: "a heart who hugs everyone, even the wow fact", hi: "एक दिल जो सबको गले लगाता है, मज़ेदार तथ्य को भी" },
  },
};

export function guestFor(category: string): GuestSpec {
  return GUESTS[category] ?? GUESTS["how-things-work"]!;
}

export function guestName(category: string, language: string): string {
  const g = guestFor(category);
  return g.name[language] ?? g.name.en!;
}
