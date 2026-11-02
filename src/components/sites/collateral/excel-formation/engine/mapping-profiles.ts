/**
 * Versioned, editable mapping profiles: Excel column → semantic field → JSON field → transform.
 * The MAU9 profile below was derived from the real headers and checked against the reference JSON (docs/collateral/02-…); every entry that is
 * not verified carries `json: undefined` and is reported as unmapped rather than guessed.
 */
export type FieldRole = "freeText" | "name" | "code" | "date" | "dateDMY" | "amount" | "list";
export type Transform = "string" | "number" | "sum" | "first" | "list-unique" | "date-yyyymmdd";
export interface ColumnSpec {
  header: string;
  field: string;
  role: FieldRole;
  /** Target path in the contractual JSON, when the mapping is verified. */
  json?: string;
  transform?: Transform;
  required?: boolean;
  /** Cells of this column must not contain Vietnamese diacritics (export policy). */
  noDiacritics?: boolean;
  /** The column is a second source used only for comparison with another column. */
  comparisonOf?: string;
}
export interface MappingProfile {
  id: string;
  version: number;
  title: string;
  /** Columns whose exact values identify one asset: branch + customer + asset. */
  groupBy: { branch: string; customer: string; asset: string };
  /** Fields that must have one value for the whole asset; a difference is reported, not resolved silently. */
  consistentWithinAsset: string[];
  consistentWithinBranch: string[];
  consistentWithinCustomer: string[];
  /** Pair of columns that must hold the same description. */
  descriptionPair?: { primary: string; secondary: string };
  columns: ColumnSpec[];
}

const c = (header: string, field: string, role: FieldRole, extra: Partial<ColumnSpec> = {}): ColumnSpec => ({ header, field, role, ...extra });

export const MAU9_PROFILE: MappingProfile = {
  id: "mau9", version: 1, title: "MAU9 – tài sản bảo đảm",
  groupBy: { branch: "MACNTCTD", customer: "MAKH", asset: "MASOBD" },
  consistentWithinAsset: ["MALOAIBD", "NGBDAU", "NGDINHGIA", "GIATRI", "HOTENCSH", "GIAYTOCNCSH", "MSTCSH", "MOTABDS"],
  consistentWithinBranch: ["TENCNTCTD"],
  consistentWithinCustomer: ["TENKH"],
  descriptionPair: { primary: "MOTABDS", secondary: "MOTABD" },
  columns: [
    c("NGAYDULIEU", "report.date", "dateDMY", { json: "KB001", transform: "date-yyyymmdd" }),
    c("MACHINHANH", "branch.office", "code"),
    c("DINHKY", "report.period", "code"),
    c("MACNTCTD", "branch.code", "code", { json: "CNTCTD[].TTC01", transform: "string", required: true }),
    c("TENCNTCTD", "branch.name", "name", { json: "CNTCTD[].TTC02", transform: "first", noDiacritics: true }),
    c("MAKH", "customer.code", "code", { json: "CNTCTD[].KHACHHANG[].TTC03", transform: "string", required: true }),
    c("TENKH", "customer.name", "name", { json: "CNTCTD[].KHACHHANG[].TTC04", transform: "first", noDiacritics: true }),
    c("MASOBD", "asset.id", "code", { json: "THONGTINBD[].TS001", transform: "string", required: true }),
    c("MALOAIBD", "asset.type", "code", { json: "THONGTINBD[].TS002", transform: "string", required: true }),
    c("NGBDAU", "asset.start", "date", { json: "THONGTINBD[].TS003", transform: "string" }),
    c("NGKT", "asset.end", "date", { json: "THONGTINBD[].TS004", transform: "string" }),
    c("GIATRI", "asset.value", "amount", { json: "THONGTINBD[].TS005", transform: "first", required: true }),
    c("GIATRIBDKV", "asset.valueAllocated", "amount", { json: "THONGTINBD[].TS006", transform: "sum" }),
    c("NGDINHGIA", "asset.valuationDate", "date", { json: "THONGTINBD[].TS007", transform: "string" }),
    c("GTKHAUTRU", "asset.deduction", "amount", { json: "THONGTINBD[].TS008", transform: "first" }),
    c("DSSOHD", "asset.contracts", "list", { json: "THONGTINBD[].TS009[]", transform: "list-unique" }),
    c("TSCHUNGMATCTD", "asset.sharedBranch", "code"),
    c("TSCHUNGMAKH", "asset.sharedCustomer", "code"),
    c("HOTENCSH", "owner.name", "name", { json: "THONGTINBD[].TS012[].TS0121", transform: "first", noDiacritics: true }),
    c("GIAYTOCNCSH", "owner.idDocument", "code", { json: "THONGTINBD[].TS012[].TS0122", transform: "first" }),
    c("MSTCSH", "owner.taxCode", "code", { json: "THONGTINBD[].TS012[].TS0123", transform: "first" }),
    c("MOTABD", "asset.descriptionAlt", "freeText", { noDiacritics: true, comparisonOf: "MOTABDS" }),
    c("CHUDA", "project.owner", "name"),
    c("GIAYTOCHUDA", "project.ownerDocument", "code"),
    c("MSTCHUDA", "project.ownerTax", "code"),
    c("DIACHICHUDA", "project.ownerAddress", "freeText"),
    c("TENDA", "project.name", "freeText"),
    c("VITRIDA", "project.location", "freeText"),
    c("MATINHDTU", "project.province", "code"),
    c("GIAYPHEP", "project.license", "code"),
    c("GIATRIDA", "project.value", "amount"),
    c("THOIHANDA", "project.deadline", "date"),
    c("MOTADA", "project.description", "freeText"),
    c("GIAYCN", "asset.certificate", "code"),
    c("DIACHI", "asset.address", "freeText"),
    c("MATINH", "asset.province", "freeText"),
    c("MOTABDS", "asset.description", "freeText", { json: "THONGTINBD[].TS013", transform: "first", noDiacritics: true }),
    c("LOAIPT", "asset.vehicleType", "code"),
    c("GIAYDK", "asset.registration", "code"),
    c("BIENKS", "asset.plate", "freeText"),
  ],
};
