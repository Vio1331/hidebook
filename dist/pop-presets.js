// Full configurations transcribed from the 16 supplied customization sheets,
// in upload order. Thread and edge paint belong to their respective seam loops.
const fields=['rear','accent','front','outerThread','innerThread','outerEdge','innerEdge'];
const schemes=[
 ['epsom','nymphe','naples','casaque','craie','naples','craie','naples'],
 ['evercolor','rouge-h','rouge-h','rouge-h','craie','craie','craie','craie'],
 ['evercolor','cement','slate','etoupe','cement','slate','etoupe','slate'],
 ['epsom','yucca','naples','yucca','naples','yucca','yucca','naples'],
 ['epsom','nymphe','craie','casaque','craie','nymphe','casaque','nymphe'],
 ['epsom','celeste','celeste','deep','celeste','celeste','deep','deep'],
 ['epsom','craie','azalee','craie','craie','azalee','craie','azalee'],
 ['epsom','orange','craie','deep','craie','craie','craie','craie'],
 ['evercolor','biscuit','gold','etoupe','craie','gold','etoupe','gold'],
 ['evercolor','etoupe','cement','etoupe','etoupe','cement','etoupe','cement'],
 ['evercolor','cement','slate','cement','slate','cement','slate','cement'],
 ['epsom','naples','orange','casaque','naples','orange','casaque','orange'],
 ['epsom','comic','craie','comic','comic','comic','comic','comic'],
 ['evercolor','cement','gold','gold','gold','gold','gold','gold'],
 ['epsom','mauve','mauve','craie','craie','craie','craie','mauve'],
 ['evercolor','glacier','etoupe','cement','cement','etoupe','cement','etoupe'],
];
export const popPresets=schemes.map(([material,...colors],i)=>({
 id:String(i+1).padStart(2,'0'),material,
 config:{...Object.fromEntries(fields.map((key,j)=>[key,colors[j]])),
  rearMaterial:material,accentMaterial:material,frontMaterial:material,crease:'single'},
}));
export const matchesPreset=(config,preset)=>Object.entries(preset.config).every(([key,value])=>config[key]===value);
export function presetThumbnail(preset,color){
 const c=Object.fromEntries(fields.map(key=>[key,color(preset.config[key]).hex]));
 // Millimetre silhouettes retain the 107×80 body and 85×55 middle pocket.
 return `<svg viewBox="0 0 127 100" aria-hidden="true" focusable="false">
 <rect x="10" y="10" width="107" height="80" rx="10" fill="${c.rear}" stroke="${c.outerEdge}" stroke-width="1.1"/>
 <path d="M24 25.5H103A3 3 0 0 1 106 28.5V80.5H21V28.5A3 3 0 0 1 24 25.5Z" fill="${c.accent}" stroke="${c.innerEdge}" stroke-width="1.1"/>
 <path d="M25 80.5V29.5H102V80.5" fill="none" stroke="${c.innerThread}" stroke-width=".6" stroke-dasharray="2.5 .88"/>
 <path d="M10 41.5H117V80A10 10 0 0 1 107 90H20A10 10 0 0 1 10 80Z" fill="${c.front}"/>
 <path d="M10 41.5H117M10 41.5V80A10 10 0 0 0 20 90H107A10 10 0 0 0 117 80V41.5" fill="none" stroke="${c.outerEdge}" stroke-width="1.1"/>
 <rect x="14" y="14" width="99" height="72" rx="6" fill="none" stroke="${c.outerThread}" stroke-width=".6" stroke-dasharray="2.5 .88"/>
 <path d="M12 39.5H115M23 27.5H104" fill="none" stroke="#302c28" stroke-opacity=".25" stroke-width=".3"/>
 </svg>`;
}
