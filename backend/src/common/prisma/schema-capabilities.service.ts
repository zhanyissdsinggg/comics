import { Injectable } from "@nestjs/common";
import { logger } from "../logger/winston.init";
import { PrismaService } from "./prisma.service";

type SchemaInventory = {
  tables: Set<string>;
  columnsByTable: Map<string, Set<string>>;
};

@Injectable()
export class SchemaCapabilitiesService {
  private inventoryPromise: Promise<SchemaInventory> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async loadInventory(): Promise<SchemaInventory> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<{ table_name: string; column_name: string }>>(
        `
          SELECT table_name, column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name IN ('series', 'creators', 'series_credits', 'follows', 'series_view_stats', 'episodes')
        `,
      );

      const tables = new Set<string>();
      const columnsByTable = new Map<string, Set<string>>();

      rows.forEach((row) => {
        const tableName = String(row?.table_name || "").trim();
        const columnName = String(row?.column_name || "").trim();
        if (!tableName || !columnName) {
          return;
        }

        tables.add(tableName);
        if (!columnsByTable.has(tableName)) {
          columnsByTable.set(tableName, new Set());
        }
        columnsByTable.get(tableName)!.add(columnName);
      });

      return {
        tables,
        columnsByTable,
      };
    } catch (error) {
      logger.warn("[schema] capability inspection failed; falling back to minimal read model", {
        message: error instanceof Error ? error.message : String(error),
      });
      return {
        tables: new Set<string>(),
        columnsByTable: new Map<string, Set<string>>(),
      };
    }
  }

  private async getInventory(): Promise<SchemaInventory> {
    if (!this.inventoryPromise) {
      this.inventoryPromise = this.loadInventory();
    }

    return this.inventoryPromise;
  }

  async hasTable(tableName: string): Promise<boolean> {
    const normalizedTableName = String(tableName || "").trim();
    if (!normalizedTableName) {
      return false;
    }

    const inventory = await this.getInventory();
    return inventory.tables.has(normalizedTableName);
  }

  async hasColumn(tableName: string, columnName: string): Promise<boolean> {
    const normalizedTableName = String(tableName || "").trim();
    const normalizedColumnName = String(columnName || "").trim();
    if (!normalizedTableName || !normalizedColumnName) {
      return false;
    }

    const inventory = await this.getInventory();
    return inventory.columnsByTable.get(normalizedTableName)?.has(normalizedColumnName) ?? false;
  }

  async supportsLegacySeriesAuthor(): Promise<boolean> {
    return this.hasColumn("series", "author");
  }

  async supportsCreatorCredits(): Promise<boolean> {
    const inventory = await this.getInventory();
    return inventory.tables.has("creators") && inventory.tables.has("series_credits");
  }
}
