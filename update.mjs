import fs from 'fs';

const resortsText = fs.readFileSync('resorts.ts', 'utf-8');

const mappingRows = [
  { name: "Kuramathi", row: ["B", "C", "C", "C", "Whaleshark", "Wooden / Nature", "Lancha rápida"] },
  { name: "Lily Beach Resort & Spa", row: ["A", "A", "B", "C", "Whaleshark", "Wooden / Nature", "Hidroavión"] },
  { name: "OBLU Nature Helengeli", row: ["A", "B", "A", "C", "No", "Modern", "Lancha rápida"] },
  { name: "Veligandu Maldives", row: ["A", "A", "A", "C", "Whaleshark, Mantas", "Modern", "Hidroavión"] },
  { name: "Centara Grand Machchafushi", row: ["B", "A", "A", "C", "Whaleshark", "Modern", "Hidroavión"] },
  { name: "OBLU Select Sangeli", row: ["A", "B", "B", "C", "No", "Modern", "Lancha rápida"] },
  { name: "JA Manafaru", row: ["B", "B", "B", "C", "No", "Wooden / Nature", "Hidroavión"] },
  { name: "Heritance Aarah", row: ["A", "A", "C", "C", "Mantas", "Wooden / Nature", "Hidroavión"] },
  { name: "Sun Siyam Olhuveli", row: ["B", "A", "C", "C", "Whaleshark", "Modern", "Lancha rápida"] },
  { name: "Siyam World Resort", row: ["B", "A", "C", "A", "No", "Modern", "Hidroavión"] },
  { name: "RAAYA by Atmosphere", row: ["A", "B", "B", "B", "No", "Modern", "Hidroavión"] },
  { name: "Dhigali Maldives", row: ["B", "A", "C", "C", "Mantas", "Modern", "Hidroavión"] },
  { name: "Atmosphere Kanifushi", row: ["A", "B", "B", "B", "No", "Modern / Nature", "Hidroavión"] },
  { name: "Emerald Maldives Resort & Spa", row: ["A", "A", "B", "A", "No", "Modern", "Hidroavión"] },
  { name: "OBLU Select Lobigili", row: ["A", "B", "A", "B", "Nurse Shark", "Modern", "Lancha rápida"] },
  { name: "Melià Whale Lagoon", row: ["B", "B", "A", "A", "Whaleshark", "Wooden / Nature", "Hidroavión"] },
  { name: "VARU by Atmosphere", row: ["A", "A", "A", "B", "Nurse Shark", "Modern", "Lancha rápida"] },
  { name: "Outrigger Maldives Maafushivaru", row: ["B", "A", "A", "A", "Whaleshark", "Modern", "Hidroavión"] },
  { name: "Emerald Faarufushi Resort & Spa", row: ["A", "A", "A", "C", "No", "Modern", "Hidroavión"] },
  { name: "Hurawalhi Island Resort", row: ["B", "A", "A", "C", "No", "Wooden / Nature", "Hidroavión"] },
  { name: "Pullman Maldives Maamutaa", row: ["B", "A", "B", "C", "No", "Wooden / Nature", "Vuelo doméstico"] },
  { name: "Six Senses Laamu", row: ["C", "A", "B", "C", "No", "Wooden / Nature", "Hidroavión"] },
  { name: "Avani+ Fares Maldives", row: ["B", "A", "C", "C", "Mantas", "Modern", "Hidroavión"] },
  { name: "InterContinental Maamunagau", row: ["B,C", "A", "B", "C", "Mantas", "Modern", "Hidroavión"] },
  { name: "Kuredhivaru", row: ["B", "A", "B", "C", "No", "Wooden / Nature", "Hidroavión"] },
  { name: "Conrad Maldives Rangali Island", row: ["B,C", "A", "C", "A", "Whaleshark", "Modern", "Hidroavión"] },
  { name: "Niyama Private Islands", row: ["B,C", "A", "C", "A", "No", "Wooden / Nature", "Hidroavión"] },
  { name: "Anantara Veli Maldives", row: ["B,C", "A", "A", "A", "Nurse shark", "Wooden / Nature", "Lancha rápida"] },
  { name: "OZEN Life Maadhoo", row: ["A", "A", "B", "B", "No", "Wooden / Nature", "Lancha rápida"] }
];

const map = {};

mappingRows.forEach(item => {
  const parts = item.row;
  const q_desp = parts[0].split(',').map(s => s.trim());
  const q5 = parts[1].split(',').map(s => s.trim());
  const q1 = parts[2].split(',').map(s => s.trim());
  const q3 = parts[3].split(',').map(s => s.trim());
  
  const fauna = parts[4];
  let q4 = ['A'];
  let q4_1 = ['A'];
  let q4_2 = [];
  if (fauna !== 'No') {
    q4 = ['A', 'B'];
    q4_1 = ['A', 'B'];
    if (fauna.includes('Mantas')) q4_2.push('A');
    if (fauna.toLowerCase().includes('whaleshark')) q4_2.push('B');
    if (fauna.toLowerCase().includes('nurse shark')) q4_2.push('C');
  }

  const estetica = parts[5].trim();
  let q9 = [];
  if (estetica === 'Wooden / Nature') q9 = ['A', 'C'];
  else if (estetica === 'Modern' || estetica === 'Moderno') q9 = ['B', 'C'];
  else if (estetica === 'Modern / Nature') q9 = ['A', 'B', 'C'];

  const traslado = parts[6].trim();
  let q11 = [];
  if (traslado === 'Lancha rápida') q11 = ['A', 'D'];
  else if (traslado === 'Hidroavión') q11 = ['B', 'D'];
  else if (traslado === 'Vuelo doméstico') q11 = ['C', 'D'];

  map[item.name] = { q_despreocupacion: q_desp, q5, q1, q3, q4, 'q4.1': q4_1, 'q4.2': q4_2, q9, q11 };
});

const renameMap = {
  "Melià Whale Lagoon": "Barceló Whale Lagoon",
  "Kuredhivaru": "Mövenpick Kuredhivaru"
};

let newText = resortsText;
Object.keys(map).forEach(resortName => {
  const actualName = renameMap[resortName] || resortName;
  const safeName = actualName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); // escape special chars
  // regex for name match until q_priorities
  const regex = new RegExp('(name:\\s*(?:"' + safeName + '"|\\'' + safeName + '\\')[\\s\\S]*?q_priorities:[^\\]]*\\])', 'g');
  newText = newText.replace(regex, (match) => {
    const props = map[resortName];
    let updatedMatch = match;
    Object.keys(props).forEach(prop => {
      const escapedProp = prop.replace('.', '\\.');
      const propRegex = new RegExp('(\'' + escapedProp + '\'|' + escapedProp + '):\\s*\\[.*?\\]');
      const replacementKey = prop.includes('.') ? "'" + prop + "'" : prop;
      updatedMatch = updatedMatch.replace(propRegex, replacementKey + ': ' + JSON.stringify(props[prop]));
    });
    return updatedMatch;
  });
});

fs.writeFileSync('resorts.ts', newText);
console.log('Resorts updated');
