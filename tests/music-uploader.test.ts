import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
// Minimal hook host: exercise actual handlers and rerenders without adding a DOM dependency.
const host = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, effects: [] as (() => unknown)[], initialized: false }));
vi.mock('react', async original => ({ ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const i = host.cursor++;
    if (!(i in host.values)) host.values[i] = initial;
    return [host.values[i], (value: unknown) => { host.values[i] = value; }];
  },
  useRef: (initial: unknown) => {
    const i = host.cursor++;
    if (!(i in host.values)) host.values[i] = { current: initial };
    return host.values[i];
  },
  useEffect: (effect: () => unknown) => { if (!host.initialized) host.effects.push(effect); },
}));
vi.mock('react-dom', () => ({ flushSync: (fn: () => void) => fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('../apps/web/src/lib/rpc', () => ({ rpc: vi.fn() }));
import { rpc } from '../apps/web/src/lib/rpc';
import { VideoUploader } from '../apps/web/src/app/upload/Uploader';
type Props = { children?: unknown; type?: string; disabled?: boolean; checked?: boolean; onChange?: (e: unknown) => void; className?: string; onClick?: () => void };
let storage: Map<string, string>;
function render() {
  host.cursor = 0;
  const tree = VideoUploader({accountScope:scope});
  if (!host.initialized) { host.initialized = true; host.effects.forEach(f => f()); }
  const nodes: ReactElement<Props>[] = [];
  function visit(value: unknown) {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== 'object' || !('props' in value)) return;
    const node = value as ReactElement<Props>; nodes.push(node); visit(node.props.children);
  }
  visit(tree); return nodes;
}
const input = (nodes: ReactElement<Props>[], type: string) => nodes.find(n => n.props.type === type)!;
const scope='11111111-1111-4111-8111-111111111111',key='22222222-2222-4222-8222-222222222222';
const storageKey=`n5-upload-resume:v2:${scope}`;
const file = new File(['test bytes'], 'podcast.mp3', {lastModified:123});
beforeEach(() => {
  host.values=[];host.cursor=0;host.effects=[];host.initialized=false;storage=new Map();
  vi.stubGlobal('sessionStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)});
  vi.stubGlobal('window',{addEventListener:vi.fn(),removeEventListener:vi.fn()});
  vi.stubGlobal('document',{addEventListener:vi.fn(),removeEventListener:vi.fn()});
  vi.mocked(rpc).mockRejectedValue(new Error('offline'));
});
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});
async function choose(selected=file) {
  input(render(),'file').props.onChange!({target:{files:[selected],value:'chosen'}});
  await vi.waitFor(()=>expect(render().find(n=>n.type==='button'&&n.props.className?.includes('upload-start'))!.props.disabled).toBe(false));
}
it('default and selected music survive failed create and lock immutable options',async()=>{
  expect(input(render(),'checkbox').props.checked).toBe(false);
  await choose();input(render(),'checkbox').props.onChange!({target:{checked:true}});
  render().find(n=>n.type==='button'&&n.props.className?.includes('upload-start'))!.props.onClick!();
  expect(input(render(),'checkbox').props.disabled).toBe(true);
  await vi.waitFor(()=>expect(vi.mocked(rpc)).toHaveBeenCalled());
  expect(vi.mocked(rpc).mock.calls[0]![1]).toMatchObject({music:true,account_scope:scope});
  expect(JSON.parse(storage.get(storageKey)!).options.music).toBe(true);
});
it.each([true,false])('strict v2 restores locked music %s after full hash and separate Continue',async value=>{
  const {createHash}=await import('node:crypto');
  const contentSha256=createHash('sha256').update('test bytes').digest('hex');
  storage.set(storageKey,JSON.stringify({version:2,accountScope:scope,key,identityAlgorithm:'sha256',contentSha256,size:file.size,originalFilename:'original.mp3',
    options:{...{music:false,teaser:true,compact:true,ctaKind:'none',ctaUrl:null}, music:value}}));
  await choose();expect(vi.mocked(rpc)).not.toHaveBeenCalled();
  expect(input(render(),'checkbox').props.checked).toBe(value);expect(input(render(),'checkbox').props.disabled).toBe(true);
  render().find(n=>n.type==='button'&&n.props.className?.includes('upload-start'))!.props.onClick!();await vi.waitFor(()=>expect(vi.mocked(rpc)).toHaveBeenCalled());
  expect(vi.mocked(rpc).mock.calls[0]![3]).toBe(key);expect(vi.mocked(rpc).mock.calls[0]![1]).toMatchObject({music:value,filename:'original.mp3'});
});
it('legacy never automatically resumes or assigns new hash to old parts',async()=>{
  storage.set('n5-upload-resume',JSON.stringify({key:'legacy',fingerprint:'podcast.mp3:10:123'}));
  input(render(),'file').props.onChange!({target:{files:[file],value:'chosen'}});
  await vi.waitFor(()=>expect(render().some(n=>n.props.children==='Начать новую загрузку')).toBe(true));
  expect(vi.mocked(rpc)).not.toHaveBeenCalled();expect(storage.get(storageKey)).toBeUndefined();
});
it.each([true,false])('new selection preserves current music %s',async value=>{
  input(render(),'checkbox').props.onChange!({target:{checked:value}});await choose();
  expect(input(render(),'checkbox').props.checked).toBe(value);expect(input(render(),'checkbox').props.disabled).toBe(false);
});
