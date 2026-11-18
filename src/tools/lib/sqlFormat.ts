/** SQL formatting. Imported with await import() from devTools so sql-formatter loads on click. */
import { format, type SqlLanguage } from "sql-formatter";

export const SQL_DIALECTS: { id: SqlLanguage; label: string }[] = [
  { id: "sql", label: "Standard SQL" },
  { id: "mysql", label: "MySQL" },
  { id: "postgresql", label: "PostgreSQL" },
  { id: "sqlite", label: "SQLite" },
  { id: "transactsql", label: "SQL Server (T-SQL)" },
  { id: "plsql", label: "Oracle PL/SQL" },
  { id: "bigquery", label: "BigQuery" },
  { id: "snowflake", label: "Snowflake" },
  { id: "mariadb", label: "MariaDB" },
  { id: "redshift", label: "Redshift" },
  { id: "spark", label: "Spark SQL" },
  { id: "duckdb", label: "DuckDB" },
];

export function formatSql(text: string, language: SqlLanguage = "sql", keywordCase: "upper" | "lower" | "preserve" = "upper", tabWidth = 2) {
  return format(text, { language, keywordCase, tabWidth });
}
