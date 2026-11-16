'use client';
export const CLIP_LAYOUT_DRAFT_PREFIX='n5-clip-layout:v1:';
export const CLIP_LAYOUT_DRAFT_CLEAR_EVENT='n5:clip-layout-drafts-cleared';

/** Successful logout is a storage boundary even on pages without a mounted editor. */
export function clearClipLayoutDrafts():boolean {
  let cleared=false;
  try {
    const storage=window.sessionStorage,keys:string[]=[];
    for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith(CLIP_LAYOUT_DRAFT_PREFIX))keys.push(key);}
    for(const key of keys)storage.removeItem(key);
    cleared=keys.every(key=>storage.getItem(key)===null);
  }catch{cleared=false;}
  window.dispatchEvent(new CustomEvent(CLIP_LAYOUT_DRAFT_CLEAR_EVENT,{detail:{cleared}}));
  return cleared;
}
