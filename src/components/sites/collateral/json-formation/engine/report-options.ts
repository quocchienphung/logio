export interface ReportMeta { KB001: string; KB002: string; KB003: string; KB004: string }
export type OwnerPolicy = "distinct" | "first";
/** `code`: branches, customers and assets in ascending code order (what the reference file shows at every level); `source`: as they first appear in the workbook. */
export type OrderPolicy = "code" | "source";
export interface ReportOptions { ownerPolicy: OwnerPolicy; order: OrderPolicy }
export const defaultReportOptions: ReportOptions = { ownerPolicy: "distinct", order: "code" };
