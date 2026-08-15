export interface SchemaOrgProps {
  schema: Record<string, any> | Record<string, any>[]
}

export function SchemaOrg({ schema }: SchemaOrgProps) {
  if (!schema || (Array.isArray(schema) && schema.length === 0)) {
    return null
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}