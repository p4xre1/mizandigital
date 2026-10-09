// @vitest-environment jsdom
import React from "react"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

/** Records every `.or()` filter sent to Supabase, per table. */
const orCalls: Array<{ table: string; filter: string }> = []

vi.mock("../src/lib/supabase/client", () => {
  const builder = (table: string) => {
    const api: any = {
      select: () => api,
      eq: () => api,
      or: (filter: string) => {
        orCalls.push({ table, filter })
        return api
      },
      limit: () => Promise.resolve({ data: [], error: null }),
    }
    return api
  }
  return { supabase: { from: (table: string) => builder(table) } }
})
vi.mock("../src/components/seo/AEOHead", () => ({ AEOHead: () => null }))

import { SearchPage } from "../src/pages/public/SearchPage"

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  orCalls.length = 0
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function searchFor(q: string) {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[`/search?q=${encodeURIComponent(q)}`]}>
        <SearchPage />
      </MemoryRouter>,
    )
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe("SearchPage — query filters", () => {
  test("a multi-word query becomes OR terms per table, not one whole phrase", async () => {
    await searchFor("مدونة الشغل")
    const articles = orCalls.find((c) => c.table === "articles")!.filter
    expect(articles).toContain("title.ilike.%مدونه%")
    expect(articles).toContain("title.ilike.%الشغل%")
    expect(articles).not.toContain("مدونة الشغل")
    expect(articles.split(",").length).toBe(6) // 2 tokens × 3 fields
  })

  test("characters that break the PostgREST filter never reach it", async () => {
    await searchFor('عقد (البيع), title.eq.x) "%_*')
    for (const call of orCalls) {
      // only the expected pattern: field.ilike.%token%
      for (const clause of call.filter.split(",")) {
        expect(clause).toMatch(/^[a-z_]+\.ilike\.%[\p{L}\p{N}]+%$/u)
      }
    }
  })

  test("stopword-only input sends no queries", async () => {
    await searchFor("من في")
    expect(orCalls).toHaveLength(0)
  })
})
