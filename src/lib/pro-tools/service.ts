import { supabase } from '@/lib/supabase/client';
import type { Entry, Note, Tool, ToolSlug } from './model';
// The new tables are isolated here until generated Supabase types are refreshed.
const db = supabase as any;
async function result<T>(request: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data;
}
export const toolsService = {
  catalog: () => result<Tool[]>(db.from('pro_tools').select('*').order('slug')),
  access: () => result<boolean>(db.rpc('has_pro_tools_access')),
  entries: (slug: ToolSlug) => result<Entry[]>(db.from('pro_tool_entries').select('*').eq('tool_slug', slug).order('updated_at', { ascending: false })),
  configure: (tool: Tool) => result<Tool>(db.from('pro_tools').update({ title: tool.title, description: tool.description, enabled: tool.enabled }).eq('slug', tool.slug).select().single()),
  saveEntry: (entry: Partial<Entry>) => result<Entry>(db.from('pro_tool_entries').upsert(entry).select().single()),
  deleteEntry: (id: string) => result(db.from('pro_tool_entries').delete().eq('id', id)),
  notes: (slug: 'workspace' | 'cases') => result<Note[]>(db.from('pro_tool_notes').select('*').eq('tool_slug', slug).order('created_at', { ascending: false })),
  saveNote: (note: Partial<Note>) => result<Note>(db.from('pro_tool_notes').upsert(note).select().single()),
  deleteNote: (id: string) => result(db.from('pro_tool_notes').delete().eq('id', id)),
  follows: () => result<{ topic: string }[]>(db.from('pro_tool_follows').select('topic')),
  follow: (topic: string) => result(db.from('pro_tool_follows').insert({ topic })),
  unfollow: (topic: string) => result(db.from('pro_tool_follows').delete().eq('topic', topic)),
};
