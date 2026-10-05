// Preview sRGB values; leather photographs are references, not measured reflectance.
export const popColors=[
 {id:'nymphe',name:'水妖蓝',hex:'#0c69ac'},
 {id:'abyss',name:'深海蓝',hex:'#373b3f'},
 {id:'mist',name:'云雾灰',hex:'#989897'},
 {id:'orange',name:'橙色',hex:'#e07335'},
 {id:'mauve',name:'锦葵紫',hex:'#dca7b9'},
 {id:'comic',name:'炫绿色',hex:'#31b97a'},
 {id:'yucca',name:'丝兰绿',hex:'#436a2d'},
 {id:'milton',name:'米尔顿黄',hex:'#ded8b3'},
 {id:'azalee',name:'杜鹃粉',hex:'#f6768a'},
 {id:'biscuit',name:'饼干色',hex:'#bf8d4e'},
 {id:'gold',name:'金色',hex:'#8c5732'},
 {id:'duck',name:'鸭绿色',hex:'#295f6d'},
 {id:'deep',name:'深邃蓝',hex:'#1e4256'},
 {id:'etoupe',name:'大象灰',hex:'#736154'},
 {id:'casaque',name:'卡萨克红',hex:'#ad1b2d'},
 {id:'naples',name:'那不勒斯黄',hex:'#e9c527'},
 {id:'celeste',name:'天蓝色',hex:'#7fb3d3'},
 {id:'new-jean',name:'新牛仔蓝',hex:'#457d8c'},
 {id:'zanzibar',name:'尚西巴岛蓝',hex:'#0967a5'},
 {id:'cement',name:'水泥灰',hex:'#b9b2a8'},
 {id:'glacier',name:'冰川蓝',hex:'#acb3b5'},
 {id:'slate',name:'石板灰',hex:'#4b4a4e'},
 {id:'rouge-h',name:'爱马仕红',hex:'#602626'},
 {id:'craie',name:'粉笔白',hex:'#dacdbb'}
];
const colors=ids=>ids.map(id=>popColors.find(c=>c.id===id));
export const popPalettes={
 epsom:colors(['casaque','orange','naples','comic','yucca','duck','celeste','nymphe','deep','mauve','azalee','craie']),
 evercolor:colors(['rouge-h','biscuit','gold','glacier','cement','slate','etoupe'])
};

// Epsom first, then Evercolor; shared names appear once.
export const popAccessoryPalette=[...popPalettes.epsom,...popPalettes.evercolor].filter((c,i,all)=>all.findIndex(p=>p.id===c.id)===i);
