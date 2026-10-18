import * as THREE from 'three';
import extraFrames from './sticker-frames.json';

// UV windows over the supplied sheet's transparent extraction. Keep internal whites.
// Coordinates refer to the 1536 × 1024 atlas; sprites retain each sticker's aspect ratio.
export const stickerFrames:[string,number,number,number,number][]=[
  ['football-flag',18,55,260,155],['trophy-flag',299,48,223,172],
  ['three-stars',539,86,237,106],['trophy',787,35,217,194],['crown',1036,67,200,150],
  ['flag',1268,56,252,176],['map',73,235,152,220],['afa',297,235,196,216],
  ['shirt',525,234,237,216],['ten',783,247,227,194],['portrait',1038,235,194,212],
  ['arg',1268,264,256,145],['argentina',12,478,279,132],['2022',292,480,242,131],
  ['vamos',537,464,243,151],['sun',792,449,209,187],
  ['heart',1043,457,204,180],['sparkles',1297,449,211,180],['whistle',24,632,233,172],
  ['ribbon',260,637,290,169],['confetti',574,630,202,186],['thumb',801,640,191,170],
  ['flaming-football',1030,630,240,190],['goal',1273,644,251,170],
  ['tactics',32,830,228,157],['boot',269,826,242,166],['painted-flag',531,821,234,176],
  ['stadium',772,823,230,174],['scarf',1003,833,292,160],
];

export type StickerCategory='planet'|'stranger'|'football';
export type StickerPools=Record<StickerCategory,THREE.Texture[]>;
export const stickerWeights={planet:{planet:50,stranger:30,football:20},football:{planet:15,stranger:18,football:66}};
export function pickStickerCategory(mode:'planet'|'football',random=Math.random):StickerCategory{
  const weights=stickerWeights[mode],value=random()*(weights.planet+weights.stranger+weights.football);
  return value<weights.planet?'planet':value<weights.planet+weights.stranger?'stranger':'football';
}
export function stickerCount(random=Math.random){return 3+Math.floor(random()*4);}
export async function loadStickers():Promise<StickerPools>{
  const entries=await Promise.all((['football','planet','stranger'] as const).map(async category=>{
    const atlas=await new THREE.TextureLoader().loadAsync(`/stickers/${category==='football'?'argentina':category}-atlas.png`);
    atlas.colorSpace=THREE.SRGBColorSpace;atlas.generateMipmaps=false;atlas.minFilter=THREE.LinearFilter;
    const frames=category==='football'?stickerFrames:extraFrames[category];
    const textures=frames.map(frame=>{
      const [name,x,y,w,h]=frame as [string,number,number,number,number],texture=atlas.clone();texture.name=name;
      texture.repeat.set(w/1536,h/1024);texture.offset.set(x/1536,1-(y+h)/1024);
      texture.userData.aspect=w/h;texture.userData.category=category;texture.needsUpdate=true;return texture;
    });
    return [category,textures] as const;
  }));
  return Object.fromEntries(entries) as StickerPools;
}
