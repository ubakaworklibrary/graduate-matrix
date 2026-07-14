/**
 * Temporary pre-schema database typing boundary.
 *
 * Phase 5 schema work will replace this marker with Supabase-generated
 * Database types as soon as the first schema exists. Until then, Supabase
 * clients remain unparameterized rather than pretending that tables exist.
 *
 * Canonical application domain types remain in types/graduate-matrix.ts.
 * Generated database row types and canonical domain types are separate
 * concerns and will later be connected through repository mappers.
 */
export const DATABASE_SCHEMA_STATUS = "pending-generated-types";

export type DatabaseSchemaStatus = typeof DATABASE_SCHEMA_STATUS;
